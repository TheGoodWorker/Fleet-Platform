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
}
