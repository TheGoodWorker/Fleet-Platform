import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ImmobilizationResponsible, ImmobilizationStatus } from '@prisma/client';

// ─── Création immobilisation ───────────────────────────────────────────────

export class CreateImmobilizationDto {
  @ApiProperty({ description: 'ID du véhicule à immobiliser' })
  @IsUUID() vehicleId: string;

  @ApiPropertyOptional({ description: 'ID du contrat associé (si en cours)' })
  @IsOptional() @IsUUID() contractId?: string;

  @ApiProperty({ enum: ImmobilizationResponsible, description: 'Responsable : DRIVER ou COMPANY' })
  @IsEnum(ImmobilizationResponsible) responsible: ImmobilizationResponsible;

  @ApiProperty({
    description: 'Raison de l\'immobilisation',
    example: 'Impayés > 3 jours | Accident responsable | Document expiré | Décision manager',
  })
  @IsString() reason: string;

  @ApiPropertyOptional({ description: 'Détails complémentaires' })
  @IsOptional() @IsString() details?: string;

  @ApiProperty({ description: 'Date de début (ISO 8601)' })
  @IsDateString() startDate: string;

  @ApiPropertyOptional({ description: 'Fin estimée (ISO 8601)' })
  @IsOptional() @IsDateString() estimatedEnd?: string;

  @ApiPropertyOptional({ description: 'ID de l\'incident déclencheur' })
  @IsOptional() @IsUUID() incidentId?: string;
}

// ─── Libération immobilisation ─────────────────────────────────────────────

export class ReleaseImmobilizationDto {
  @ApiPropertyOptional({ description: 'Notes de libération' })
  @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ description: 'Date de reprise effective (ISO 8601) — défaut: maintenant' })
  @IsOptional() @IsDateString() resumeDate?: string;
}

// ─── Filtres ───────────────────────────────────────────────────────────────

export class ImmobilizationFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ImmobilizationStatus) status?: ImmobilizationStatus;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ImmobilizationResponsible) responsible?: ImmobilizationResponsible;
}
