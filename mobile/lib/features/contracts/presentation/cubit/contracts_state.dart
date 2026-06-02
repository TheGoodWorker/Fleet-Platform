import 'package:equatable/equatable.dart';

import '../../domain/entities/contract.dart';

sealed class ContractsState extends Equatable {
  const ContractsState();
}

class ContractsInitial extends ContractsState {
  const ContractsInitial();

  @override
  List<Object?> get props => [];
}

class ContractsLoading extends ContractsState {
  const ContractsLoading();

  @override
  List<Object?> get props => [];
}

class ContractsLoaded extends ContractsState {
  const ContractsLoaded({
    required this.contracts,
    this.typeFilter,
  });

  final List<Contract> contracts;
  final String? typeFilter;

  @override
  List<Object?> get props => [contracts, typeFilter];
}

class ContractsError extends ContractsState {
  const ContractsError(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}
