import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

import '../../../../shared/theme/app_theme.dart';

enum DocumentStatus {
  valid,
  expiringSoon,
  expired,
  alwaysValid,
  archived;

  String get value => switch (this) {
        DocumentStatus.valid => 'VALID',
        DocumentStatus.expiringSoon => 'EXPIRING_SOON',
        DocumentStatus.expired => 'EXPIRED',
        DocumentStatus.alwaysValid => 'ALWAYS_VALID',
        DocumentStatus.archived => 'ARCHIVED',
      };

  String get label => switch (this) {
        DocumentStatus.valid => 'Valide',
        DocumentStatus.expiringSoon => 'Expire bientôt',
        DocumentStatus.expired => 'Expiré',
        DocumentStatus.alwaysValid => 'Toujours valide',
        DocumentStatus.archived => 'Archivé',
      };

  Color get color => switch (this) {
        DocumentStatus.valid => AppColors.success,
        DocumentStatus.expiringSoon => AppColors.warning,
        DocumentStatus.expired => AppColors.error,
        DocumentStatus.alwaysValid => AppColors.primary,
        DocumentStatus.archived => AppColors.textSecondary,
      };

  static DocumentStatus fromString(String value) => switch (value) {
        'VALID' => DocumentStatus.valid,
        'EXPIRING_SOON' => DocumentStatus.expiringSoon,
        'EXPIRED' => DocumentStatus.expired,
        'ALWAYS_VALID' => DocumentStatus.alwaysValid,
        'ARCHIVED' => DocumentStatus.archived,
        _ => DocumentStatus.archived,
      };
}

enum DocumentType {
  insurance,
  technicalVisit,
  grayCard,
  parkingCard,
  sticker,
  patent,
  adminAuthorization,
  driverLicense,
  nationalId,
  kycDocument,
  contractDocument,
  accidentReport,
  insuranceClaim,
  repairQuote,
  repairExitPermit,
  franchiseProof,
  towingProof,
  contraventionNotice,
  other;

  String get value => switch (this) {
        DocumentType.insurance => 'INSURANCE',
        DocumentType.technicalVisit => 'TECHNICAL_VISIT',
        DocumentType.grayCard => 'GRAY_CARD',
        DocumentType.parkingCard => 'PARKING_CARD',
        DocumentType.sticker => 'STICKER',
        DocumentType.patent => 'PATENT',
        DocumentType.adminAuthorization => 'ADMIN_AUTHORIZATION',
        DocumentType.driverLicense => 'DRIVER_LICENSE',
        DocumentType.nationalId => 'NATIONAL_ID',
        DocumentType.kycDocument => 'KYC_DOCUMENT',
        DocumentType.contractDocument => 'CONTRACT_DOCUMENT',
        DocumentType.accidentReport => 'ACCIDENT_REPORT',
        DocumentType.insuranceClaim => 'INSURANCE_CLAIM',
        DocumentType.repairQuote => 'REPAIR_QUOTE',
        DocumentType.repairExitPermit => 'REPAIR_EXIT_PERMIT',
        DocumentType.franchiseProof => 'FRANCHISE_PROOF',
        DocumentType.towingProof => 'TOWING_PROOF',
        DocumentType.contraventionNotice => 'CONTRAVENTION_NOTICE',
        DocumentType.other => 'OTHER',
      };

  String get label => switch (this) {
        DocumentType.insurance => 'Assurance',
        DocumentType.technicalVisit => 'Visite technique',
        DocumentType.grayCard => 'Carte grise',
        DocumentType.parkingCard => 'Carte de stationnement',
        DocumentType.sticker => 'Vignette',
        DocumentType.patent => 'Patente',
        DocumentType.adminAuthorization => 'Autorisation administrative',
        DocumentType.driverLicense => 'Permis de conduire',
        DocumentType.nationalId => "Carte d'identité nationale",
        DocumentType.kycDocument => 'Document KYC',
        DocumentType.contractDocument => 'Document contractuel',
        DocumentType.accidentReport => "Constat d'accident",
        DocumentType.insuranceClaim => 'Déclaration sinistre',
        DocumentType.repairQuote => 'Devis réparation',
        DocumentType.repairExitPermit => 'Bon de sortie réparation',
        DocumentType.franchiseProof => 'Preuve de franchise',
        DocumentType.towingProof => 'Preuve de remorquage',
        DocumentType.contraventionNotice => 'Avis de contravention',
        DocumentType.other => 'Autre',
      };

  static DocumentType fromString(String value) => switch (value) {
        'INSURANCE' => DocumentType.insurance,
        'TECHNICAL_VISIT' => DocumentType.technicalVisit,
        'GRAY_CARD' => DocumentType.grayCard,
        'PARKING_CARD' => DocumentType.parkingCard,
        'STICKER' => DocumentType.sticker,
        'PATENT' => DocumentType.patent,
        'ADMIN_AUTHORIZATION' => DocumentType.adminAuthorization,
        'DRIVER_LICENSE' => DocumentType.driverLicense,
        'NATIONAL_ID' => DocumentType.nationalId,
        'KYC_DOCUMENT' => DocumentType.kycDocument,
        'CONTRACT_DOCUMENT' => DocumentType.contractDocument,
        'ACCIDENT_REPORT' => DocumentType.accidentReport,
        'INSURANCE_CLAIM' => DocumentType.insuranceClaim,
        'REPAIR_QUOTE' => DocumentType.repairQuote,
        'REPAIR_EXIT_PERMIT' => DocumentType.repairExitPermit,
        'FRANCHISE_PROOF' => DocumentType.franchiseProof,
        'TOWING_PROOF' => DocumentType.towingProof,
        'CONTRAVENTION_NOTICE' => DocumentType.contraventionNotice,
        'OTHER' => DocumentType.other,
        _ => DocumentType.other,
      };
}

class Document extends Equatable {
  const Document({
    required this.id,
    required this.entityType,
    required this.entityId,
    required this.type,
    required this.status,
    required this.alwaysValid,
    this.title,
    this.validFrom,
    this.validUntil,
    this.fileUrl,
  });

  final String id;
  final String entityType;
  final String entityId;
  final DocumentType type;
  final String? title;
  final DocumentStatus status;
  final DateTime? validFrom;
  final DateTime? validUntil;
  final bool alwaysValid;
  final String? fileUrl;

  @override
  List<Object?> get props => [
        id,
        entityType,
        entityId,
        type,
        title,
        status,
        validFrom,
        validUntil,
        alwaysValid,
        fileUrl,
      ];
}
