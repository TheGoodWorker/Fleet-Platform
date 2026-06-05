import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

import '../../../../shared/theme/app_theme.dart';

enum VehicleStatus {
  available,
  assigned,
  inService,
  immobilized,
  inRepair,
  accidented,
  pendingInspection,
  repossessed,
  outOfService,
  sold;

  static VehicleStatus fromString(String value) {
    return switch (value) {
      'AVAILABLE' => VehicleStatus.available,
      'ASSIGNED' => VehicleStatus.assigned,
      'IN_SERVICE' => VehicleStatus.inService,
      'IMMOBILIZED' => VehicleStatus.immobilized,
      'IN_REPAIR' => VehicleStatus.inRepair,
      'ACCIDENTED' => VehicleStatus.accidented,
      'PENDING_INSPECTION' => VehicleStatus.pendingInspection,
      'REPOSSESSED' => VehicleStatus.repossessed,
      'OUT_OF_SERVICE' => VehicleStatus.outOfService,
      'SOLD' => VehicleStatus.sold,
      _ => VehicleStatus.outOfService,
    };
  }

  String get label => switch (this) {
        VehicleStatus.available => 'Disponible',
        VehicleStatus.assigned => 'Assigné',
        VehicleStatus.inService => 'En service',
        VehicleStatus.immobilized => 'Immobilisé',
        VehicleStatus.inRepair => 'En réparation',
        VehicleStatus.accidented => 'Accidenté',
        VehicleStatus.pendingInspection => 'Inspection en attente',
        VehicleStatus.repossessed => 'Récupéré',
        VehicleStatus.outOfService => 'Hors service',
        VehicleStatus.sold => 'Vendu',
      };

  Color get color => switch (this) {
        VehicleStatus.available => AppColors.success,
        VehicleStatus.assigned => AppColors.primary,
        VehicleStatus.inService => AppColors.info,
        VehicleStatus.immobilized => AppColors.warning,
        VehicleStatus.inRepair => AppColors.warning,
        VehicleStatus.accidented => AppColors.error,
        VehicleStatus.pendingInspection => AppColors.warning,
        VehicleStatus.repossessed => AppColors.roleOwner,
        VehicleStatus.outOfService => AppColors.textSecondary,
        VehicleStatus.sold => AppColors.textDisabled,
      };
}

class Vehicle extends Equatable {
  const Vehicle({
    required this.id,
    required this.plateNumber,
    required this.brand,
    required this.model,
    required this.year,
    required this.color,
    required this.fuelType,
    required this.status,
    this.vin,
    this.transmission,
    this.seats,
    this.ownerName,
    this.driverName,
    this.currentContractType,
  });

  final String id;
  final String plateNumber;
  final String brand;
  final String model;
  final int year;
  final String color;
  final String fuelType;
  final VehicleStatus status;
  final String? vin;
  final String? transmission;
  final int? seats;
  final String? ownerName;
  final String? driverName;
  final String? currentContractType;

  @override
  List<Object?> get props => [
        id,
        plateNumber,
        brand,
        model,
        year,
        color,
        fuelType,
        status,
        vin,
        transmission,
        seats,
        ownerName,
        driverName,
        currentContractType,
      ];
}
