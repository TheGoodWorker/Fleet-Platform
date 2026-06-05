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

  @override
  Future<Vehicle> getVehicleById(String id) async {
    return _remote.getVehicleById(id);
  }

  @override
  Future<Vehicle> createVehicle({
    required String plateNumber,
    required String brand,
    required String model,
    String? vin,
    int? year,
    String? color,
    String? fuelType,
    String? transmission,
    int? seats,
    String? ownerId,
  }) async {
    return _remote.createVehicle(
      plateNumber: plateNumber,
      brand: brand,
      model: model,
      vin: vin,
      year: year,
      color: color,
      fuelType: fuelType,
      transmission: transmission,
      seats: seats,
      ownerId: ownerId,
    );
  }

  @override
  Future<Vehicle> updateVehicle(String id, Map<String, dynamic> data) async {
    return _remote.updateVehicle(id, data);
  }
}
