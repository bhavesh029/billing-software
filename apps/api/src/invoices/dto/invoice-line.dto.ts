import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class InvoiceLineDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  hsnSac?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  quantity!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unit!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  unitPrice!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  gstRatePercent!: string;
}
