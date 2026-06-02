import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

import '../../../../shared/theme/app_theme.dart';

enum ContractType {
  ownershipProgram,
  partnerFleet,
  simpleRental;

  String get value => switch (this) {
        ContractType.ownershipProgram => 'OWNERSHIP_PROGRAM',
        ContractType.partnerFleet => 'PARTNER_FLEET',
        ContractType.simpleRental => 'SIMPLE_RENTAL',
      };

  String get label => switch (this) {
        ContractType.ownershipProgram => 'Programme propriété',
        ContractType.partnerFleet => 'Flotte partenaire',
        ContractType.simpleRental => 'Location simple',
      };

  static ContractType fromString(String value) => switch (value) {
        'OWNERSHIP_PROGRAM' => ContractType.ownershipProgram,
        'PARTNER_FLEET' => ContractType.partnerFleet,
        'SIMPLE_RENTAL' => ContractType.simpleRental,
        _ => ContractType.simpleRental,
      };
}

enum ContractStatus {
  // ── Valeurs réelles du backend ─────────────────────────────────────────────
  draft,             // DRAFT
  pendingApproval,   // PENDING_APPROVAL
  active,            // ACTIVE
  suspended,         // SUSPENDED
  immobilized,       // IMMOBILIZED
  blocked,           // BLOCKED
  terminated,        // TERMINATED
  completed,         // COMPLETED
  vehicleRepossessed, // VEHICLE_REPOSSESSED
  // ── Valeurs legacy maintenues pour compatibilité IHM ──────────────────────
  pending,           // ancien alias de draft
  closed;            // ancien alias de completed

  String get value => switch (this) {
        ContractStatus.draft => 'DRAFT',
        ContractStatus.pendingApproval => 'PENDING_APPROVAL',
        ContractStatus.active => 'ACTIVE',
        ContractStatus.suspended => 'SUSPENDED',
        ContractStatus.immobilized => 'IMMOBILIZED',
        ContractStatus.blocked => 'BLOCKED',
        ContractStatus.terminated => 'TERMINATED',
        ContractStatus.completed => 'COMPLETED',
        ContractStatus.vehicleRepossessed => 'VEHICLE_REPOSSESSED',
        ContractStatus.pending => 'DRAFT',
        ContractStatus.closed => 'COMPLETED',
      };

  String get label => switch (this) {
        ContractStatus.draft || ContractStatus.pending => 'Brouillon',
        ContractStatus.pendingApproval => "En attente d'approbation",
        ContractStatus.active => 'Actif',
        ContractStatus.suspended => 'Suspendu',
        ContractStatus.immobilized => 'Immobilisé',
        ContractStatus.blocked => 'Bloqué',
        ContractStatus.terminated => 'Résilié',
        ContractStatus.completed || ContractStatus.closed => 'Terminé',
        ContractStatus.vehicleRepossessed => 'Véhicule récupéré',
      };

  Color get color => switch (this) {
        ContractStatus.draft || ContractStatus.pending => AppColors.textSecondary,
        ContractStatus.pendingApproval => AppColors.warning,
        ContractStatus.active => AppColors.success,
        ContractStatus.suspended => AppColors.error,
        ContractStatus.immobilized => AppColors.warning,
        ContractStatus.blocked => AppColors.error,
        ContractStatus.terminated => AppColors.textPrimary,
        ContractStatus.completed || ContractStatus.closed => AppColors.info,
        ContractStatus.vehicleRepossessed => AppColors.roleOwner,
      };

  static ContractStatus fromString(String value) => switch (value) {
        'DRAFT' => ContractStatus.draft,
        'PENDING_APPROVAL' => ContractStatus.pendingApproval,
        'ACTIVE' => ContractStatus.active,
        'SUSPENDED' => ContractStatus.suspended,
        'IMMOBILIZED' => ContractStatus.immobilized,
        'BLOCKED' => ContractStatus.blocked,
        'TERMINATED' => ContractStatus.terminated,
        'COMPLETED' => ContractStatus.completed,
        'VEHICLE_REPOSSESSED' => ContractStatus.vehicleRepossessed,
        // legacy
        'PENDING' => ContractStatus.pending,
        'CLOSED' => ContractStatus.closed,
        _ => ContractStatus.draft,
      };
}

class Contract extends Equatable {
  const Contract({
    required this.id,
    required this.type,
    required this.status,
    required this.dailyAmount,
    this.targetDays,
    required this.vehicleId,
    required this.vehiclePlate,
    required this.vehicleBrand,
    required this.vehicleModel,
    this.driverName,
    this.ownerName,
    this.startDate,
    this.endDate,
    this.progressDays,
  });

  final String id;
  final ContractType type;
  final ContractStatus status;
  final double dailyAmount;
  final int? targetDays;
  final String vehicleId;
  final String vehiclePlate;
  final String vehicleBrand;
  final String vehicleModel;
  final String? driverName;
  final String? ownerName;
  final DateTime? startDate;
  final DateTime? endDate;

  /// Nombre de jours de progression pour OWNERSHIP_PROGRAM.
  /// Calculé depuis la datasource à partir de startDate si non fourni.
  final int? progressDays;

  @override
  List<Object?> get props => [
        id,
        type,
        status,
        dailyAmount,
        targetDays,
        vehicleId,
        vehiclePlate,
        vehicleBrand,
        vehicleModel,
        driverName,
        ownerName,
        startDate,
        endDate,
        progressDays,
      ];
}
