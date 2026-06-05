import 'package:equatable/equatable.dart';

import '../../domain/entities/driver.dart';

sealed class DriverDetailState extends Equatable {
  const DriverDetailState();
}

class DriverDetailInitial extends DriverDetailState {
  const DriverDetailInitial();

  @override
  List<Object?> get props => [];
}

class DriverDetailLoading extends DriverDetailState {
  const DriverDetailLoading();

  @override
  List<Object?> get props => [];
}

class DriverDetailLoaded extends DriverDetailState {
  const DriverDetailLoaded(this.driver);

  final Driver driver;

  @override
  List<Object?> get props => [driver];
}

class DriverDetailError extends DriverDetailState {
  const DriverDetailError(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}

class DriverDetailActionInProgress extends DriverDetailState {
  const DriverDetailActionInProgress({this.driver});

  final Driver? driver;

  @override
  List<Object?> get props => [driver];
}

class DriverDetailActionSuccess extends DriverDetailState {
  const DriverDetailActionSuccess({required this.driver, required this.message});

  final Driver driver;
  final String message;

  @override
  List<Object?> get props => [driver, message];
}

class DriverDetailActionError extends DriverDetailState {
  const DriverDetailActionError({this.driver, required this.message});

  final Driver? driver;
  final String message;

  @override
  List<Object?> get props => [driver, message];
}
