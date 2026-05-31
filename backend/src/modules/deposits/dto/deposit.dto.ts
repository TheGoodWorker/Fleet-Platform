import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, IsBoolean,
} from 'class-validator';
import { DepositTransactionType } from '@prisma/client';

export class CreateDepositDto {
  @ApiProperty({ description: 'ID du contrat' }) @IsUUID() contractId: string;

  /**
   * Montant proposé par le Super Manager.
   * S'il diffère du barème standard (2 jours × dailyAmount OU 50 000 FCFA),
   * isStandardAmount sera automatiquement mis à false et la validation Admin sera requise.
   */
  @ApiProperty({ example: 50000, description: 'Montant proposé en FCFA' })
  @IsNumber() @Min(1) requestedAmount: number;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RecordDepositPaymentDto {
  @ApiProperty({ example: 25000, description: 'Montant payé' })
  @IsNumber() @Min(1) amount: number;

  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AdminValidateDepositDto {
  @ApiProperty({ example: 75000, description: 'Montant validé par l\'Admin' })
  @IsNumber() @Min(1) validatedAmount: number;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UseDepositDto {
  @ApiProperty({ example: 30000, description: 'Montant utilisé depuis la caution' })
  @IsNumber() @Min(1) amount: number;

  @ApiProperty({ description: 'Justification (chargeId ou note)' })
  @IsString() description: string;

  @ApiPropertyOptional({ description: 'Charge liée à cet usage' })
  @IsOptional() @IsUUID() chargeId?: string;
}

export class RefundDepositDto {
  @ApiProperty({ example: 50000, description: 'Montant à rembourser' })
  @IsNumber() @Min(1) amount: number;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
