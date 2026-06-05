import 'package:equatable/equatable.dart';
import '../../domain/entities/vehicle.dart';

sealed class VehicleDetailState extends Equatable {
  const VehicleDetailState();
}

class VehicleDetailInitial extends VehicleDetailState {
  const VehicleDetailInitial();
  @override
  List<Object?> get props => [];
}

class VehicleDetailLoading extends VehicleDetailState {
  const VehicleDetailLoading();
  @override
  List<Object?> get props => [];
}

class VehicleDetailLoaded extends VehicleDetailState {
  const VehicleDetailLoaded(this.vehicle);
  final Vehicle vehicle;
  @override
  List<Object?> get props => [vehicle];
}

class VehicleDetailError extends VehicleDetailState {
  const VehicleDetailError(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}

class VehicleDetailActionInProgress extends VehicleDetailState {
  const VehicleDetailActionInProgress({this.vehicle});
  final Vehicle? vehicle;
  @override
  List<Object?> get props => [vehicle];
}

class VehicleDetailActionSuccess extends VehicleDetailState {
  const VehicleDetailActionSuccess({required this.vehicle, required this.message});
  final Vehicle vehicle;
  final String message;
  @override
  List<Object?> get props => [vehicle, message];
}

class VehicleDetailActionError extends VehicleDetailState {
  const VehicleDetailActionError({this.vehicle, required this.message});
  final Vehicle? vehicle;
  final String message;
  @override
  List<Object?> get props => [vehicle, message];
}
