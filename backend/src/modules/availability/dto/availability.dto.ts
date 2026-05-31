import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { VehicleAvailabilityEventType } from '@prisma/client';

// ─── Création événement ────────────────────────────────────────────────────

export class CreateAvailabilityEventDto {
  @ApiProperty({ description: 'ID du véhicule concerné' })
  @IsUUID() vehicleId: string;

  @ApiPropertyOptional({ description: 'ID du contrat associé' })
  @IsOptional() @IsUUID() contractId?: string;

  @ApiPropertyOptional({ description: 'ID du chauffeur associé' })
  @IsOptional() @IsUUID() driverId?: string;

  @ApiProperty({ enum: VehicleAvailabilityEventType })
  @IsEnum(VehicleAvailabilityEventType) type: VehicleAvailabilityEventType;

  @ApiProperty({ description: 'Date de début (ISO 8601)' })
  @IsDateString() startDate: string;

  @ApiPropertyOptional({ description: 'Date de fin prévue (ISO 8601)' })
  @IsOptional() @IsDateString() endDate?: string;

  @ApiPropertyOptional({ description: 'Type d\'entité source (IMMOBILIZATION, INCIDENT…)' })
  @IsOptional() @IsString() sourceEntityType?: string;

  @ApiPropertyOptional({ description: 'ID de l\'entité source' })
  @IsOptional() @IsString() sourceEntityId?: string;

  @ApiPropertyOptional({ description: 'Notes libres' })
  @IsOptional() @IsString() notes?: string;
}

// ─── Résolution événement ──────────────────────────────────────────────────

export class ResolveAvailabilityEventDto {
  @ApiPropertyOptional({ description: 'Notes de résolution' })
  @IsOptional() @IsString() notes?: string;
}

// ─── Filtres ───────────────────────────────────────────────────────────────

export class AvailabilityFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(VehicleAvailabilityEventType) type?: VehicleAvailabilityEventType;
  @ApiPropertyOptional({ description: 'true = uniquement les événements non résolus' })
  @IsOptional() @IsString() active?: string; // 'true' | 'false' — query param
}
