import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../../../../core/api/api_exception.dart';
import '../../../../core/api/response_parser.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/document_model.dart';

abstract class DocumentRemoteDataSource {
  Future<List<DocumentModel>> getDocuments({
    String? status,
    String? entityType,
    String? entityId,
    int page = 1,
    int limit = 20,
  });
}

class DocumentRemoteDataSourceImpl implements DocumentRemoteDataSource {
  const DocumentRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<List<DocumentModel>> getDocuments({
    String? status,
    String? entityType,
    String? entityId,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        ApiConstants.documents,
        queryParameters: {
          if (status != null) 'status': status,
          if (entityType != null) 'entityType': entityType,
          if (entityId != null) 'entityId': entityId,
          'page': page,
          'limit': limit,
        },
      );

      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);

      final body = parseResponseBody(response.data, context: 'DocumentDataSource');
      final rawData = (body['data'] as List?) ?? const <dynamic>[];
      return rawData
          .map((e) => DocumentModel.fromJson(e as Map<String, dynamic>))
          .toList();

    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[DocumentDataSource] Erreur inattendue : $e\n$st');
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
