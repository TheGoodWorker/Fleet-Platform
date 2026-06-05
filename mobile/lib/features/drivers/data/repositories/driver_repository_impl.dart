import '../../domain/entities/driver.dart';
import '../../domain/repositories/driver_repository.dart';
import '../datasources/driver_remote_datasource.dart';

class DriverRepositoryImpl implements DriverRepository {
  const DriverRepositoryImpl(this._remote);

  final DriverRemoteDataSource _remote;

  @override
  Future<List<Driver>> getDrivers({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    return _remote.getDrivers(status: status, page: page, limit: limit);
  }

  @override
  Future<Driver> getDriverById(String id) async {
    return _remote.getDriverById(id);
  }

  @override
  Future<Driver> createDriver({
    required String userId,
    String? idCardNumber,
    String? licenseNumber,
    String? address,
    String? emergencyContact,
  }) async {
    return _remote.createDriver(
      userId: userId,
      idCardNumber: idCardNumber,
      licenseNumber: licenseNumber,
      address: address,
      emergencyContact: emergencyContact,
    );
  }

  @override
  Future<Driver> updateDriver(String id, Map<String, dynamic> data) async {
    return _remote.updateDriver(id, data);
  }

  @override
  Future<void> validateKyc(String id) async {
    return _remote.validateKyc(id);
  }

  @override
  Future<void> validateField(String id) async {
    return _remote.validateField(id);
  }
}
