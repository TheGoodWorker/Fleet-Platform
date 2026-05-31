import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID,
  IsDateString, Min, Max,
} from 'class-validator';
import { PaymentMethod, RentalPaymentStatus } from '@prisma/client';

// ─── Mise à jour des paramètres de visibilité ──────────────────────────────

export class UpdateVisibilitySettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showDailyEntries?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showDriverPayments?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showCharges?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showGrossRevenue?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showDriverName?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showVehicleDetails?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showGps?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showDocuments?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showAccidents?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showMaintenance?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showNotifications?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() showRoi?: boolean;
}

// ─── Enregistrement versement propriétaire (SIMPLE_RENTAL) ────────────────

export class RecordRentalPaymentDto {
  @ApiProperty({ description: 'ID du contrat SIMPLE_RENTAL' })
  @IsUUID() contractId: string;

  @ApiProperty({ description: 'ID du propriétaire' })
  @IsUUID() ownerId: string;

  @ApiProperty({ description: 'Montant attendu contractuellement (MAD)' })
  @IsNumber() expectedAmount: number;

  @ApiPropertyOptional({ description: 'Montant effectivement versé (MAD) — peut différer si accord partiel' })
  @IsOptional() @IsNumber() actualAmount?: number;

  @ApiProperty({ description: 'Mois de la période (1 = janvier … 12 = décembre)', minimum: 1, maximum: 12 })
  @IsInt() @Min(1) @Max(12) periodMonth: number;

  @ApiProperty({ description: 'Année de la période (ex: 2026)', minimum: 2020 })
  @IsInt() @Min(2020) periodYear: number;

  @ApiPropertyOptional({ description: 'Date d\'échéance (ISO 8601)' })
  @IsOptional() @IsDateString() dueDate?: string;

  @ApiPropertyOptional({ description: 'Date effective de versement (ISO 8601) — défaut: maintenant' })
  @IsOptional() @IsDateString() paidAt?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Référence de virement / transaction' })
  @IsOptional() @IsString() reference?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() notes?: string;
}

// ─── Mise à jour statut versement ─────────────────────────────────────────

export class UpdateRentalPaymentStatusDto {
  @ApiProperty({ enum: RentalPaymentStatus })
  @IsEnum(RentalPaymentStatus) status: RentalPaymentStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString() notes?: string;
}

// ─── Dashboard propriétaire ────────────────────────────────────────────────

export class OwnerDashboardDto {
  contractId: string;
  contractType: string;
  vehicleDetails: {
    id: string;
    plateNumber: string;
    brand: string;
    model: string;
  } | null;
  driverName: string | null;
  activeContractStatus: string;
  rentalPayments: {
    total: number;
    paid: number;
    pending: number;
    late: number;
    history: any[];
  } | null;
  roi: {
    investmentCost: number | null;
    cumulativeExpected: number;
    cumulativePaid: number;
    roiPercent: number | null;
  } | null;
  documents: any[] | null;
  accidents: any[] | null;
  maintenance: any[] | null;
  notifications: any[] | null;
}

// ─── Résumé financier propriétaire ────────────────────────────────────────

export class OwnerFinancialSummaryDto {
  contractId: string;
  periodMonth: number;
  periodYear: number;
  rentalPayment: {
    expectedAmount: number;
    actualAmount: number | null;
    status: string;
    dueDate: string | null;
    paidAt: string | null;
  } | null;
  balance: {
    totalExpected: number;
    totalPaid: number;
    totalRemaining: number;
  };
}

// ─── Filtres versements ────────────────────────────────────────────────────

export class RentalPaymentFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(RentalPaymentStatus) status?: RentalPaymentStatus;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(2020) periodYear?: number;
}
