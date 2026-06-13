import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';

@Injectable()
export class PartiesService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.party.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
    });
  }

  async get(orgId: string, partyId: string) {
    const p = await this.prisma.party.findFirst({
      where: { id: partyId, organizationId: orgId },
    });
    if (!p) throw new NotFoundException('Client not found');
    return p;
  }

  create(orgId: string, dto: CreatePartyDto) {
    return this.prisma.party.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        address: dto.address,
        stateCode: dto.stateCode,
        stateName: dto.stateName,
        gstin: dto.gstin ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async update(orgId: string, partyId: string, dto: UpdatePartyDto) {
    await this.get(orgId, partyId);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.address !== undefined) data['address'] = dto.address;
    if (dto.stateCode !== undefined) data['stateCode'] = dto.stateCode;
    if (dto.stateName !== undefined) data['stateName'] = dto.stateName;
    if (dto.gstin !== undefined) data['gstin'] = dto.gstin;
    if (dto.phone !== undefined) data['phone'] = dto.phone;
    if (dto.email !== undefined) data['email'] = dto.email;
    if (dto.notes !== undefined) data['notes'] = dto.notes;
    return this.prisma.party.update({
      where: { id: partyId },
      data,
    });
  }

  async remove(orgId: string, partyId: string) {
    await this.get(orgId, partyId);
    await this.prisma.party.delete({ where: { id: partyId } });
    return { ok: true };
  }
}
