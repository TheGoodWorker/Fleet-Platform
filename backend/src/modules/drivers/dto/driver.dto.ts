import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, IsUUID, IsBoolean, IsNumber } from 'class-validator';
import { DriverStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateDriverDto {
  @ApiProperty({ description: 'ID du User (compte téléphone) à lier au chauffeur' })
  @IsUUID() userId: string;

  @ApiPropertyOptional() @IsOptional() @IsString() idCardNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContact?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) familyContacts?: string[];
}

export class UpdateDriverDto {
  @ApiPropertyOptional() @IsOptional() @IsString() idCardNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() licenseNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContact?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() familyContacts?: string[];
}

export class DriverFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DriverStatus }) @IsOptional() @IsEnum(DriverStatus) status?: DriverStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

/** G-02 : statut via body (body → ValidationPipe, Swagger propre, génération Flutter correcte) */
export class UpdateDriverStatusDto {
  @ApiProperty({ enum: DriverStatus, description: 'Nouveau statut du chauffeur' })
  @IsEnum(DriverStatus)
  status: DriverStatus;
}

export class ValidateFieldDto {
  @ApiPropertyOptional({ description: 'La visite à domicile a été effectuée' })
  @IsOptional() @IsBoolean() homeVisitDone?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() homeVisitPhotoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() gpsLocationLat?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() gpsLocationLng?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() environmentPhotoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resourcePersonName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resourcePersonPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() familyContactsNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managerComment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
