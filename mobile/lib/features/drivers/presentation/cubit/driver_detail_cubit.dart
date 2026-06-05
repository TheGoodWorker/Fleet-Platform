import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/api/api_exception.dart';
import '../../domain/repositories/driver_repository.dart';
import 'driver_detail_state.dart';

class DriverDetailCubit extends Cubit<DriverDetailState> {
  DriverDetailCubit(this._repository) : super(const DriverDetailInitial());

  final DriverRepository _repository;

  Future<void> load(String id) async {
    emit(const DriverDetailLoading());
    try {
      final driver = await _repository.getDriverById(id);
      emit(DriverDetailLoaded(driver));
    } on ApiException catch (e) {
      emit(DriverDetailError(e.message));
    } catch (e) {
      emit(DriverDetailError(e.toString()));
    }
  }

  Future<void> createDriver({
    required String userId,
    String? idCardNumber,
    String? licenseNumber,
    String? address,
    String? emergencyContact,
  }) async {
    emit(const DriverDetailActionInProgress());
    try {
      final driver = await _repository.createDriver(
        userId: userId,
        idCardNumber: idCardNumber,
        licenseNumber: licenseNumber,
        address: address,
        emergencyContact: emergencyContact,
      );
      emit(DriverDetailActionSuccess(driver: driver, message: 'Chauffeur créé avec succès'));
    } on ApiException catch (e) {
      emit(DriverDetailActionError(message: e.message));
    } catch (e) {
      emit(DriverDetailActionError(message: e.toString()));
    }
  }

  Future<void> updateDriver(String id, Map<String, dynamic> data) async {
    final loaded = state is DriverDetailLoaded ? (state as DriverDetailLoaded) : null;
    emit(DriverDetailActionInProgress(driver: loaded?.driver));
    try {
      final driver = await _repository.updateDriver(id, data);
      emit(DriverDetailActionSuccess(driver: driver, message: 'Chauffeur mis à jour avec succès'));
    } on ApiException catch (e) {
      emit(DriverDetailActionError(driver: loaded?.driver, message: e.message));
    } catch (e) {
      emit(DriverDetailActionError(driver: loaded?.driver, message: e.toString()));
    }
  }

  Future<void> validateKyc() async {
    final loaded = state is DriverDetailLoaded ? (state as DriverDetailLoaded) : null;
    if (loaded == null) return;
    emit(DriverDetailActionInProgress(driver: loaded.driver));
    try {
      await _repository.validateKyc(loaded.driver.id);
      final updated = await _repository.getDriverById(loaded.driver.id);
      emit(DriverDetailActionSuccess(driver: updated, message: 'KYC validé avec succès'));
    } on ApiException catch (e) {
      emit(DriverDetailActionError(driver: loaded.driver, message: e.message));
    } catch (e) {
      emit(DriverDetailActionError(driver: loaded.driver, message: e.toString()));
    }
  }

  Future<void> validateField() async {
    final loaded = state is DriverDetailLoaded ? (state as DriverDetailLoaded) : null;
    if (loaded == null) return;
    emit(DriverDetailActionInProgress(driver: loaded.driver));
    try {
      await _repository.validateField(loaded.driver.id);
      final updated = await _repository.getDriverById(loaded.driver.id);
      emit(DriverDetailActionSuccess(driver: updated, message: 'Validation terrain effectuée'));
    } on ApiException catch (e) {
      emit(DriverDetailActionError(driver: loaded.driver, message: e.message));
    } catch (e) {
      emit(DriverDetailActionError(driver: loaded.driver, message: e.toString()));
    }
  }
}
