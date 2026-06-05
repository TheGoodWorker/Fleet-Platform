import 'package:equatable/equatable.dart';

import '../../domain/entities/contract.dart';

sealed class ContractDetailState extends Equatable {
  const ContractDetailState();
}

class ContractDetailInitial extends ContractDetailState {
  const ContractDetailInitial();

  @override
  List<Object?> get props => [];
}

class ContractDetailLoading extends ContractDetailState {
  const ContractDetailLoading();

  @override
  List<Object?> get props => [];
}

class ContractDetailLoaded extends ContractDetailState {
  const ContractDetailLoaded(this.contract);

  final Contract contract;

  @override
  List<Object?> get props => [contract];
}

class ContractDetailError extends ContractDetailState {
  const ContractDetailError(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}

class ContractDetailActionInProgress extends ContractDetailState {
  const ContractDetailActionInProgress({this.contract});

  final Contract? contract;

  @override
  List<Object?> get props => [contract];
}

class ContractDetailActionSuccess extends ContractDetailState {
  const ContractDetailActionSuccess({
    required this.contract,
    required this.message,
  });

  final Contract contract;
  final String message;

  @override
  List<Object?> get props => [contract, message];
}

class ContractDetailActionError extends ContractDetailState {
  const ContractDetailActionError({
    this.contract,
    required this.message,
  });

  final Contract? contract;
  final String message;

  @override
  List<Object?> get props => [contract, message];
}
