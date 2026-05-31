import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min,
} from 'class-validator';
import { ChargeType, ChargeResponsible } from '@prisma/client';

export class CreateChargeDto {
  @ApiProperty({ enum: ChargeType }) @IsEnum(ChargeType) type: ChargeType;

  @ApiProperty({ example: 75000 }) @IsNumber() @Min(1) amount: number;

  @ApiProperty({ description: 'ID du véhicule concerné' }) @IsUUID() vehicleId: string;

  @ApiPropertyOptional({ description: 'ID du contrat (si applicable)' })
  @IsOptional() @IsUUID() contractId?: string;

  @ApiPropertyOptional({ description: 'ID du chauffeur responsable' })
  @IsOptional() @IsUUID() driverId?: string;

  @ApiPropertyOptional({ enum: ChargeResponsible })
  @IsOptional() @IsEnum(ChargeResponsible) proposedResponsible?: ChargeResponsible;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ description: 'ID d\'un incident lié' })
  @IsOptional() @IsUUID() incidentId?: string;
}

export class ValidateChargeDto {
  @ApiProperty({ enum: ChargeResponsible, description: 'Responsable validé par le Super Manager' })
  @IsEnum(ChargeResponsible) validatedResponsible: ChargeResponsible;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RejectChargeDto {
  @ApiProperty() @IsString() reason: string;
}

export class AddToContractDto {
  @ApiProperty({ description: 'ID du contrat cible' }) @IsUUID() contractId: string;

  @ApiPropertyOptional({ description: 'Paiement immédiat éventuel (0 = aucun)' })
  @IsOptional() @IsNumber() @Min(0) immediatePayment?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ChargeFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() driverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ChargeType) type?: ChargeType;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
