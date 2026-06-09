import 'package:equatable/equatable.dart';

class Assignment extends Equatable {
  const Assignment({
    required this.id,
    required this.vehicleId,
    required this.driverId,
    required this.startDate,
    required this.isActive,
    required this.source,
    this.contractId,
    this.endDate,
    this.notes,
    this.vehiclePlate,
    this.vehicleBrand,
    this.vehicleModel,
    this.driverFirstName,
    this.driverLastName,
    this.driverPhone,
  });

  final String id;
  final String vehicleId;
  final String driverId;
  final String? contractId;
  final DateTime startDate;
  final DateTime? endDate;
  final bool isActive;
  final String source; // CARCUL | MANAGER | ADMIN_CORRECTION
  final String? notes;
  final String? vehiclePlate;
  final String? vehicleBrand;
  final String? vehicleModel;
  final String? driverFirstName;
  final String? driverLastName;
  final String? driverPhone;

  String get vehicleLabel {
    if (vehiclePlate == null) return vehicleId;
    final brand = vehicleBrand != null ? ' — $vehicleBrand ${vehicleModel ?? ''}' : '';
    return '$vehiclePlate$brand'.trim();
  }

  String get driverLabel {
    final first = driverFirstName ?? '';
    final last = driverLastName ?? '';
    final full = '$first $last'.trim();
    return full.isNotEmpty ? full : driverId;
  }

  String get sourceLabel => switch (source) {
        'CARCUL' => 'Carcul',
        'ADMIN_CORRECTION' => 'Correction admin',
        _ => 'Manager',
      };

  @override
  List<Object?> get props => [
        id, vehicleId, driverId, contractId,
        startDate, endDate, isActive, source, notes,
      ];
}
