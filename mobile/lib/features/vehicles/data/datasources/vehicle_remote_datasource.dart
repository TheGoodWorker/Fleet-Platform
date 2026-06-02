import 'package:dio/dio.dart';

import '../../../../core/api/api_exception.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/vehicle_model.dart';

abstract class VehicleRemoteDataSource {
  Future<List<VehicleModel>> getVehicles({
    String? status,
    int page = 1,
    int limit = 20,
  });
}

class VehicleRemoteDataSourceImpl implements VehicleRemoteDataSource {
  const VehicleRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<List<VehicleModel>> getVehicles({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get(
        ApiConstants.vehicles,
        queryParameters: {
          if (status != null) 'status': status,
          'page': page,
          'limit': limit,
        },
      );

      // Vérification explicite du code HTTP — nécessaire car validateStatus
      // par défaut ne couvre pas les cas où Dio reçoit un 4xx sans lever.
      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) {
        throw ServerException(statusCode);
      }

      final body = response.data as Map<String, dynamic>? ?? {};
      final rawData = (body['data'] as List?) ?? const <dynamic>[];
      return rawData
          .map((e) => VehicleModel.fromJson(e as Map<String, dynamic>))
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
