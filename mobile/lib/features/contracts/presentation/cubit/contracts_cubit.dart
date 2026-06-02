import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/api/api_exception.dart';
import '../../domain/repositories/contract_repository.dart';
import 'contracts_state.dart';

class ContractsCubit extends Cubit<ContractsState> {
  ContractsCubit(this._repository) : super(const ContractsInitial());

  final ContractRepository _repository;

  Future<void> load({String? type}) async {
    emit(const ContractsLoading());
    try {
      final list = await _repository.getContracts(
        type: type,
        page: 1,
        limit: 50,
      );
      emit(ContractsLoaded(contracts: list, typeFilter: type));
    } on ApiException catch (e) {
      emit(ContractsError(e.message));
    } catch (e) {
      emit(ContractsError(e.toString()));
    }
  }

  Future<void> refresh() async {
    final currentFilter =
        state is ContractsLoaded ? (state as ContractsLoaded).typeFilter : null;
    await load(type: currentFilter);
  }

  void filterByType(String? type) {
    load(type: type);
  }
}
