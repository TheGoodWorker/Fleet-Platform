import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/api/api_exception.dart';
import '../../domain/repositories/driver_repository.dart';
import 'drivers_state.dart';

class DriversCubit extends Cubit<DriversState> {
  DriversCubit(this._repository) : super(const DriversInitial());

  final DriverRepository _repository;

  Future<void> load({String? status}) async {
    emit(const DriversLoading());
    try {
      final list = await _repository.getDrivers(
        status: status,
        page: 1,
        limit: 50,
      );
      emit(DriversLoaded(drivers: list, statusFilter: status));
    } on ApiException catch (e) {
      emit(DriversError(e.message));
    } catch (e) {
      emit(DriversError(e.toString()));
    }
  }

  Future<void> refresh() async {
    final currentFilter = state is DriversLoaded
        ? (state as DriversLoaded).statusFilter
        : null;
    await load(status: currentFilter);
  }

  void filterByStatus(String? status) {
    load(status: status);
  }
}
