import '../../domain/entities/assignment.dart';

class AssignmentModel extends Assignment {
  const AssignmentModel({
    required super.id,
    required super.vehicleId,
    required super.driverId,
    required super.startDate,
    required super.isActive,
    required super.source,
    super.contractId,
    super.endDate,
    super.notes,
    super.vehiclePlate,
    super.vehicleBrand,
    super.vehicleModel,
    super.driverFirstName,
    super.driverLastName,
    super.driverPhone,
  });

  factory AssignmentModel.fromJson(Map<String, dynamic> json) {
    final vehicle = json['vehicle'] as Map<String, dynamic>?;
    final driver = json['driver'] as Map<String, dynamic>?;
    final driverUser = driver?['user'] as Map<String, dynamic>?;

    return AssignmentModel(
      id: json['id'] as String? ?? '',
      vehicleId: json['vehicleId'] as String? ?? '',
      driverId: json['driverId'] as String? ?? '',
      contractId: json['contractId'] as String?,
      startDate:
          DateTime.tryParse(json['startDate'] as String? ?? '') ?? DateTime.now(),
      endDate: json['endDate'] != null
          ? DateTime.tryParse(json['endDate'] as String)
          : null,
      isActive: json['isActive'] as bool? ?? false,
      source: json['source'] as String? ?? 'MANAGER',
      notes: json['notes'] as String?,
      vehiclePlate: vehicle?['plateNumber'] as String?,
      vehicleBrand: vehicle?['brand'] as String?,
      vehicleModel: vehicle?['model'] as String?,
      driverFirstName: driverUser?['firstName'] as String?,
      driverLastName: driverUser?['lastName'] as String?,
      driverPhone: driverUser?['phone'] as String?,
    );
  }
}
