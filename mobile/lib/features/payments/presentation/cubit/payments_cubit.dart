import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/api/api_exception.dart';
import '../../domain/entities/payment.dart';
import '../../domain/repositories/payment_repository.dart';
import 'payments_state.dart';

class PaymentsCubit extends Cubit<PaymentsState> {
  PaymentsCubit(this._repository) : super(const PaymentsInitial());

  final PaymentRepository _repository;

  Future<void> load({
    String? contractId,
    String? vehicleId,
    String? driverId,
  }) async {
    emit(const PaymentsLoading());
    try {
      final list = await _repository.getPayments(
        contractId: contractId,
        vehicleId: vehicleId,
        driverId: driverId,
        page: 1,
        limit: 50,
      );
      emit(PaymentsLoaded(list));
    } on ApiException catch (e) {
      emit(PaymentsError(e.message));
    } catch (e) {
      emit(PaymentsError(e.toString()));
    }
  }

  Future<void> refresh() async {
    await load();
  }

  Future<void> createPayment({
    required String contractId,
    required String vehicleId,
    required String driverId,
    required double amount,
    required String source,
    required String paidAt,
    String? reference,
    String? notes,
  }) async {
    final currentPayments = _currentPayments();
    emit(PaymentsCreating(currentPayments));

    try {
      await _repository.createPayment(
        contractId: contractId,
        vehicleId: vehicleId,
        driverId: driverId,
        amount: amount,
        source: source,
        paidAt: paidAt,
        reference: reference,
        notes: notes,
      );

      // Recharge la liste complète après création
      final updated = await _repository.getPayments(page: 1, limit: 50);
      emit(PaymentsCreated(updated));
    } on ApiException catch (e) {
      emit(PaymentsCreateError(message: e.message, payments: currentPayments));
    } catch (e) {
      emit(PaymentsCreateError(
          message: e.toString(), payments: currentPayments));
    }
  }

  List<Payment> _currentPayments() {
    return switch (state) {
      PaymentsLoaded(:final payments) => payments,
      PaymentsCreating(:final payments) => payments,
      PaymentsCreated(:final payments) => payments,
      PaymentsCreateError(:final payments) => payments,
      _ => const [],
    };
  }
}
