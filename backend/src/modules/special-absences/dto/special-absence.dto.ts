import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { SpecialAbsenceStatus } from '@prisma/client';

/**
 * Raisons d'absence (string libre avec suggestions — pas d'enum pour flexibilité opérationnelle).
 * Suggestions : personal | illness | family_emergency | appointment | administrative | other
 */

// ─── Demande d'absence (chauffeur) ────────────────────────────────────────

export class RequestSpecialAbsenceDto {
  @ApiProperty({ description: 'ID du chauffeur demandeur' })
  @IsUUID() driverId: string;

  @ApiProperty({ description: 'ID du contrat concerné' })
  @IsUUID() contractId: string;

  @ApiProperty({
    description: 'Raison de l\'absence',
    example: 'illness | family_emergency | appointment | administrative | personal | other',
  })
  @IsString() reason: string;

  @ApiPropertyOptional({ description: 'Détails supplémentaires' })
  @IsOptional() @IsString() details?: string;

  @ApiProperty({ description: 'Date de début de l\'absence (ISO 8601)' })
  @IsDateString() startDate: string;

  @ApiProperty({ description: 'Durée estimée en jours', minimum: 1 })
  @IsInt() @Min(1) estimatedDays: number;
}

// ─── Examen manager ────────────────────────────────────────────────────────

export class ReviewAbsenceDto {
  @ApiProperty({
    description: 'approved = Manager approuve seul | escalate = escalade vers Super Manager',
    enum: ['approved', 'escalate'],
  })
  @IsEnum(['approved', 'escalate']) decision: 'approved' | 'escalate';

  @ApiPropertyOptional({ description: 'Commentaire du manager' })
  @IsOptional() @IsString() reviewComment?: string;
}

// ─── Validation Super Manager ──────────────────────────────────────────────

export class SmValidateAbsenceDto {
  @ApiProperty({ description: 'approved | rejected' })
  @IsEnum(['approved', 'rejected']) decision: 'approved' | 'rejected';

  @ApiPropertyOptional({ description: 'Motif de rejet' })
  @IsOptional() @IsString() rejectionReason?: string;
}

// ─── Clôture absence (fin effective) ──────────────────────────────────────

export class CloseAbsenceDto {
  @ApiPropertyOptional({ description: 'Date de fin effective (ISO 8601) — défaut: aujourd\'hui' })
  @IsOptional() @IsDateString() actualEnd?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── Filtres ───────────────────────────────────────────────────────────────

export class SpecialAbsenceFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() driverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(SpecialAbsenceStatus) status?: SpecialAbsenceStatus;
}
