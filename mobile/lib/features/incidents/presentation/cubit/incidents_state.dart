import 'package:equatable/equatable.dart';
import '../../domain/entities/incident.dart';

sealed class IncidentsState extends Equatable {
  const IncidentsState();
}

class IncidentsInitial extends IncidentsState {
  const IncidentsInitial();
  @override List<Object?> get props => [];
}

class IncidentsLoading extends IncidentsState {
  const IncidentsLoading();
  @override List<Object?> get props => [];
}

class IncidentsLoaded extends IncidentsState {
  const IncidentsLoaded({required this.incidents, this.statusFilter, this.typeFilter});
  final List<Incident> incidents;
  final String? statusFilter;
  final String? typeFilter;
  @override List<Object?> get props => [incidents, statusFilter, typeFilter];
}

class IncidentsError extends IncidentsState {
  const IncidentsError(this.message);
  final String message;
  @override List<Object?> get props => [message];
}
