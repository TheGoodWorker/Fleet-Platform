import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional,
  IsString, IsUUID,
} from 'class-validator';
import {
  AccidentStep, AccidentCaseStatus, AccidentExpenseType, ChargeResponsible,
} from '@prisma/client';

// ─── Création dossier accident ─────────────────────────────────────────────
// Le dossier est toujours créé depuis un Incident existant.

export class CreateAccidentCaseDto {
  @ApiProperty({ description: 'ID de l\'incident déclencheur (type ACCIDENT)' })
  @IsUUID() incidentId: string;

  @ApiPropertyOptional({ description: 'ID de l\'acteur déclarant (si différent de l\'acteur courant)' })
  @IsOptional() @IsUUID() declaredById?: string;

  @ApiPropertyOptional({ description: 'Numéro de PV de police' })
  @IsOptional() @IsString() policeReportNumber?: string;

  @ApiPropertyOptional({ description: 'Compagnie d\'assurance' })
  @IsOptional() @IsString() insuranceCompany?: string;

  @ApiPropertyOptional({ description: 'Numéro de dossier assurance' })
  @IsOptional() @IsString() insuranceFileNumber?: string;

  @ApiPropertyOptional({ description: 'ID du MediaAsset du constat / PV' })
  @IsOptional() @IsUUID() insuranceDocumentId?: string;

  @ApiPropertyOptional({ description: 'Estimation de la durée de réparation (jours)' })
  @IsOptional() @IsInt() estimatedRepairDays?: number;

  @ApiPropertyOptional({ description: 'Date limite de sortie garage contractuelle (ISO 8601)' })
  @IsOptional() @IsDateString() repairDeadline?: string;
}

// ─── Avancement d'étape ────────────────────────────────────────────────────

export class AdvanceStepDto {
  @ApiProperty({
    enum: AccidentStep,
    description: 'Prochaine étape à valider (doit être supérieure à l\'étape courante)',
  })
  @IsEnum(AccidentStep) step: AccidentStep;

  @ApiPropertyOptional({ description: 'Notes liées à cette étape' })
  @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ description: 'URL du document justificatif lié à cette étape' })
  @IsOptional() @IsString() documentUrl?: string;

  // Champs spécifiques à certaines étapes
  @ApiPropertyOptional({ description: 'Société de remorquage (étape TOWING_REQUESTED)' })
  @IsOptional() @IsString() towingCompany?: string;

  @ApiPropertyOptional({ description: 'Coût de remorquage (étape VEHICLE_TOWED)' })
  @IsOptional() @IsNumber() towingCost?: number;

  @ApiPropertyOptional({ description: 'Plaque du remorqueur visible sur photo' })
  @IsOptional() @IsBoolean() towingPlateVisible?: boolean;

  @ApiPropertyOptional({ description: 'URL photo remorquage' })
  @IsOptional() @IsString() towingPhotoUrl?: string;
}

// ─── Ajout dépense ─────────────────────────────────────────────────────────

export class AddExpenseDto {
  @ApiProperty({ enum: AccidentExpenseType })
  @IsEnum(AccidentExpenseType) type: AccidentExpenseType;

  @ApiProperty({ description: 'Montant de la dépense (MAD)' })
  @IsNumber() amount: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ enum: ChargeResponsible })
  @IsOptional() @IsEnum(ChargeResponsible) responsible?: ChargeResponsible;

  @ApiPropertyOptional({ description: 'URL du justificatif' })
  @IsOptional() @IsString() documentUrl?: string;
}

// ─── Validation / rejet dépense ────────────────────────────────────────────

export class ValidateExpenseDto {
  @ApiPropertyOptional({ description: 'Motif de rejet (si rejet)' })
  @IsOptional() @IsString() rejectionReason?: string;
}

// ─── Clôture dossier ───────────────────────────────────────────────────────

export class CloseAccidentCaseDto {
  @ApiPropertyOptional({ enum: AccidentCaseStatus })
  @IsOptional() @IsEnum(AccidentCaseStatus) status?: AccidentCaseStatus;

  @ApiPropertyOptional({ description: 'Notes de clôture' })
  @IsOptional() @IsString() notes?: string;
}

// ─── Filtres ───────────────────────────────────────────────────────────────

export class AccidentFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(AccidentCaseStatus) status?: AccidentCaseStatus;
  @ApiPropertyOptional() @IsOptional() @IsEnum(AccidentStep) currentStep?: AccidentStep;
}
