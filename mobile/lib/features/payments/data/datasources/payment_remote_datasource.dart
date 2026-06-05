import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../../../../core/api/api_exception.dart';
import '../../../../core/api/response_parser.dart';
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

  Future<PaymentModel> getPaymentById(String id);
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

      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);

      final body = parseResponseBody(response.data, context: 'PaymentDataSource');
      final rawData = (body['data'] as List?) ?? const <dynamic>[];
      return rawData.map((e) {
        final item = e as Map<String, dynamic>;
        try {
          return PaymentModel.fromJson(item);
        } catch (mapErr, mapSt) {
          debugPrint('[PaymentDataSource] crash parsing item id=${item['id']} : $mapErr\n$mapSt');
          rethrow;
        }
      }).toList();

    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[PaymentDataSource] Erreur inattendue : $e\n$st');
      throw UnknownException(e.toString());
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
          if (reference != null && reference.isNotEmpty) 'reference': reference,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
        },
      );
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[PaymentDataSource] Erreur inattendue (create) : $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  @override
  Future<PaymentModel> getPaymentById(String id) async {
    try {
      final response = await _dio.get(ApiConstants.paymentById(id));
      final body = parseResponseBody(response.data, context: 'PaymentDataSource.getById');
      final obj = (body['data'] as Map<String, dynamic>?) ?? body;
      return PaymentModel.fromJson(obj);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[PaymentDataSource] Erreur inattendue : $e\n$st');
      throw UnknownException(e.toString());
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
