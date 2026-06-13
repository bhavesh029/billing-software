import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgMemberGuard } from '../auth/org-member.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtUser } from '../auth/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { SignedLogoUploadDto } from './dto/signed-logo.dto';

@ApiTags('Organizations')
@ApiBearerAuth('JWT-auth')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.orgs.listForUser(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateOrganizationDto) {
    return this.orgs.create(user.sub, dto);
  }

  @Get(':orgId')
  @UseGuards(OrgMemberGuard)
  get(@Param('orgId') _orgId: string) {
    return this.orgs.getForMember(_orgId);
  }

  @Patch(':orgId')
  @UseGuards(OrgMemberGuard)
  update(@Param('orgId') orgId: string, @Body() dto: UpdateOrganizationDto) {
    return this.orgs.update(orgId, dto);
  }

  @Post(':orgId/logo/signed-upload')
  @UseGuards(OrgMemberGuard)
  signedLogo(@Param('orgId') orgId: string, @Body() body: SignedLogoUploadDto) {
    return this.orgs.createSignedLogoUpload(orgId, body.fileName);
  }
}
