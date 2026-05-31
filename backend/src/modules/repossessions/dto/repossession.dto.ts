import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsUUID, IsDateString,
} from 'class-validator';
import { RepossessionStatus } from '@prisma/client';

export class CreateRepossessionDto {
  @ApiProperty({ description: 'ID du véhicule à reprendre' })
  @IsUUID() vehicleId: string;

  @ApiPropertyOptional({ description: 'ID du contrat associé (si actif)' })
  @IsOptional() @IsUUID() contractId?: string;

  @ApiProperty({ description: 'Raison de la reprise (impayés, fin de contrat, dégradation...)' })
  @IsString() reason: string;

  @ApiPropertyOptional({ description: 'Détails complémentaires' })
  @IsOptional() @IsString() details?: string;
}

export class SmValidateRepossessionDto {
  @ApiProperty({ enum: ['approved', 'rejected'], description: 'Décision Super Manager' })
  @IsString() decision: 'approved' | 'rejected';

  @ApiPropertyOptional({ description: 'Notes Super Manager' })
  @IsOptional() @IsString() notes?: string;
}

export class AdminApproveRepossessionDto {
  @ApiProperty({ enum: ['approved', 'rejected'], description: 'Décision Admin' })
  @IsString() decision: 'approved' | 'rejected';

  @ApiPropertyOptional({ description: 'Notes Admin' })
  @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ description: 'Date prévue de la reprise physique (ISO 8601)' })
  @IsOptional() @IsDateString() repossessionDate?: string;
}

export class RepossessionFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(RepossessionStatus) status?: RepossessionStatus;
}
