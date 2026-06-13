import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgMemberGuard } from '../auth/org-member.guard';
import { PartiesService } from './parties.service';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';

@ApiTags('Clients/Parties')
@ApiBearerAuth('JWT-auth')
@Controller('organizations/:orgId/parties')
@UseGuards(JwtAuthGuard, OrgMemberGuard)
export class PartiesController {
  constructor(private readonly parties: PartiesService) {}

  @Get()
  list(@Param('orgId') orgId: string) {
    return this.parties.list(orgId);
  }

  @Post()
  create(@Param('orgId') orgId: string, @Body() dto: CreatePartyDto) {
    return this.parties.create(orgId, dto);
  }

  @Get(':partyId')
  get(@Param('orgId') orgId: string, @Param('partyId') partyId: string) {
    return this.parties.get(orgId, partyId);
  }

  @Patch(':partyId')
  update(
    @Param('orgId') orgId: string,
    @Param('partyId') partyId: string,
    @Body() dto: UpdatePartyDto,
  ) {
    return this.parties.update(orgId, partyId, dto);
  }

  @Delete(':partyId')
  remove(@Param('orgId') orgId: string, @Param('partyId') partyId: string) {
    return this.parties.remove(orgId, partyId);
  }
}
