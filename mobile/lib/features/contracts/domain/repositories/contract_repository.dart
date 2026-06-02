import '../entities/contract.dart';

abstract class ContractRepository {
  Future<List<Contract>> getContracts({
    String? type,
    int page = 1,
    int limit = 20,
  });
}
