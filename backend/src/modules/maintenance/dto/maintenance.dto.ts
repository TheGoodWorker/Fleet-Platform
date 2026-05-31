import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID,
} from 'class-validator';
import { MaintenanceType, MaintenanceStatus, MileageSource } from '@prisma/client';

// ─── Création maintenance ──────────────────────────────────────────────────

export class CreateMaintenanceDto {
  @ApiProperty({ enum: MaintenanceType })
  @IsEnum(MaintenanceType) type: MaintenanceType;

  @ApiProperty({ description: 'ID du véhicule' })
  @IsUUID() vehicleId: string;

  @ApiPropertyOptional({ description: 'Kilométrage au moment de la maintenance' })
  @IsOptional() @IsInt() mileageAtService?: number;

  @ApiPropertyOptional({ description: 'Date planifiée (ISO 8601)' })
  @IsOptional() @IsDateString() scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Nom du garage' })
  @IsOptional() @IsString() garage?: string;

  @ApiPropertyOptional({ description: 'Coût estimé (MAD)' })
  @IsOptional() @IsNumber() cost?: number;

  @ApiPropertyOptional({ description: 'Description de l\'intervention' })
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ description: 'Notes internes' })
  @IsOptional() @IsString() notes?: string;
}

// ─── Mise à jour maintenance ───────────────────────────────────────────────

export class UpdateMaintenanceDto {
  @ApiPropertyOptional({ enum: MaintenanceStatus })
  @IsOptional() @IsEnum(MaintenanceStatus) status?: MaintenanceStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() mileageAtService?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString() scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() garage?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() cost?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() notes?: string;
}

// ─── Complétion maintenance ────────────────────────────────────────────────

export class CompleteMaintenanceDto {
  @ApiPropertyOptional({ description: 'Kilométrage au moment de la complétion' })
  @IsOptional() @IsInt() mileageAtService?: number;

  @ApiPropertyOptional({ description: 'Coût réel (MAD)' })
  @IsOptional() @IsNumber() cost?: number;

  @ApiPropertyOptional({ description: 'Nom du garage ayant réalisé l\'intervention' })
  @IsOptional() @IsString() garage?: string;

  @ApiPropertyOptional({ description: 'Notes de fin d\'intervention' })
  @IsOptional() @IsString() notes?: string;
}

// ─── Relevé kilométrique ───────────────────────────────────────────────────

export class CreateMileageRecordDto {
  @ApiProperty({ description: 'ID du véhicule' })
  @IsUUID() vehicleId: string;

  @ApiPropertyOptional({ description: 'ID du chauffeur (si saisie par chauffeur)' })
  @IsOptional() @IsUUID() driverId?: string;

  @ApiProperty({ description: 'Kilométrage relevé' })
  @IsInt() mileage: number;

  @ApiPropertyOptional({ description: 'URL de la photo du tableau de bord' })
  @IsOptional() @IsString() photoUrl?: string;

  @ApiPropertyOptional({ description: 'Latitude GPS' })
  @IsOptional() @IsNumber() gpsLat?: number;

  @ApiPropertyOptional({ description: 'Longitude GPS' })
  @IsOptional() @IsNumber() gpsLng?: number;

  @ApiProperty({ description: 'Date et heure du relevé (ISO 8601)' })
  @IsDateString() recordedAt: string;

  @ApiPropertyOptional({ enum: MileageSource })
  @IsOptional() @IsEnum(MileageSource) source?: MileageSource;
}

// ─── Filtres maintenance ───────────────────────────────────────────────────

export class MaintenanceFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(MaintenanceType) type?: MaintenanceType;
  @ApiPropertyOptional() @IsOptional() @IsEnum(MaintenanceStatus) status?: MaintenanceStatus;
}

// ─── Filtres kilométrage ───────────────────────────────────────────────────

export class MileageFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() driverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(MileageSource) source?: MileageSource;
}
