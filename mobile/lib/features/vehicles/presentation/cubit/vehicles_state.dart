import 'package:equatable/equatable.dart';

import '../../domain/entities/vehicle.dart';

sealed class VehiclesState extends Equatable {
  const VehiclesState();
}

class VehiclesInitial extends VehiclesState {
  const VehiclesInitial();

  @override
  List<Object?> get props => [];
}

class VehiclesLoading extends VehiclesState {
  const VehiclesLoading();

  @override
  List<Object?> get props => [];
}

class VehiclesLoaded extends VehiclesState {
  const VehiclesLoaded({
    required this.vehicles,
    this.statusFilter,
  });

  final List<Vehicle> vehicles;
  final String? statusFilter;

  @override
  List<Object?> get props => [vehicles, statusFilter];
}

class VehiclesError extends VehiclesState {
  const VehiclesError(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}
