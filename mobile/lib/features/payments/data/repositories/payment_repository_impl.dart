import '../../domain/entities/payment.dart';
import '../../domain/repositories/payment_repository.dart';
import '../datasources/payment_remote_datasource.dart';

class PaymentRepositoryImpl implements PaymentRepository {
  const PaymentRepositoryImpl(this._remote);

  final PaymentRemoteDataSource _remote;

  @override
  Future<List<Payment>> getPayments({
    String? contractId,
    String? vehicleId,
    String? driverId,
    int page = 1,
    int limit = 20,
  }) async {
    return _remote.getPayments(
      contractId: contractId,
      vehicleId: vehicleId,
      driverId: driverId,
      page: page,
      limit: limit,
    );
  }

  @override
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
    return _remote.createPayment(
      contractId: contractId,
      vehicleId: vehicleId,
      driverId: driverId,
      amount: amount,
      source: source,
      paidAt: paidAt,
      reference: reference,
      notes: notes,
    );
  }
}
