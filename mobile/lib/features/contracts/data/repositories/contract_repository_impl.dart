import '../../domain/entities/contract.dart';
import '../../domain/repositories/contract_repository.dart';
import '../datasources/contract_remote_datasource.dart';

class ContractRepositoryImpl implements ContractRepository {
  const ContractRepositoryImpl(this._remote);

  final ContractRemoteDataSource _remote;

  @override
  Future<List<Contract>> getContracts({
    String? type,
    int page = 1,
    int limit = 20,
  }) async {
    return _remote.getContracts(type: type, page: page, limit: limit);
  }

  @override
  Future<Contract> getContractById(String id) async {
    return _remote.getContractById(id);
  }

  @override
  Future<Contract> createContract({
    required String type,
    required String vehicleId,
    required String managerId,
    String? driverId,
    String? ownerId,
    required double dailyAmount,
    int? targetDays,
    int? restDay,
    double? simpleRentalMonthlyAmount,
    String? ownerPaymentFrequency,
    String? notes,
  }) async {
    return _remote.createContract(
      type: type,
      vehicleId: vehicleId,
      managerId: managerId,
      driverId: driverId,
      ownerId: ownerId,
      dailyAmount: dailyAmount,
      targetDays: targetDays,
      restDay: restDay,
      simpleRentalMonthlyAmount: simpleRentalMonthlyAmount,
      ownerPaymentFrequency: ownerPaymentFrequency,
      notes: notes,
    );
  }

  @override
  Future<Contract> activateContract(String id) async {
    return _remote.activateContract(id);
  }

  @override
  Future<Contract> suspendContract(String id) async {
    return _remote.suspendContract(id);
  }

  @override
  Future<Contract> closeContract(String id) async {
    return _remote.closeContract(id);
  }
}
