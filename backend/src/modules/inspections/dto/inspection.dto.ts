import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FuelLevel, InspectionItemStatus, InspectionStatus, InspectionType } from '@prisma/client';

// ─── Checklist item ────────────────────────────────────────────────────────

export class CreateInspectionItemDto {
  @ApiProperty({ description: 'Clé normalisée (exterior, fuel, odometer…)' })
  @IsString() itemKey: string;

  @ApiProperty({ description: 'Label affiché dans l\'UI' })
  @IsString() label: string;

  @ApiPropertyOptional({ enum: InspectionItemStatus })
  @IsOptional() @IsEnum(InspectionItemStatus) status?: InspectionItemStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
}

// ─── Création inspection ───────────────────────────────────────────────────

export class CreateInspectionDto {
  @ApiProperty({ enum: InspectionType })
  @IsEnum(InspectionType) type: InspectionType;

  @ApiProperty({ description: 'ID du véhicule' })
  @IsUUID() vehicleId: string;

  @ApiPropertyOptional({ description: 'ID du contrat' })
  @IsOptional() @IsUUID() contractId?: string;

  @ApiPropertyOptional({ description: 'ID du chauffeur' })
  @IsOptional() @IsUUID() driverId?: string;

  @ApiPropertyOptional({ description: 'ID du manager' })
  @IsOptional() @IsUUID() managerId?: string;

  @ApiPropertyOptional({ description: 'ID de l\'incident déclencheur' })
  @IsOptional() @IsUUID() incidentId?: string;

  @ApiPropertyOptional({ enum: FuelLevel, description: 'Niveau carburant à l\'entrée' })
  @IsOptional() @IsEnum(FuelLevel) fuelLevelIn?: FuelLevel;

  @ApiPropertyOptional({ description: 'Kilométrage à l\'entrée' })
  @IsOptional() @IsInt() mileageIn?: number;

  @ApiPropertyOptional({ description: 'Latitude GPS de l\'inspection' })
  @IsOptional() @IsNumber() gpsLat?: number;

  @ApiPropertyOptional({ description: 'Longitude GPS de l\'inspection' })
  @IsOptional() @IsNumber() gpsLng?: number;

  @ApiPropertyOptional({ description: 'Items de checklist à créer en même temps', type: [CreateInspectionItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateInspectionItemDto)
  items?: CreateInspectionItemDto[];
}

// ─── Signature ─────────────────────────────────────────────────────────────

export class SignInspectionDto {
  @ApiPropertyOptional({ description: 'Notes de la partie signataire' })
  @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ enum: FuelLevel, description: 'Niveau carburant à la sortie (retour uniquement)' })
  @IsOptional() @IsEnum(FuelLevel) fuelLevelOut?: FuelLevel;

  @ApiPropertyOptional({ description: 'Kilométrage à la sortie (retour uniquement)' })
  @IsOptional() @IsInt() mileageOut?: number;
}

// ─── Lien retour → remise ──────────────────────────────────────────────────

export class LinkReturnInspectionDto {
  @ApiProperty({ description: 'ID de l\'inspection de remise (VEHICLE_DELIVERY) à comparer' })
  @IsUUID() handoverInspectionId: string;

  @ApiPropertyOptional({ description: 'Notes de comparaison manuelle' })
  @IsOptional() @IsString() returnComparisonNotes?: string;
}

// ─── Ajout d'un item ───────────────────────────────────────────────────────

export class AddInspectionItemDto extends CreateInspectionItemDto {}

// ─── Filtres ───────────────────────────────────────────────────────────────

export class InspectionFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(InspectionType) type?: InspectionType;
  @ApiPropertyOptional() @IsOptional() @IsEnum(InspectionStatus) status?: InspectionStatus;
}
