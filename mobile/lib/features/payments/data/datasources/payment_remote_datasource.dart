import 'package:dio/dio.dart';

import '../../../../core/api/api_exception.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/payment_model.dart';

abstract class PaymentRemoteDataSource {
  Future<List<PaymentModel>> getPayments({
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
}

class PaymentRemoteDataSourceImpl implements PaymentRemoteDataSource {
  const PaymentRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<List<PaymentModel>> getPayments({
    String? contractId,
    String? vehicleId,
    String? driverId,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        ApiConstants.payments,
        queryParameters: {
          if (contractId != null) 'contractId': contractId,
          if (vehicleId != null) 'vehicleId': vehicleId,
          if (driverId != null) 'driverId': driverId,
          'page': page,
          'limit': limit,
        },
      );

      final body = response.data as Map<String, dynamic>;
      final data = body['data'] as List<dynamic>;
      return data
          .map((e) => PaymentModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      if (e.error is ApiException) rethrow;
      throw _handleDioError(e);
    }
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
    try {
      await _dio.post(
        ApiConstants.payments,
        data: {
          'contractId': contractId,
          'vehicleId': vehicleId,
          'driverId': driverId,
          'amount': amount,
          'source': source,
          'paidAt': paidAt,
          if (reference != null && reference.isNotEmpty)
            'reference': reference,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
        },
      );
    } on DioException catch (e) {
      if (e.error is ApiException) rethrow;
      throw _handleDioError(e);
    }
  }

  ApiException _handleDioError(DioException e) {
    if (e.error is ApiException) return e.error as ApiException;
    return switch (e.response?.statusCode) {
      null => const NetworkException(),
      401 => const UnauthorizedException(),
      403 => const ForbiddenException(),
      429 => const TooManyRequestsException(),
      final code when code >= 500 => ServerException(code),
      _ => const NetworkException(),
    };
  }
}
