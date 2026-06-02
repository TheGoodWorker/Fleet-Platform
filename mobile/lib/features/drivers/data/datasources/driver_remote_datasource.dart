import 'package:dio/dio.dart';

import '../../../../core/api/api_exception.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/driver_model.dart';

abstract class DriverRemoteDataSource {
  Future<List<DriverModel>> getDrivers({
    String? status,
    int page = 1,
    int limit = 20,
  });
}

class DriverRemoteDataSourceImpl implements DriverRemoteDataSource {
  const DriverRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<List<DriverModel>> getDrivers({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        ApiConstants.drivers,
        queryParameters: {
          if (status != null) 'status': status,
          'page': page,
          'limit': limit,
        },
      );

      final body = response.data as Map<String, dynamic>;
      final data = body['data'] as List<dynamic>;
      return data
          .map((e) => DriverModel.fromJson(e as Map<String, dynamic>))
          .toList();
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
