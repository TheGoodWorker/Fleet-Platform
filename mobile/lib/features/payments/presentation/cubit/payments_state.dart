import 'package:equatable/equatable.dart';

import '../../domain/entities/payment.dart';

sealed class PaymentsState extends Equatable {
  const PaymentsState();
}

class PaymentsInitial extends PaymentsState {
  const PaymentsInitial();

  @override
  List<Object?> get props => [];
}

class PaymentsLoading extends PaymentsState {
  const PaymentsLoading();

  @override
  List<Object?> get props => [];
}

class PaymentsLoaded extends PaymentsState {
  const PaymentsLoaded(this.payments);

  final List<Payment> payments;

  @override
  List<Object?> get props => [payments];
}

class PaymentsError extends PaymentsState {
  const PaymentsError(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}

class PaymentsCreating extends PaymentsState {
  const PaymentsCreating(this.payments);

  /// On conserve la liste courante pendant la création pour ne pas perdre l'UI
  final List<Payment> payments;

  @override
  List<Object?> get props => [payments];
}

class PaymentsCreated extends PaymentsState {
  const PaymentsCreated(this.payments);

  final List<Payment> payments;

  @override
  List<Object?> get props => [payments];
}

class PaymentsCreateError extends PaymentsState {
  const PaymentsCreateError({
    required this.message,
    required this.payments,
  });

  final String message;
  final List<Payment> payments;

  @override
  List<Object?> get props => [message, payments];
}
