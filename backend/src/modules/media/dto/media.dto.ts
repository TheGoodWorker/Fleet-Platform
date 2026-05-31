import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsOptional, IsString, IsUUID, IsDateString,
} from 'class-validator';
import { MediaType, MediaSource, PhotoMissionType } from '@prisma/client';

// ─── Upload ────────────────────────────────────────────────────────────────

export class UploadMediaDto {
  @ApiProperty({ description: 'Type de média', enum: MediaType })
  @IsEnum(MediaType)
  mediaType: MediaType;

  @ApiProperty({ description: 'Source — IN_APP_CAMERA obligatoire pour DRIVER', enum: MediaSource })
  @IsEnum(MediaSource)
  source: MediaSource;

  @ApiPropertyOptional({ description: 'Type d\'entité liée (VEHICLE, DRIVER, CONTRACT…)' })
  @IsOptional() @IsString() entityType?: string;

  @ApiPropertyOptional({ description: 'ID de l\'entité liée' })
  @IsOptional() @IsUUID() entityId?: string;

  @ApiPropertyOptional({ description: 'Date de prise de vue (ISO 8601)' })
  @IsOptional() @IsDateString() takenAt?: string;

  @ApiPropertyOptional({ description: 'Latitude GPS de la prise de vue' })
  @IsOptional() gpsLat?: number;

  @ApiPropertyOptional({ description: 'Longitude GPS de la prise de vue' })
  @IsOptional() gpsLng?: number;

  @ApiPropertyOptional({ description: 'Métadonnées libres (EXIF, etc.)' })
  @IsOptional() metadata?: Record<string, unknown>;
}

// ─── Photo wrapper ─────────────────────────────────────────────────────────

export class CreatePhotoDto {
  @ApiProperty({ description: 'ID du MediaAsset déjà uploadé' })
  @IsUUID() mediaAssetId: string;

  @ApiPropertyOptional({ description: 'ID de la mission photo liée' })
  @IsOptional() @IsUUID() missionId?: string;

  @ApiPropertyOptional({ description: 'ID de l\'inspection liée' })
  @IsOptional() @IsUUID() inspectionId?: string;

  @ApiPropertyOptional({ description: 'Contexte de capture (DAMAGE, ODOMETER, SCENE…)' })
  @IsOptional() @IsString() captureContext?: string;
}

// ─── Photo Mission ─────────────────────────────────────────────────────────

export class CreatePhotoMissionDto {
  @ApiProperty({ description: 'ID du véhicule concerné' })
  @IsUUID() vehicleId: string;

  @ApiProperty({ description: 'ID du chauffeur assigné' })
  @IsUUID() driverId: string;

  @ApiProperty({ enum: PhotoMissionType })
  @IsEnum(PhotoMissionType) type: PhotoMissionType;

  @ApiProperty({ description: 'Date limite de soumission (ISO 8601)' })
  @IsDateString() dueDate: string;

  @ApiPropertyOptional({ description: 'ID de l\'incident déclencheur' })
  @IsOptional() @IsUUID() incidentId?: string;
}

export class SubmitPhotoMissionDto {
  @ApiProperty({ description: 'Liste des IDs de Photo à lier à cette mission', type: [String] })
  @IsUUID('all', { each: true }) photoIds: string[];
}

export class MediaFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsString() entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() entityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(MediaType) mediaType?: MediaType;
}

export class PhotoMissionFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() driverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
