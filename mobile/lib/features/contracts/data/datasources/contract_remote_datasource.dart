import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../../../../core/api/api_exception.dart';
import '../../../../core/api/response_parser.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/contract_model.dart';

abstract class ContractRemoteDataSource {
  Future<List<ContractModel>> getContracts({
    String? type,
    int page = 1,
    int limit = 20,
  });
}

class ContractRemoteDataSourceImpl implements ContractRemoteDataSource {
  const ContractRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<List<ContractModel>> getContracts({
    String? type,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        ApiConstants.contracts,
        queryParameters: {
          if (type != null) 'type': type,
          'page': page,
          'limit': limit,
        },
      );

      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);

      final body = parseResponseBody(response.data, context: 'ContractDataSource');
      final rawData = (body['data'] as List?) ?? const <dynamic>[];
      return rawData.map((e) {
        final item = e as Map<String, dynamic>;
        try {
          return ContractModel.fromJson(item);
        } catch (mapErr, mapSt) {
          debugPrint('[ContractDataSource] crash parsing item id=${item['id']} : $mapErr\n$mapSt');
          rethrow;
        }
      }).toList();

    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[ContractDataSource] Erreur inattendue : $e\n$st');
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
