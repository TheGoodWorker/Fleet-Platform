import '../../domain/entities/incident.dart';

class IncidentModel extends Incident {
  const IncidentModel({
    required super.id,
    required super.type,
    required super.status,
    required super.severity,
    required super.vehicleId,
    required super.description,
    required super.occurredAt,
    required super.createdAt,
    super.vehiclePlate,
    super.vehicleBrand,
    super.vehicleModel,
    super.driverId,
    super.notes,
    super.locationLat,
    super.locationLng,
    super.resolvedAt,
    super.hasAccidentCase,
    super.chargesCount,
  });

  factory IncidentModel.fromJson(Map<String, dynamic> json) {
    final vehicle = json['vehicle'] as Map<String, dynamic>?;
    final driver = json['driver'] as Map<String, dynamic>?;
    final accidentCase = json['accidentCase'];
    final charges = json['charges'] as List? ?? [];

    return IncidentModel(
      id: json['id'] as String,
      type: IncidentType.fromString(json['type'] as String? ?? 'OTHER'),
      status: IncidentStatus.fromString(json['status'] as String? ?? 'OPEN'),
      severity:
          IncidentSeverity.fromString(json['severity'] as String? ?? 'MEDIUM'),
      vehicleId: json['vehicleId'] as String? ?? '',
      vehiclePlate: vehicle?['plateNumber'] as String?,
      vehicleBrand: vehicle?['brand'] as String?,
      vehicleModel: vehicle?['model'] as String?,
      driverId: driver?['id'] as String? ?? json['driverId'] as String?,
      description: json['description'] as String? ?? '',
      notes: json['notes'] as String?,
      locationLat: (json['locationLat'] as num?)?.toDouble(),
      locationLng: (json['locationLng'] as num?)?.toDouble(),
      occurredAt: DateTime.tryParse(json['occurredAt'] as String? ?? '') ??
          DateTime.now(),
      resolvedAt: json['resolvedAt'] != null
          ? DateTime.tryParse(json['resolvedAt'] as String)
          : null,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      hasAccidentCase: accidentCase != null,
      chargesCount: charges.length,
    );
  }
}
