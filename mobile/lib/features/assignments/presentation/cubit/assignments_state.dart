import 'package:equatable/equatable.dart';
import '../../domain/entities/assignment.dart';

enum AssignmentContext { vehicle, driver }

sealed class AssignmentsState extends Equatable {
  const AssignmentsState();
}

class AssignmentsInitial extends AssignmentsState {
  const AssignmentsInitial();
  @override
  List<Object?> get props => [];
}

class AssignmentsLoading extends AssignmentsState {
  const AssignmentsLoading();
  @override
  List<Object?> get props => [];
}

class AssignmentsLoaded extends AssignmentsState {
  const AssignmentsLoaded({
    required this.assignments,
    required this.context,
    required this.contextId,
    required this.contextName,
  });

  final List<Assignment> assignments;
  final AssignmentContext context;
  final String contextId;
  final String contextName;

  bool get hasActive => assignments.any((a) => a.isActive);
  Assignment? get activeAssignment =>
      assignments.where((a) => a.isActive).firstOrNull;

  @override
  List<Object?> get props => [assignments, context, contextId, contextName];
}

class AssignmentsError extends AssignmentsState {
  const AssignmentsError(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}

class AssignmentsActionInProgress extends AssignmentsState {
  const AssignmentsActionInProgress({this.previous});
  final AssignmentsLoaded? previous;
  @override
  List<Object?> get props => [previous];
}

class AssignmentsActionSuccess extends AssignmentsState {
  const AssignmentsActionSuccess({
    required this.message,
    required this.loaded,
  });
  final String message;
  final AssignmentsLoaded loaded;
  @override
  List<Object?> get props => [message, loaded];
}

class AssignmentsActionError extends AssignmentsState {
  const AssignmentsActionError({
    required this.message,
    this.previous,
  });
  final String message;
  final AssignmentsLoaded? previous;
  @override
  List<Object?> get props => [message, previous];
}
