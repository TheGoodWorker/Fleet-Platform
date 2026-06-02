import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsNumber, IsInt, IsUUID, Min, IsBoolean,
} from 'class-validator';
import { ContractType, MgmtFeeType, MgmtFeeBase, OwnerPaymentFrequency } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateContractDto {
  @ApiProperty({ enum: ContractType }) @IsEnum(ContractType) type: ContractType;

  @ApiProperty({ description: 'ID du véhicule' }) @IsUUID() vehicleId: string;
  @ApiProperty({ description: 'ID du manager responsable' }) @IsUUID() managerId: string;

  @ApiPropertyOptional({ description: 'ID du chauffeur (null si PARTNER_FLEET multi-chauffeurs)' })
  @IsOptional() @IsUUID() driverId?: string;

  @ApiPropertyOptional({ description: 'ID du propriétaire (requis pour PARTNER_FLEET)' })
  @IsOptional() @IsUUID() ownerId?: string;

  @ApiProperty({ example: 25000, description: 'Montant journalier en FCFA' })
  @IsNumber() @Min(0) dailyAmount: number;

  @ApiPropertyOptional({ example: 365, description: 'Nombre de jours cibles (OWNERSHIP_PROGRAM)' })
  @IsOptional() @IsInt() @Min(1) targetDays?: number;

  @ApiPropertyOptional({ example: 0, description: 'Jour de repos: 0=Dim, 1=Lun ... 6=Sam' })
  @IsOptional() @IsInt() @Min(0) restDay?: number;

  // Frais gestion PARTNER_FLEET
  @ApiPropertyOptional({ enum: MgmtFeeType }) @IsOptional() @IsEnum(MgmtFeeType) mgmtFeeType?: MgmtFeeType;
  @ApiPropertyOptional({ enum: MgmtFeeBase }) @IsOptional() @IsEnum(MgmtFeeBase) mgmtFeeBase?: MgmtFeeBase;
  @ApiPropertyOptional({ example: 10 }) @IsOptional() @IsNumber() @Min(0) mgmtFeePercentage?: number;
  @ApiPropertyOptional({ example: 15000 }) @IsOptional() @IsNumber() @Min(0) mgmtFeeFixed?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  // ── Champs SIMPLE_RENTAL (D-17) ─────────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'Coût d\'investissement véhicule en FCFA (SIMPLE_RENTAL) — pour calcul ROI Arbitrage I',
    example: 5000000,
  })
  @IsOptional() @IsNumber() @Min(0) vehicleInvestmentCost?: number;

  @ApiPropertyOptional({
    description: 'Loyer mensuel fixe propriétaire en FCFA (SIMPLE_RENTAL)',
    example: 250000,
  })
  @IsOptional() @IsNumber() @Min(0) simpleRentalMonthlyAmount?: number;

  @ApiPropertyOptional({
    enum: OwnerPaymentFrequency,
    description: 'Fréquence de versement au propriétaire (SIMPLE_RENTAL)',
  })
  @IsOptional() @IsEnum(OwnerPaymentFrequency) ownerPaymentFrequency?: OwnerPaymentFrequency;
}

export class UpdateContractDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) dailyAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() targetDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() restDay?: number;
  @ApiPropertyOptional() @IsOptional() @IsEnum(MgmtFeeType) mgmtFeeType?: MgmtFeeType;
  @ApiPropertyOptional() @IsOptional() @IsEnum(MgmtFeeBase) mgmtFeeBase?: MgmtFeeBase;
  @ApiPropertyOptional() @IsOptional() @IsNumber() mgmtFeePercentage?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() mgmtFeeFixed?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ContractFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(ContractType) type?: ContractType;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerId?: string;
}
