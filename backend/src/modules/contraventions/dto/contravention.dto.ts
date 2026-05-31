import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsNumber, IsUUID, IsDateString, Min, IsBoolean,
} from 'class-validator';
import { ContraventionSource } from '@prisma/client';

export class CreateContraventionDto {
  @ApiProperty({ description: 'ID du véhicule concerné' })
  @IsUUID() vehicleId: string;

  @ApiPropertyOptional({ description: 'ID du chauffeur responsable (D-12 : toujours DRIVER)' })
  @IsOptional() @IsUUID() driverId?: string;

  @ApiPropertyOptional({ description: 'ID du contrat associé' })
  @IsOptional() @IsUUID() contractId?: string;

  @ApiProperty({ example: 15000, description: 'Montant de la contravention en FCFA' })
  @IsNumber() @Min(0) amount: number;

  @ApiPropertyOptional({
    enum: ContraventionSource,
    description: 'Source : CARCUL (GPS automatique) ou MANUAL (saisie manuelle)',
  })
  @IsOptional() @IsEnum(ContraventionSource) source?: ContraventionSource;

  @ApiPropertyOptional({ description: 'Référence Carcul (si source = CARCUL)' })
  @IsOptional() @IsString() carculRef?: string;

  @ApiPropertyOptional({ description: 'Description de l\'infraction' })
  @IsOptional() @IsString() infraction?: string;

  @ApiProperty({ description: 'Date de l\'infraction (ISO 8601)' })
  @IsDateString() date: string;

  @ApiPropertyOptional({ description: 'Lieu de l\'infraction' })
  @IsOptional() @IsString() location?: string;
}

export class MarkPaidDto {
  @ApiProperty({ description: 'Montant payé en FCFA' })
  @IsNumber() @Min(0) paidAmount: number;
}

export class ConvertToChargeDto {
  @ApiPropertyOptional({ description: 'Description de la charge à créer' })
  @IsOptional() @IsString() description?: string;
}

export class ContraventionFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() driverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ContraventionSource) source?: ContraventionSource;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPaid?: boolean;
}
