import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

import '../../../../shared/theme/app_theme.dart';

enum DriverStatus {
  pendingKyc,
  pendingFieldValidation,
  approved,
  active,
  suspended,
  atRisk,
  terminated,
  blacklisted;

  static DriverStatus fromString(String value) {
    return switch (value) {
      'PENDING_KYC' => DriverStatus.pendingKyc,
      'PENDING_FIELD_VALIDATION' => DriverStatus.pendingFieldValidation,
      'APPROVED' => DriverStatus.approved,
      'ACTIVE' => DriverStatus.active,
      'SUSPENDED' => DriverStatus.suspended,
      'AT_RISK' => DriverStatus.atRisk,
      'TERMINATED' => DriverStatus.terminated,
      'BLACKLISTED' => DriverStatus.blacklisted,
      _ => DriverStatus.pendingKyc,
    };
  }

  String get label => switch (this) {
        DriverStatus.pendingKyc => 'KYC en attente',
        DriverStatus.pendingFieldValidation => 'Validation terrain',
        DriverStatus.approved => 'Approuvé',
        DriverStatus.active => 'Actif',
        DriverStatus.suspended => 'Suspendu',
        DriverStatus.atRisk => 'À risque',
        DriverStatus.terminated => 'Résilié',
        DriverStatus.blacklisted => 'Blacklisté',
      };

  Color get color => switch (this) {
        DriverStatus.pendingKyc => AppColors.warning,
        DriverStatus.pendingFieldValidation => AppColors.warning,
        DriverStatus.approved => AppColors.info,
        DriverStatus.active => AppColors.success,
        DriverStatus.suspended => AppColors.error,
        DriverStatus.atRisk => AppColors.roleOwner,
        DriverStatus.terminated => AppColors.textSecondary,
        DriverStatus.blacklisted => AppColors.textPrimary,
      };
}

class Driver extends Equatable {
  const Driver({
    required this.id,
    required this.status,
    required this.firstName,
    required this.lastName,
    required this.idCardNumber,
    required this.licenseNumber,
    this.phone,
    this.email,
  });

  final String id;
  final DriverStatus status;
  final String firstName;
  final String lastName;
  final String idCardNumber;
  final String licenseNumber;
  final String? phone;
  final String? email;

  String get fullName => '$firstName $lastName';

  @override
  List<Object?> get props => [
        id,
        status,
        firstName,
        lastName,
        idCardNumber,
        licenseNumber,
        phone,
        email,
      ];
}
