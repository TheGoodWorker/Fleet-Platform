import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/api/api_exception.dart';
import '../../domain/entities/incident.dart';
import '../../domain/repositories/incident_repository.dart';
import 'incident_detail_state.dart';

class IncidentDetailCubit extends Cubit<IncidentDetailState> {
  IncidentDetailCubit(this._repository) : super(const IncidentDetailInitial());
  final IncidentRepository _repository;

  Incident? get _current => switch (state) {
        IncidentDetailLoaded(:final incident) => incident,
        IncidentDetailActionInProgress(:final incident) => incident,
        IncidentDetailActionSuccess(:final incident) => incident,
        IncidentDetailActionError(:final incident) => incident,
        _ => null,
      };

  Future<void> load(String id) async {
    emit(const IncidentDetailLoading());
    try {
      emit(IncidentDetailLoaded(await _repository.getIncidentById(id)));
    } on ApiException catch (e) {
      emit(IncidentDetailError(e.message));
    } catch (e) {
      emit(IncidentDetailError(e.toString()));
    }
  }

  Future<void> createIncident({
    required String type,
    required String vehicleId,
    required String description,
    required String occurredAt,
    String? driverId,
    String? managerId,
    String? severity,
    String? notes,
    double? locationLat,
    double? locationLng,
  }) async {
    emit(IncidentDetailActionInProgress(incident: _current));
    try {
      final created = await _repository.createIncident(
        type: type, vehicleId: vehicleId, description: description,
        occurredAt: occurredAt, driverId: driverId, managerId: managerId,
        severity: severity, notes: notes,
        locationLat: locationLat, locationLng: locationLng,
      );
      emit(IncidentDetailActionSuccess(
          incident: created, message: 'Incident déclaré avec succès'));
    } on ApiException catch (e) {
      emit(IncidentDetailActionError(incident: _current, message: e.message));
    } catch (e) {
      emit(IncidentDetailActionError(incident: _current, message: e.toString()));
    }
  }

  Future<void> markInProgress() async {
    final current = _current;
    if (current == null) return;
    emit(IncidentDetailActionInProgress(incident: current));
    try {
      final updated = await _repository.markInProgress(current.id);
      emit(IncidentDetailActionSuccess(
          incident: updated, message: 'Incident pris en charge'));
    } on ApiException catch (e) {
      emit(IncidentDetailActionError(incident: current, message: e.message));
    } catch (e) {
      emit(IncidentDetailActionError(incident: current, message: e.toString()));
    }
  }

  Future<void> resolve({String? notes}) async {
    final current = _current;
    if (current == null) return;
    emit(IncidentDetailActionInProgress(incident: current));
    try {
      final updated = await _repository.resolve(current.id, notes: notes);
      emit(IncidentDetailActionSuccess(
          incident: updated, message: 'Incident marqué résolu'));
    } on ApiException catch (e) {
      emit(IncidentDetailActionError(incident: current, message: e.message));
    } catch (e) {
      emit(IncidentDetailActionError(incident: current, message: e.toString()));
    }
  }

  Future<void> closeIncident() async {
    final current = _current;
    if (current == null) return;
    emit(IncidentDetailActionInProgress(incident: current));
    try {
      final updated = await _repository.closeIncident(current.id);
      emit(IncidentDetailActionSuccess(
          incident: updated, message: 'Incident clôturé'));
    } on ApiException catch (e) {
      emit(IncidentDetailActionError(incident: current, message: e.message));
    } catch (e) {
      emit(IncidentDetailActionError(incident: current, message: e.toString()));
    }
  }
}
