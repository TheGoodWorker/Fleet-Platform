import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/api/api_exception.dart';
import '../../domain/repositories/assignment_repository.dart';
import 'assignments_state.dart';

class AssignmentsCubit extends Cubit<AssignmentsState> {
  AssignmentsCubit(this._repository) : super(const AssignmentsInitial());
  final AssignmentRepository _repository;

  AssignmentsLoaded? get _current {
    return switch (state) {
      AssignmentsLoaded() => state as AssignmentsLoaded,
      AssignmentsActionInProgress(:final previous) => previous,
      AssignmentsActionSuccess(:final loaded) => loaded,
      AssignmentsActionError(:final previous) => previous,
      _ => null,
    };
  }

  void reset() => emit(const AssignmentsInitial());

  Future<void> loadForVehicle(String vehicleId, {String? vehicleName}) async {
    emit(const AssignmentsLoading());
    try {
      final list = await _repository.getVehicleAssignments(vehicleId);
      emit(AssignmentsLoaded(
        assignments: list,
        context: AssignmentContext.vehicle,
        contextId: vehicleId,
        contextName: vehicleName ?? vehicleId,
      ));
    } on ApiException catch (e) {
      emit(AssignmentsError(e.message));
    } catch (e) {
      emit(AssignmentsError(e.toString()));
    }
  }

  Future<void> loadForDriver(String driverId, {String? driverName}) async {
    emit(const AssignmentsLoading());
    try {
      final list = await _repository.getDriverAssignments(driverId);
      emit(AssignmentsLoaded(
        assignments: list,
        context: AssignmentContext.driver,
        contextId: driverId,
        contextName: driverName ?? driverId,
      ));
    } on ApiException catch (e) {
      emit(AssignmentsError(e.message));
    } catch (e) {
      emit(AssignmentsError(e.toString()));
    }
  }

  Future<void> refresh() async {
    final cur = _current;
    if (cur == null) return;
    if (cur.context == AssignmentContext.vehicle) {
      await loadForVehicle(cur.contextId, vehicleName: cur.contextName);
    } else {
      await loadForDriver(cur.contextId, driverName: cur.contextName);
    }
  }

  Future<void> assignDriver({
    required String vehicleId,
    required String driverId,
    String? notes,
  }) async {
    final cur = _current;
    emit(AssignmentsActionInProgress(previous: cur));
    try {
      await _repository.assignDriver(
        vehicleId: vehicleId,
        driverId: driverId,
        notes: notes,
      );
      final list = await _repository.getVehicleAssignments(vehicleId);
      final refreshed = AssignmentsLoaded(
        assignments: list,
        context: AssignmentContext.vehicle,
        contextId: vehicleId,
        contextName: cur?.contextName ?? vehicleId,
      );
      emit(AssignmentsActionSuccess(
        message: 'Chauffeur affecté avec succès',
        loaded: refreshed,
      ));
    } on ApiException catch (e) {
      emit(AssignmentsActionError(message: e.message, previous: cur));
    } catch (e) {
      emit(AssignmentsActionError(message: e.toString(), previous: cur));
    }
  }

  Future<void> unassignDriver(String vehicleId) async {
    final cur = _current;
    emit(AssignmentsActionInProgress(previous: cur));
    try {
      await _repository.unassignDriver(vehicleId);
      final list = await _repository.getVehicleAssignments(vehicleId);
      final refreshed = AssignmentsLoaded(
        assignments: list,
        context: AssignmentContext.vehicle,
        contextId: vehicleId,
        contextName: cur?.contextName ?? vehicleId,
      );
      emit(AssignmentsActionSuccess(
        message: 'Affectation terminée',
        loaded: refreshed,
      ));
    } on ApiException catch (e) {
      emit(AssignmentsActionError(message: e.message, previous: cur));
    } catch (e) {
      emit(AssignmentsActionError(message: e.toString(), previous: cur));
    }
  }
}
