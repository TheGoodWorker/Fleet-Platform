import '../../domain/entities/assignment.dart';
import '../../domain/repositories/assignment_repository.dart';
import '../datasources/assignment_remote_datasource.dart';

class AssignmentRepositoryImpl implements AssignmentRepository {
  const AssignmentRepositoryImpl(this._remote);
  final AssignmentRemoteDataSource _remote;

  @override
  Future<List<Assignment>> getVehicleAssignments(
    String vehicleId, {
    int page = 1,
    int limit = 50,
  }) =>
      _remote.getVehicleAssignments(vehicleId, page: page, limit: limit);

  @override
  Future<List<Assignment>> getDriverAssignments(
    String driverId, {
    int page = 1,
    int limit = 50,
  }) =>
      _remote.getDriverAssignments(driverId, page: page, limit: limit);

  @override
  Future<void> assignDriver({
    required String vehicleId,
    required String driverId,
    String? notes,
  }) =>
      _remote.assignDriver(vehicleId: vehicleId, driverId: driverId, notes: notes);

  @override
  Future<void> unassignDriver(String vehicleId) =>
      _remote.unassignDriver(vehicleId);
}
