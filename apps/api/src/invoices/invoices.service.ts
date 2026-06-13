import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentType, InvoiceStatus, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { amountInWordsInr } from '../common/amount-in-words';
import { computeLineTax, isIntraState } from '../common/gst-calc';

function stateFromGstin(gstin: string | null): string | null {
  if (!gstin || gstin.length < 2) return null;
  return gstin.slice(0, 2);
}

function sellerSnapshotFromOrg(org: Awaited<
  ReturnType<OrganizationsService['getDecryptedOrg']>
>) {
  return {
    legalName: org.legalName,
    tradeName: org.tradeName,
    address: org.address,
    phone: org.phone,
    email: org.email,
    logoUrl: org.logoUrl,
    bankName: org.bankName,
    accountHolderName: org.accountHolderName,
    gstin: org.gstin,
    bankAccountNumber: org.bankAccountNumber,
    ifsc: org.ifsc,
    termsTemplate: org.termsTemplate,
    signatureLabel: org.signatureLabel,
    invoicePrefix: org.invoicePrefix,
  };
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgs: OrganizationsService,
  ) {}

  private async resolveBuyer(
    orgId: string,
    dto: Pick<
      CreateInvoiceDto,
      'partyId' | 'buyerName' | 'buyerAddress' | 'buyerStateCode' | 'buyerStateName'
    >,
  ): Promise<{
    partyId: string | null;
    buyerName: string;
    buyerAddress: string;
    buyerStateCode: string;
    buyerStateName: string;
  }> {
    const pid = dto.partyId?.trim();
    if (pid) {
      const party = await this.prisma.party.findFirst({
        where: { id: pid, organizationId: orgId },
      });
      if (!party) throw new BadRequestException('Client not found');
      return {
        partyId: party.id,
        buyerName: party.name,
        buyerAddress: party.address,
        buyerStateCode: party.stateCode,
        buyerStateName: party.stateName,
      };
    }
    return {
      partyId: null,
      buyerName: dto.buyerName,
      buyerAddress: dto.buyerAddress,
      buyerStateCode: dto.buyerStateCode,
      buyerStateName: dto.buyerStateName,
    };
  }

  private buildLines(
    dto: CreateInvoiceDto,
    orgGstin: string | null,
  ) {
    if (!dto.lines?.length) {
      throw new BadRequestException('At least one line item is required');
    }
    const intra = isIntraState(stateFromGstin(orgGstin), dto.buyerStateCode!);
    let order = 0;
    const lineCreates: Prisma.InvoiceLineItemCreateWithoutInvoiceInput[] = [];
    let subtotal = new Decimal(0);
    let totalTax = new Decimal(0);

    for (const line of dto.lines) {
      const qty = new Decimal(line.quantity);
      const unitPrice = new Decimal(line.unitPrice);
      const gstRate = new Decimal(line.gstRatePercent);
      const { cgst, sgst, igst, lineTotal } = computeLineTax(
        qty,
        unitPrice,
        gstRate,
        intra,
      );
      const taxable = qty.mul(unitPrice);
      subtotal = subtotal.add(taxable);
      totalTax = totalTax.add(cgst).add(sgst).add(igst);
      lineCreates.push({
        lineOrder: order++,
        description: line.description,
        hsnSac: line.hsnSac ?? null,
        quantity: qty.toFixed(4),
        unit: line.unit,
        unitPrice: unitPrice.toFixed(2),
        gstRatePercent: gstRate.toFixed(2),
        cgstAmount: cgst.toFixed(2),
        sgstAmount: sgst.toFixed(2),
        igstAmount: igst.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
      });
    }
    const grandTotal = subtotal.add(totalTax);
    return { lineCreates, subtotal, totalTax, grandTotal, intra };
  }

  private optionalDecimal(s?: string) {
    if (s === undefined || s === null || s === '') return null;
    return new Decimal(s).toFixed(2);
  }

  async create(orgId: string, userId: string, dto: CreateInvoiceDto) {
    const org = await this.orgs.getDecryptedOrg(orgId);
    const buyer = await this.resolveBuyer(orgId, dto);
    const fullDto: CreateInvoiceDto = {
      ...dto,
      partyId: buyer.partyId ?? undefined,
      buyerName: buyer.buyerName,
      buyerAddress: buyer.buyerAddress,
      buyerStateCode: buyer.buyerStateCode,
      buyerStateName: buyer.buyerStateName,
    };
    const { lineCreates, subtotal, totalTax, grandTotal } = this.buildLines(fullDto, org.gstin);
    const seller = sellerSnapshotFromOrg(org);

    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId: orgId,
        partyId: buyer.partyId,
        issueDate: new Date(dto.issueDate),
        placeOfSupplyStateCode: dto.placeOfSupplyStateCode,
        placeOfSupplyStateName: dto.placeOfSupplyStateName,
        documentType: dto.documentType ?? DocumentType.BILL_OF_SUPPLY,
        buyerName: buyer.buyerName,
        buyerAddress: buyer.buyerAddress,
        buyerStateCode: buyer.buyerStateCode,
        buyerStateName: buyer.buyerStateName,
        sellerSnapshot: seller as object,
        status: InvoiceStatus.DRAFT,
        subtotal: subtotal.toFixed(2),
        totalTax: totalTax.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        amountInWords: amountInWordsInr(grandTotal),
        receivedAmount: this.optionalDecimal(dto.receivedAmount),
        balance: this.optionalDecimal(dto.balance),
        previousBalance: this.optionalDecimal(dto.previousBalance),
        currentBalance: this.optionalDecimal(dto.currentBalance),
        createdByUserId: userId,
        lineItems: { create: lineCreates },
      },
      include: { lineItems: { orderBy: { lineOrder: 'asc' } } },
    });
    return invoice;
  }

  async list(orgId: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: { lineItems: { orderBy: { lineOrder: 'asc' } } },
    });
  }

  async get(orgId: string, invoiceId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: { lineItems: { orderBy: { lineOrder: 'asc' } } },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async update(orgId: string, invoiceId: string, userId: string, dto: UpdateInvoiceDto) {
    const existing = await this.get(orgId, invoiceId);
    if (existing.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be updated');
    }
    const existingPartyId = existing.partyId ?? null;
    const nextPartyId =
      dto.partyId !== undefined
        ? dto.partyId == null || dto.partyId === ''
          ? null
          : String(dto.partyId).trim()
        : existingPartyId;

    const buyer = await this.resolveBuyer(orgId, {
      partyId: nextPartyId ?? undefined,
      buyerName: dto.buyerName ?? existing.buyerName,
      buyerAddress: dto.buyerAddress ?? existing.buyerAddress,
      buyerStateCode: dto.buyerStateCode ?? existing.buyerStateCode,
      buyerStateName: dto.buyerStateName ?? existing.buyerStateName,
    });

    const merged: CreateInvoiceDto = {
      issueDate: dto.issueDate ?? existing.issueDate.toISOString(),
      documentType: dto.documentType ?? existing.documentType,
      partyId: buyer.partyId ?? undefined,
      buyerName: buyer.buyerName,
      buyerAddress: buyer.buyerAddress,
      buyerStateCode: buyer.buyerStateCode,
      buyerStateName: buyer.buyerStateName,
      placeOfSupplyStateCode: dto.placeOfSupplyStateCode ?? existing.placeOfSupplyStateCode,
      placeOfSupplyStateName: dto.placeOfSupplyStateName ?? existing.placeOfSupplyStateName,
      lines:
        dto.lines ??
        existing.lineItems.map((l: (typeof existing.lineItems)[number]) => ({
          description: l.description,
          hsnSac: l.hsnSac ?? undefined,
          quantity: l.quantity.toString(),
          unit: l.unit,
          unitPrice: l.unitPrice.toString(),
          gstRatePercent: l.gstRatePercent.toString(),
        })),
      receivedAmount: dto.receivedAmount ?? existing.receivedAmount?.toString(),
      balance: dto.balance ?? existing.balance?.toString(),
      previousBalance: dto.previousBalance ?? existing.previousBalance?.toString(),
      currentBalance: dto.currentBalance ?? existing.currentBalance?.toString(),
    };

    const org = await this.orgs.getDecryptedOrg(orgId);
    const { lineCreates, subtotal, totalTax, grandTotal } = this.buildLines(merged, org.gstin);
    const seller = sellerSnapshotFromOrg(org);

    await this.prisma.invoiceLineItem.deleteMany({ where: { invoiceId } });

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        partyId: buyer.partyId,
        issueDate: new Date(merged.issueDate),
        documentType: merged.documentType,
        buyerName: merged.buyerName,
        buyerAddress: merged.buyerAddress,
        buyerStateCode: merged.buyerStateCode,
        buyerStateName: merged.buyerStateName,
        placeOfSupplyStateCode: merged.placeOfSupplyStateCode,
        placeOfSupplyStateName: merged.placeOfSupplyStateName,
        sellerSnapshot: seller as object,
        subtotal: subtotal.toFixed(2),
        totalTax: totalTax.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        amountInWords: amountInWordsInr(grandTotal),
        receivedAmount: this.optionalDecimal(merged.receivedAmount) ?? null,
        balance: this.optionalDecimal(merged.balance) ?? null,
        previousBalance: this.optionalDecimal(merged.previousBalance) ?? null,
        currentBalance: this.optionalDecimal(merged.currentBalance) ?? null,
        createdByUserId: userId,
        lineItems: { create: lineCreates },
      },
      include: { lineItems: { orderBy: { lineOrder: 'asc' } } },
    });
  }

  async issue(orgId: string, invoiceId: string, userId: string) {
    const existing = await this.get(orgId, invoiceId);
    if (existing.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Invoice already issued');
    }
    if (existing.createdByUserId !== userId) {
      /* allow any org member to issue? Plan says user - allow members */
    }

    const org = await this.orgs.getDecryptedOrg(orgId);
    const seller = sellerSnapshotFromOrg(org);

    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const seq = await tx.invoiceSequence.update({
          where: { organizationId: orgId },
          data: { lastNumber: { increment: 1 } },
        });
        return tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: InvoiceStatus.ISSUED,
            invoiceNumber: seq.lastNumber,
            sellerSnapshot: seller as object,
          },
          include: { lineItems: { orderBy: { lineOrder: 'asc' } } },
        });
      });
    } catch (e) {
      throw new BadRequestException('Could not assign invoice number');
    }
  }
}
