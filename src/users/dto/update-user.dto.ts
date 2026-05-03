import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WageCurrency } from '../../common/enums/wage-currency.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(8)
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(24)
  dailyWorkingHours?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monthlyWage?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEnum(WageCurrency)
  wageCurrency?: WageCurrency | null;
}
