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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@ApiTags('Invoices')
@ApiBearerAuth('JWT-auth')
@Controller('organizations/:orgId/invoices')
@UseGuards(JwtAuthGuard, OrgMemberGuard)
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoices.create(orgId, user.sub, dto);
  }

  @Get()
  list(@Param('orgId') orgId: string) {
    return this.invoices.list(orgId);
  }

  @Get(':invoiceId')
  get(@Param('orgId') orgId: string, @Param('invoiceId') invoiceId: string) {
    return this.invoices.get(orgId, invoiceId);
  }

  @Patch(':invoiceId')
  update(
    @Param('orgId') orgId: string,
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoices.update(orgId, invoiceId, user.sub, dto);
  }

  @Post(':invoiceId/issue')
  issue(
    @Param('orgId') orgId: string,
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.invoices.issue(orgId, invoiceId, user.sub);
  }
}
