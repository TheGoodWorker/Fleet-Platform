import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNumber, IsOptional, IsEnum, IsUUID,
  IsDateString, Min, IsBoolean,
} from 'class-validator';
import { PaymentSource } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreatePaymentDto {
  @ApiProperty({ description: 'ID du contrat' }) @IsUUID() contractId: string;
  @ApiProperty({ description: 'ID du véhicule' }) @IsUUID() vehicleId: string;
  @ApiProperty({ description: 'ID du chauffeur' }) @IsUUID() driverId: string;

  @ApiProperty({ example: 45000, description: 'Montant payé en FCFA' })
  @IsNumber() @Min(1) amount: number;

  @ApiProperty({ enum: PaymentSource, default: PaymentSource.MANUAL })
  @IsEnum(PaymentSource) source: PaymentSource;

  @ApiProperty({ description: 'Date du paiement (ISO 8601)' })
  @IsDateString() paidAt: string;

  @ApiPropertyOptional({ description: 'Référence du paiement (n° reçu, ref Wave, etc.)' })
  @IsOptional() @IsString() reference?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RejectPaymentDto {
  @ApiProperty({ description: 'Motif du rejet' }) @IsString() reason: string;
}

export class PaymentFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() driverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}
