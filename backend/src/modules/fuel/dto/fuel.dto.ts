import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsDateString,
} from 'class-validator';
import { FuelLevel, FuelTransactionType, ChargeResponsible } from '@prisma/client';

// ─── Enregistrement transaction carburant ─────────────────────────────────

export class CreateFuelTransactionDto {
  @ApiProperty({ description: 'ID du véhicule' })
  @IsUUID() vehicleId: string;

  @ApiPropertyOptional({ description: 'ID du contrat associé' })
  @IsOptional() @IsUUID() contractId?: string;

  @ApiPropertyOptional({ description: 'ID du chauffeur' })
  @IsOptional() @IsUUID() driverId?: string;

  @ApiPropertyOptional({ description: 'ID de l\'inspection associée (remise/reprise)' })
  @IsOptional() @IsUUID() inspectionId?: string;

  @ApiProperty({ enum: FuelTransactionType })
  @IsEnum(FuelTransactionType) type: FuelTransactionType;

  @ApiProperty({ enum: FuelLevel, description: 'Niveau constaté' })
  @IsEnum(FuelLevel) fuelLevel: FuelLevel;

  @ApiPropertyOptional({ description: 'Coût de l\'opération (MAD)' })
  @IsOptional() @IsNumber() amount?: number;

  @ApiPropertyOptional({ description: 'Volume en litres' })
  @IsOptional() @IsNumber() liters?: number;

  @ApiPropertyOptional({ description: 'URL photo jauge / tableau de bord' })
  @IsOptional() @IsString() photoUrl?: string;

  @ApiPropertyOptional({ enum: ChargeResponsible, description: 'Responsable du coût si différence' })
  @IsOptional() @IsEnum(ChargeResponsible) responsible?: ChargeResponsible;

  @ApiProperty({ description: 'Date et heure du relevé (ISO 8601)' })
  @IsDateString() recordedAt: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() notes?: string;

  /**
   * Si true et fuelLevel < FULL (RETURN_CHECK uniquement) → créer une charge automatique R-09.
   * Par défaut false — le manager décide explicitement de créer la charge.
   */
  @ApiPropertyOptional({
    description: 'Créer automatiquement une charge R-09 si fuelLevel < FULL (RETURN_CHECK)',
  })
  @IsOptional() @IsBoolean() autoCreateDiscrepancyCharge?: boolean;
}

// ─── Validation d'un niveau carburant déclaré ──────────────────────────────

export class ValidateFuelTransactionDto {
  @ApiPropertyOptional({ description: 'Notes de validation' })
  @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({
    description: 'Niveau carburant corrigé si différent du déclaré',
    enum: FuelLevel,
  })
  @IsOptional() @IsEnum(FuelLevel) correctedFuelLevel?: FuelLevel;
}

// ─── Filtres ───────────────────────────────────────────────────────────────

export class FuelFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() driverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(FuelTransactionType) type?: FuelTransactionType;
  @ApiPropertyOptional({ description: 'true = uniquement les transactions non validées' })
  @IsOptional() @IsString() unvalidatedOnly?: string;
}
