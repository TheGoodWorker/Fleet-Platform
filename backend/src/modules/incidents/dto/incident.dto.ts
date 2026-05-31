import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsDateString,
} from 'class-validator';
import { IncidentType, IncidentStatus, IncidentSeverity } from '@prisma/client';

// ─── Création incident ─────────────────────────────────────────────────────

export class CreateIncidentDto {
  @ApiProperty({ enum: IncidentType })
  @IsEnum(IncidentType) type: IncidentType;

  @ApiPropertyOptional({ enum: IncidentSeverity })
  @IsOptional() @IsEnum(IncidentSeverity) severity?: IncidentSeverity;

  @ApiProperty({ description: 'ID du véhicule concerné' })
  @IsUUID() vehicleId: string;

  @ApiPropertyOptional({ description: 'ID du chauffeur impliqué' })
  @IsOptional() @IsUUID() driverId?: string;

  @ApiPropertyOptional({ description: 'ID du manager responsable' })
  @IsOptional() @IsUUID() managerId?: string;

  @ApiProperty({ description: 'Description détaillée de l\'incident' })
  @IsString() description: string;

  @ApiPropertyOptional({ description: 'Notes internes' })
  @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ description: 'Latitude GPS du lieu de l\'incident' })
  @IsOptional() @IsNumber() locationLat?: number;

  @ApiPropertyOptional({ description: 'Longitude GPS du lieu de l\'incident' })
  @IsOptional() @IsNumber() locationLng?: number;

  @ApiProperty({ description: 'Date et heure de l\'incident (ISO 8601)' })
  @IsDateString() occurredAt: string;
}

// ─── Mise à jour incident ──────────────────────────────────────────────────

export class UpdateIncidentDto {
  @ApiPropertyOptional({ enum: IncidentSeverity })
  @IsOptional() @IsEnum(IncidentSeverity) severity?: IncidentSeverity;

  @ApiPropertyOptional()
  @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ description: 'Manager responsable' })
  @IsOptional() @IsUUID() managerId?: string;
}

// ─── Résolution incident ───────────────────────────────────────────────────

export class ResolveIncidentDto {
  @ApiPropertyOptional({ description: 'Notes de résolution' })
  @IsOptional() @IsString() notes?: string;
}

// ─── Filtres ───────────────────────────────────────────────────────────────

export class IncidentFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() driverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(IncidentType) type?: IncidentType;
  @ApiPropertyOptional() @IsOptional() @IsEnum(IncidentStatus) status?: IncidentStatus;
  @ApiPropertyOptional() @IsOptional() @IsEnum(IncidentSeverity) severity?: IncidentSeverity;
}
