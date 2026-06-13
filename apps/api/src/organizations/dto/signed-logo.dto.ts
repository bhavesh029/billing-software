import { IsString, MaxLength, MinLength } from 'class-validator';

export class SignedLogoUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fileName!: string;
}
