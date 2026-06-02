import 'package:equatable/equatable.dart';

import '../../domain/entities/driver.dart';

sealed class DriversState extends Equatable {
  const DriversState();
}

class DriversInitial extends DriversState {
  const DriversInitial();

  @override
  List<Object?> get props => [];
}

class DriversLoading extends DriversState {
  const DriversLoading();

  @override
  List<Object?> get props => [];
}

class DriversLoaded extends DriversState {
  const DriversLoaded({
    required this.drivers,
    this.statusFilter,
  });

  final List<Driver> drivers;
  final String? statusFilter;

  @override
  List<Object?> get props => [drivers, statusFilter];
}

class DriversError extends DriversState {
  const DriversError(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}
