import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/api/api_exception.dart';
import '../../domain/repositories/vehicle_repository.dart';
import 'vehicles_state.dart';

class VehiclesCubit extends Cubit<VehiclesState> {
  VehiclesCubit(this._repository) : super(const VehiclesInitial());

  final VehicleRepository _repository;

  Future<void> load({String? status}) async {
    emit(const VehiclesLoading());
    try {
      final list = await _repository.getVehicles(
        status: status,
        page: 1,
        limit: 50,
      );
      emit(VehiclesLoaded(vehicles: list, statusFilter: status));
    } on ApiException catch (e) {
      emit(VehiclesError(e.message));
    } catch (e) {
      emit(VehiclesError(e.toString()));
    }
  }

  Future<void> refresh() async {
    final currentFilter = state is VehiclesLoaded
        ? (state as VehiclesLoaded).statusFilter
        : null;
    await load(status: currentFilter);
  }

  void filterByStatus(String? status) {
    load(status: status);
  }
}
