import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/api/api_exception.dart';
import '../../domain/repositories/incident_repository.dart';
import 'incidents_state.dart';

class IncidentsCubit extends Cubit<IncidentsState> {
  IncidentsCubit(this._repository) : super(const IncidentsInitial());
  final IncidentRepository _repository;

  Future<void> load({String? status, String? type}) async {
    emit(const IncidentsLoading());
    try {
      final list = await _repository.getIncidents(
          status: status, type: type, page: 1, limit: 50);
      emit(IncidentsLoaded(
          incidents: list, statusFilter: status, typeFilter: type));
    } on ApiException catch (e) {
      emit(IncidentsError(e.message));
    } catch (e) {
      emit(IncidentsError(e.toString()));
    }
  }

  Future<void> refresh() async {
    final cur = state;
    final status = cur is IncidentsLoaded ? cur.statusFilter : null;
    final type = cur is IncidentsLoaded ? cur.typeFilter : null;
    await load(status: status, type: type);
  }

  void filterByStatus(String? status) => load(
      status: status,
      type: state is IncidentsLoaded
          ? (state as IncidentsLoaded).typeFilter
          : null);

  void filterByType(String? type) => load(
      type: type,
      status: state is IncidentsLoaded
          ? (state as IncidentsLoaded).statusFilter
          : null);

  /// Remet les deux filtres à null en un seul appel API.
  void resetFilters() => load();
}
