import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID,
} from 'class-validator';
import { DocumentEntityType, DocumentStatus, DocumentType } from '@prisma/client';

// ─── Création ──────────────────────────────────────────────────────────────

export class CreateDocumentDto {
  @ApiProperty({ enum: DocumentEntityType, description: 'Type de l\'entité liée' })
  @IsEnum(DocumentEntityType)
  entityType: DocumentEntityType;

  @ApiProperty({ description: 'ID de l\'entité liée (véhicule, chauffeur, contrat…)' })
  @IsUUID()
  entityId: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiPropertyOptional({ description: 'ID du MediaAsset (fichier uploadé)' })
  @IsOptional() @IsUUID() mediaAssetId?: string;

  @ApiPropertyOptional({ description: 'Titre affiché du document' })
  @IsOptional() @IsString() title?: string;

  @ApiPropertyOptional({ description: 'Date de début de validité (ISO 8601)' })
  @IsOptional() @IsDateString() validFrom?: string;

  @ApiPropertyOptional({ description: 'Date d\'expiration (ISO 8601). Null si alwaysValid=true.' })
  @IsOptional() @IsDateString() validUntil?: string;

  @ApiPropertyOptional({ description: 'Vrai si le document n\'expire jamais (ex: carte grise)' })
  @IsOptional() @IsBoolean() alwaysValid?: boolean;

  @ApiPropertyOptional({ description: 'Vrai si ce document est critique — notifie l\'Admin en cas d\'expiration' })
  @IsOptional() @IsBoolean() isCritical?: boolean;

  @ApiPropertyOptional({ description: 'Envoyer les rappels d\'expiration au propriétaire du véhicule' })
  @IsOptional() @IsBoolean() notifyOwner?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── Mise à jour ───────────────────────────────────────────────────────────

export class UpdateDocumentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() alwaysValid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCritical?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyOwner?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── Filtres ───────────────────────────────────────────────────────────────

export class DocumentFiltersDto {
  @ApiPropertyOptional({ enum: DocumentEntityType })
  @IsOptional() @IsEnum(DocumentEntityType) entityType?: DocumentEntityType;

  @ApiPropertyOptional() @IsOptional() @IsUUID() entityId?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional() @IsEnum(DocumentType) type?: DocumentType;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsOptional() @IsEnum(DocumentStatus) status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Si true, retourne uniquement la dernière version' })
  @IsOptional() @IsBoolean() isLatest?: boolean;
}
