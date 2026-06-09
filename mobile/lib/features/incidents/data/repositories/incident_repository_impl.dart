import '../../domain/entities/incident.dart';
import '../../domain/repositories/incident_repository.dart';
import '../datasources/incident_remote_datasource.dart';

class IncidentRepositoryImpl implements IncidentRepository {
  const IncidentRepositoryImpl(this._remote);
  final IncidentRemoteDataSource _remote;

  @override
  Future<List<Incident>> getIncidents({
    String? vehicleId, String? type, String? status,
    String? severity, int page = 1, int limit = 50,
  }) => _remote.getIncidents(
    vehicleId: vehicleId, type: type, status: status,
    severity: severity, page: page, limit: limit,
  );

  @override
  Future<Incident> getIncidentById(String id) =>
      _remote.getIncidentById(id);

  @override
  Future<Incident> createIncident({
    required String type, required String vehicleId,
    required String description, required String occurredAt,
    String? driverId, String? managerId, String? severity,
    String? notes, double? locationLat, double? locationLng,
  }) => _remote.createIncident(
    type: type, vehicleId: vehicleId, description: description,
    occurredAt: occurredAt, driverId: driverId, managerId: managerId,
    severity: severity, notes: notes,
    locationLat: locationLat, locationLng: locationLng,
  );

  @override
  Future<Incident> markInProgress(String id) => _remote.markInProgress(id);

  @override
  Future<Incident> resolve(String id, {String? notes}) =>
      _remote.resolve(id, notes: notes);

  @override
  Future<Incident> closeIncident(String id) => _remote.closeIncident(id);
}
