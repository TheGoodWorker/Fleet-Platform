import '../entities/payment.dart';

abstract class PaymentRepository {
  Future<List<Payment>> getPayments({
    String? contractId,
    String? vehicleId,
    String? driverId,
    int page = 1,
    int limit = 20,
  });

  Future<void> createPayment({
    required String contractId,
    required String vehicleId,
    required String driverId,
    required double amount,
    required String source,
    required String paidAt,
    String? reference,
    String? notes,
  });

  Future<Payment> getPaymentById(String id);
}
