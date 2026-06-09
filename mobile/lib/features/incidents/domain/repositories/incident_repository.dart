import '../entities/incident.dart';

abstract class IncidentRepository {
  Future<List<Incident>> getIncidents({
    String? vehicleId,
    String? type,
    String? status,
    String? severity,
    int page = 1,
    int limit = 50,
  });

  Future<Incident> getIncidentById(String id);

  Future<Incident> createIncident({
    required String type,
    required String vehicleId,
    required String description,
    required String occurredAt,
    String? driverId,
    String? managerId,
    String? severity,
    String? notes,
    double? locationLat,
    double? locationLng,
  });

  Future<Incident> markInProgress(String id);

  Future<Incident> resolve(String id, {String? notes});

  Future<Incident> closeIncident(String id);
}
