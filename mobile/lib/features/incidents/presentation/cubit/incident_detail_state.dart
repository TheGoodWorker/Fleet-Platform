import 'package:equatable/equatable.dart';
import '../../domain/entities/incident.dart';

sealed class IncidentDetailState extends Equatable {
  const IncidentDetailState();
}

class IncidentDetailInitial extends IncidentDetailState {
  const IncidentDetailInitial();
  @override List<Object?> get props => [];
}

class IncidentDetailLoading extends IncidentDetailState {
  const IncidentDetailLoading();
  @override List<Object?> get props => [];
}

class IncidentDetailLoaded extends IncidentDetailState {
  const IncidentDetailLoaded(this.incident);
  final Incident incident;
  @override List<Object?> get props => [incident];
}

class IncidentDetailError extends IncidentDetailState {
  const IncidentDetailError(this.message);
  final String message;
  @override List<Object?> get props => [message];
}

class IncidentDetailActionInProgress extends IncidentDetailState {
  const IncidentDetailActionInProgress({this.incident});
  final Incident? incident;
  @override List<Object?> get props => [incident];
}

class IncidentDetailActionSuccess extends IncidentDetailState {
  const IncidentDetailActionSuccess(
      {required this.incident, required this.message});
  final Incident incident;
  final String message;
  @override List<Object?> get props => [incident, message];
}

class IncidentDetailActionError extends IncidentDetailState {
  const IncidentDetailActionError({this.incident, required this.message});
  final Incident? incident;
  final String message;
  @override List<Object?> get props => [incident, message];
}
