import '../entities/contract.dart';

abstract class ContractRepository {
  Future<List<Contract>> getContracts({
    String? type,
    int page = 1,
    int limit = 20,
  });

  Future<Contract> getContractById(String id);

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
  });

  Future<Contract> activateContract(String id);

  Future<Contract> suspendContract(String id);

  Future<Contract> closeContract(String id);
}
