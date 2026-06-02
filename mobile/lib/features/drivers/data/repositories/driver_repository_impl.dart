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
}
