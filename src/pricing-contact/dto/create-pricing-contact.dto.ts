import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePricingContactDto {
  @IsIn(['standard', 'enterprise'])
  planType: 'standard' | 'enterprise';

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;
}
