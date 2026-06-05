import 'package:flutter/foundation.dart' show debugPrint;

import '../../domain/entities/vehicle.dart';

/// Modèle VehicleDto — correspondance directe avec la réponse API
class VehicleModel extends Vehicle {
  const VehicleModel({
    required super.id,
    required super.plateNumber,
    required super.brand,
    required super.model,
    required super.year,
    required super.color,
    required super.fuelType,
    required super.status,
    super.vin,
    super.transmission,
    super.seats,
    super.ownerName,
    super.driverName,
    super.currentContractType,
  });

  factory VehicleModel.fromJson(Map<String, dynamic> json) {
    debugPrint('[VehicleModel] parsing id=${json['id']} plate=${json['plateNumber']}');

    final owner = json['owner'] as Map<String, dynamic>?;
    final currentDriver = json['currentDriver'] as Map<String, dynamic>?;
    final currentContract = json['currentContract'] as Map<String, dynamic>?;

    String? driverName;
    if (currentDriver != null) {
      final user = currentDriver['user'] as Map<String, dynamic>?;
      if (user != null) {
        final firstName = user['firstName'] as String? ?? '';
        final lastName = user['lastName'] as String? ?? '';
        driverName = '$firstName $lastName'.trim();
        if (driverName.isEmpty) driverName = null;
      }
    }

    return VehicleModel(
      id: json['id'] as String,
      plateNumber: json['plateNumber'] as String,
      brand: json['brand'] as String,
      model: json['model'] as String,
      // year / color / fuelType sont nullable dans le schéma Prisma (Int? / String?)
      // → on fournit des valeurs par défaut pour éviter un TypeError sur null
      year: (json['year'] as int?) ?? 0,
      color: (json['color'] as String?) ?? '',
      fuelType: (json['fuelType'] as String?) ?? '',
      status: VehicleStatus.fromString((json['status'] as String?) ?? 'AVAILABLE'),
      vin: json['vin'] as String?,
      transmission: json['transmission'] as String?,
      seats: json['seats'] as int?,
      ownerName: owner?['name'] as String?,
      driverName: driverName,
      currentContractType: currentContract?['type'] as String?,
    );
  }
}
