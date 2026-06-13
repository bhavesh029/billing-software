import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../crypto/encryption.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

export type OrganizationResponse = {
  id: string;
  legalName: string;
  tradeName: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  bankName: string | null;
  accountHolderName: string | null;
  termsTemplate: string | null;
  signatureLabel: string | null;
  invoicePrefix: string;
  gstin: string | null;
  bankAccountNumber: string | null;
  ifsc: string | null;
};

@Injectable()
export class OrganizationsService {
  private admin: SupabaseClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
  ) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.admin = createClient(url, key, { auth: { persistSession: false } });
    }
  }

  private toResponse(row: {
    id: string;
    legalName: string;
    tradeName: string | null;
    address: string;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    bankName: string | null;
    accountHolderName: string | null;
    termsTemplate: string | null;
    signatureLabel: string | null;
    invoicePrefix: string;
    gstinEncrypted: string | null;
    bankAccountEncrypted: string | null;
    ifscEncrypted: string | null;
  }): OrganizationResponse {
    return {
      id: row.id,
      legalName: row.legalName,
      tradeName: row.tradeName,
      address: row.address,
      phone: row.phone,
      email: row.email,
      logoUrl: row.logoUrl,
      bankName: row.bankName,
      accountHolderName: row.accountHolderName,
      termsTemplate: row.termsTemplate,
      signatureLabel: row.signatureLabel,
      invoicePrefix: row.invoicePrefix,
      gstin: row.gstinEncrypted ? this.crypto.decrypt(row.gstinEncrypted) : null,
      bankAccountNumber: row.bankAccountEncrypted
        ? this.crypto.decrypt(row.bankAccountEncrypted)
        : null,
      ifsc: row.ifscEncrypted ? this.crypto.decrypt(row.ifscEncrypted) : null,
    };
  }

  async listForUser(userId: string): Promise<OrganizationResponse[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
    });
    return members.map((m) => this.toResponse(m.organization));
  }

  async create(userId: string, dto: CreateOrganizationDto): Promise<OrganizationResponse> {
    const org = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.organization.create({
        data: {
          legalName: dto.legalName,
          tradeName: dto.tradeName ?? null,
          address: dto.address,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          logoUrl: dto.logoUrl ?? null,
          bankName: dto.bankName ?? null,
          accountHolderName: dto.accountHolderName ?? null,
          termsTemplate: dto.termsTemplate ?? null,
          signatureLabel: dto.signatureLabel ?? null,
          invoicePrefix: dto.invoicePrefix ?? '',
          gstinEncrypted: dto.gstin ? this.crypto.encrypt(dto.gstin) : null,
          bankAccountEncrypted: dto.bankAccountNumber
            ? this.crypto.encrypt(dto.bankAccountNumber)
            : null,
          ifscEncrypted: dto.ifsc ? this.crypto.encrypt(dto.ifsc) : null,
        },
      });
      await tx.organizationMember.create({
        data: {
          organizationId: created.id,
          userId,
          role: 'OWNER',
        },
      });
      await tx.invoiceSequence.create({
        data: { organizationId: created.id, lastNumber: 0 },
      });
      return created;
    });
    return this.toResponse(org);
  }

  async getForMember(orgId: string): Promise<OrganizationResponse> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    return this.toResponse(org);
  }

  async update(orgId: string, dto: UpdateOrganizationDto): Promise<OrganizationResponse> {
    const existing = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!existing) throw new NotFoundException('Organization not found');

    const data: Record<string, unknown> = {};
    if (dto.legalName !== undefined) data['legalName'] = dto.legalName;
    if (dto.tradeName !== undefined) data['tradeName'] = dto.tradeName;
    if (dto.address !== undefined) data['address'] = dto.address;
    if (dto.phone !== undefined) data['phone'] = dto.phone;
    if (dto.email !== undefined) data['email'] = dto.email;
    if (dto.logoUrl !== undefined) data['logoUrl'] = dto.logoUrl;
    if (dto.bankName !== undefined) data['bankName'] = dto.bankName;
    if (dto.accountHolderName !== undefined) data['accountHolderName'] = dto.accountHolderName;
    if (dto.termsTemplate !== undefined) data['termsTemplate'] = dto.termsTemplate;
    if (dto.signatureLabel !== undefined) data['signatureLabel'] = dto.signatureLabel;
    if (dto.invoicePrefix !== undefined) data['invoicePrefix'] = dto.invoicePrefix;
    if (dto.gstin !== undefined)
      data['gstinEncrypted'] = dto.gstin ? this.crypto.encrypt(dto.gstin) : null;
    if (dto.bankAccountNumber !== undefined)
      data['bankAccountEncrypted'] = dto.bankAccountNumber
        ? this.crypto.encrypt(dto.bankAccountNumber)
        : null;
    if (dto.ifsc !== undefined)
      data['ifscEncrypted'] = dto.ifsc ? this.crypto.encrypt(dto.ifsc) : null;

    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data,
    });
    return this.toResponse(org);
  }

  async createSignedLogoUpload(orgId: string, fileName: string) {
    if (!this.admin) {
      throw new BadRequestException(
        'Supabase storage is not configured on the server (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
      );
    }
    const bucket = process.env.SUPABASE_LOGO_BUCKET ?? 'org-logos';
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${orgId}/${Date.now()}-${safe}`;
    const { data, error } = await this.admin.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Could not create upload URL');
    }
    return {
      bucket,
      path,
      signedUrl: data.signedUrl,
      token: data.token,
    };
  }

  /** Raw org row for building invoice seller snapshot (decrypts sensitive fields). */
  async getDecryptedOrg(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    return this.toResponse(org);
  }
}
