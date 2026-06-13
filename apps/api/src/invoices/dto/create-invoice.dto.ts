import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DocumentType } from '@prisma/client';
import { InvoiceLineDto } from './invoice-line.dto';

export class CreateInvoiceDto {
  @IsDateString()
  issueDate!: string;

  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  partyId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  buyerName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  buyerAddress!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5)
  buyerStateCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  buyerStateName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5)
  placeOfSupplyStateCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  placeOfSupplyStateName!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines!: InvoiceLineDto[];

  @IsOptional()
  @IsString()
  receivedAmount?: string;

  @IsOptional()
  @IsString()
  balance?: string;

  @IsOptional()
  @IsString()
  previousBalance?: string;

  @IsOptional()
  @IsString()
  currentBalance?: string;
}
