import '../entities/assignment.dart';

abstract class AssignmentRepository {
  Future<List<Assignment>> getVehicleAssignments(
    String vehicleId, {
    int page = 1,
    int limit = 50,
  });

  Future<List<Assignment>> getDriverAssignments(
    String driverId, {
    int page = 1,
    int limit = 50,
  });

  Future<void> assignDriver({
    required String vehicleId,
    required String driverId,
    String? notes,
  });

  Future<void> unassignDriver(String vehicleId);
}
