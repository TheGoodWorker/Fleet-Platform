import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/api/api_exception.dart';
import '../../domain/repositories/contract_repository.dart';
import 'contract_detail_state.dart';

class ContractDetailCubit extends Cubit<ContractDetailState> {
  ContractDetailCubit(this._repository) : super(const ContractDetailInitial());

  final ContractRepository _repository;

  Future<void> load(String id) async {
    emit(const ContractDetailLoading());
    try {
      final contract = await _repository.getContractById(id);
      emit(ContractDetailLoaded(contract));
    } on ApiException catch (e) {
      emit(ContractDetailError(e.message));
    } catch (e) {
      emit(ContractDetailError(e.toString()));
    }
  }

  Future<void> createContract({
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
    emit(const ContractDetailActionInProgress());
    try {
      final contract = await _repository.createContract(
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
      emit(ContractDetailActionSuccess(
        contract: contract,
        message: 'Contrat créé',
      ));
    } on ApiException catch (e) {
      emit(ContractDetailActionError(message: e.message));
    } catch (e) {
      emit(ContractDetailActionError(message: e.toString()));
    }
  }

  Future<void> activateContract() async {
    final loaded = _currentLoaded;
    if (loaded == null) return;
    emit(ContractDetailActionInProgress(contract: loaded.contract));
    try {
      await _repository.activateContract(loaded.contract.id);
      final updated = await _repository.getContractById(loaded.contract.id);
      emit(ContractDetailActionSuccess(
        contract: updated,
        message: 'Contrat activé',
      ));
    } on ApiException catch (e) {
      emit(ContractDetailActionError(
        contract: loaded.contract,
        message: e.message,
      ));
    } catch (e) {
      emit(ContractDetailActionError(
        contract: loaded.contract,
        message: e.toString(),
      ));
    }
  }

  Future<void> suspendContract() async {
    final loaded = _currentLoaded;
    if (loaded == null) return;
    emit(ContractDetailActionInProgress(contract: loaded.contract));
    try {
      await _repository.suspendContract(loaded.contract.id);
      final updated = await _repository.getContractById(loaded.contract.id);
      emit(ContractDetailActionSuccess(
        contract: updated,
        message: 'Contrat suspendu',
      ));
    } on ApiException catch (e) {
      emit(ContractDetailActionError(
        contract: loaded.contract,
        message: e.message,
      ));
    } catch (e) {
      emit(ContractDetailActionError(
        contract: loaded.contract,
        message: e.toString(),
      ));
    }
  }

  Future<void> closeContract() async {
    final loaded = _currentLoaded;
    if (loaded == null) return;
    emit(ContractDetailActionInProgress(contract: loaded.contract));
    try {
      await _repository.closeContract(loaded.contract.id);
      final updated = await _repository.getContractById(loaded.contract.id);
      emit(ContractDetailActionSuccess(
        contract: updated,
        message: 'Contrat clôturé',
      ));
    } on ApiException catch (e) {
      emit(ContractDetailActionError(
        contract: loaded.contract,
        message: e.message,
      ));
    } catch (e) {
      emit(ContractDetailActionError(
        contract: loaded.contract,
        message: e.toString(),
      ));
    }
  }

  /// Returns the last [ContractDetailLoaded] state if available,
  /// including when current state is ActionInProgress/ActionError preserving contract.
  ContractDetailLoaded? get _currentLoaded {
    final s = state;
    if (s is ContractDetailLoaded) return s;
    if (s is ContractDetailActionInProgress && s.contract != null) {
      return ContractDetailLoaded(s.contract!);
    }
    if (s is ContractDetailActionError && s.contract != null) {
      return ContractDetailLoaded(s.contract!);
    }
    if (s is ContractDetailActionSuccess) {
      return ContractDetailLoaded(s.contract);
    }
    return null;
  }
}
