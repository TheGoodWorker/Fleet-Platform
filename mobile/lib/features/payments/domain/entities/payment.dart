import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

import '../../../../shared/theme/app_theme.dart';

enum PaymentSource {
  manual,
  wave,
  orangeMoney,
  other;

  String get value => switch (this) {
        PaymentSource.manual => 'MANUAL',
        PaymentSource.wave => 'WAVE',
        PaymentSource.orangeMoney => 'ORANGE_MONEY',
        PaymentSource.other => 'OTHER',
      };

  String get label => switch (this) {
        PaymentSource.manual => 'Manuel',
        PaymentSource.wave => 'Wave',
        PaymentSource.orangeMoney => 'Orange Money',
        PaymentSource.other => 'Autre',
      };

  static PaymentSource fromString(String value) => switch (value) {
        'MANUAL' => PaymentSource.manual,
        'WAVE' => PaymentSource.wave,
        'ORANGE_MONEY' => PaymentSource.orangeMoney,
        'OTHER' => PaymentSource.other,
        _ => PaymentSource.other,
      };
}

enum PaymentStatus {
  pending,
  confirmed, // maintenu pour compatibilité IHM — correspond à VALIDATED backend
  rejected;

  // Le backend envoie 'VALIDATED' (pas 'CONFIRMED')
  String get value => switch (this) {
        PaymentStatus.pending => 'PENDING',
        PaymentStatus.confirmed => 'VALIDATED',
        PaymentStatus.rejected => 'REJECTED',
      };

  String get label => switch (this) {
        PaymentStatus.pending => 'En attente',
        PaymentStatus.confirmed => 'Validé',
        PaymentStatus.rejected => 'Rejeté',
      };

  Color get color => switch (this) {
        PaymentStatus.pending => AppColors.warning,
        PaymentStatus.confirmed => AppColors.success,
        PaymentStatus.rejected => AppColors.error,
      };

  static PaymentStatus fromString(String value) => switch (value) {
        'PENDING' => PaymentStatus.pending,
        // Le backend envoie VALIDATED ; CONFIRMED gardé pour compatibilité
        'VALIDATED' || 'CONFIRMED' => PaymentStatus.confirmed,
        'REJECTED' => PaymentStatus.rejected,
        _ => PaymentStatus.pending,
      };
}

class Payment extends Equatable {
  const Payment({
    required this.id,
    required this.amount,
    required this.source,
    required this.paidAt,
    required this.status,
    this.reference,
    this.notes,
    this.vehiclePlate,
    this.driverName,
    this.contractType,
  });

  final String id;
  final double amount;
  final PaymentSource source;
  final DateTime paidAt;
  final PaymentStatus status;
  final String? reference;
  final String? notes;
  final String? vehiclePlate;
  final String? driverName;
  final String? contractType;

  @override
  List<Object?> get props => [
        id,
        amount,
        source,
        paidAt,
        status,
        reference,
        notes,
        vehiclePlate,
        driverName,
        contractType,
      ];
}
