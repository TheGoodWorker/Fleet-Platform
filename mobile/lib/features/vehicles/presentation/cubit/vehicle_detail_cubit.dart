import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/api/api_exception.dart';
import '../../domain/repositories/vehicle_repository.dart';
import 'vehicle_detail_state.dart';

class VehicleDetailCubit extends Cubit<VehicleDetailState> {
  VehicleDetailCubit(this._repository) : super(const VehicleDetailInitial());
  final VehicleRepository _repository;

  Future<void> load(String id) async {
    emit(const VehicleDetailLoading());
    try {
      final v = await _repository.getVehicleById(id);
      emit(VehicleDetailLoaded(v));
    } on ApiException catch (e) {
      emit(VehicleDetailError(e.message));
    } catch (e) {
      emit(VehicleDetailError(e.toString()));
    }
  }

  Future<void> createVehicle({
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
    final current = state is VehicleDetailLoaded ? (state as VehicleDetailLoaded).vehicle : null;
    emit(VehicleDetailActionInProgress(vehicle: current));
    try {
      final v = await _repository.createVehicle(
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
      emit(VehicleDetailActionSuccess(vehicle: v, message: 'Véhicule créé avec succès'));
    } on ApiException catch (e) {
      emit(VehicleDetailActionError(vehicle: current, message: e.message));
    } catch (e) {
      emit(VehicleDetailActionError(vehicle: current, message: e.toString()));
    }
  }

  Future<void> updateVehicle(String id, Map<String, dynamic> data) async {
    final current = state is VehicleDetailLoaded ? (state as VehicleDetailLoaded).vehicle : null;
    emit(VehicleDetailActionInProgress(vehicle: current));
    try {
      final v = await _repository.updateVehicle(id, data);
      emit(VehicleDetailActionSuccess(vehicle: v, message: 'Véhicule mis à jour'));
    } on ApiException catch (e) {
      emit(VehicleDetailActionError(vehicle: current, message: e.message));
    } catch (e) {
      emit(VehicleDetailActionError(vehicle: current, message: e.toString()));
    }
  }
}
