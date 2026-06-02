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
  pending,
  active,
  suspended,
  closed;

  String get value => switch (this) {
        ContractStatus.pending => 'PENDING',
        ContractStatus.active => 'ACTIVE',
        ContractStatus.suspended => 'SUSPENDED',
        ContractStatus.closed => 'CLOSED',
      };

  String get label => switch (this) {
        ContractStatus.pending => 'En attente',
        ContractStatus.active => 'Actif',
        ContractStatus.suspended => 'Suspendu',
        ContractStatus.closed => 'Clôturé',
      };

  Color get color => switch (this) {
        ContractStatus.pending => AppColors.warning,
        ContractStatus.active => AppColors.success,
        ContractStatus.suspended => AppColors.error,
        ContractStatus.closed => AppColors.textSecondary,
      };

  static ContractStatus fromString(String value) => switch (value) {
        'PENDING' => ContractStatus.pending,
        'ACTIVE' => ContractStatus.active,
        'SUSPENDED' => ContractStatus.suspended,
        'CLOSED' => ContractStatus.closed,
        _ => ContractStatus.pending,
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
