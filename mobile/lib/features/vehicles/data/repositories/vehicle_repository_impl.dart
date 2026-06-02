import '../../domain/entities/vehicle.dart';
import '../../domain/repositories/vehicle_repository.dart';
import '../datasources/vehicle_remote_datasource.dart';

class VehicleRepositoryImpl implements VehicleRepository {
  const VehicleRepositoryImpl(this._remote);

  final VehicleRemoteDataSource _remote;

  @override
  Future<List<Vehicle>> getVehicles({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    return _remote.getVehicles(status: status, page: page, limit: limit);
  }
}
