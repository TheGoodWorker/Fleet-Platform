import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../../../../core/api/api_exception.dart';
import '../../../../core/api/response_parser.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/vehicle_model.dart';

abstract class VehicleRemoteDataSource {
  Future<List<VehicleModel>> getVehicles({
    String? status,
    int page = 1,
    int limit = 20,
  });

  Future<VehicleModel> getVehicleById(String id);

  Future<VehicleModel> createVehicle({
    required String plateNumber,
    required String brand,
    required String model,
    String? vin,
    int? year,
    String? color,
    String? fuelType,
    String? transmission,
    int? seats,
    String? ownerId,
  });

  Future<VehicleModel> updateVehicle(String id, Map<String, dynamic> data);
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

      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);

      final body = parseResponseBody(response.data, context: 'VehicleDataSource');
      final rawData = (body['data'] as List?) ?? const <dynamic>[];
      return rawData.map((e) {
        final item = e as Map<String, dynamic>;
        try {
          return VehicleModel.fromJson(item);
        } catch (mapErr, mapSt) {
          debugPrint('[VehicleDataSource] crash parsing item id=${item['id']} : $mapErr\n$mapSt');
          rethrow;
        }
      }).toList();

    } on ApiException {
      // Les ApiException déjà typées (UnauthorizedException, etc.) remontent
      // directement au cubit sans modification.
      rethrow;
    } on DioException catch (e) {
      // Phase 8-E : extraire l'ApiException encapsulée par AuthInterceptor plutôt
      // que de relancer le DioException wrapper — sinon le cubit ne peut pas
      // le capturer avec `on ApiException catch`.
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[VehicleDataSource] Erreur inattendue : $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  @override
  Future<VehicleModel> getVehicleById(String id) async {
    try {
      final response = await _dio.get(ApiConstants.vehicleById(id));

      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);

      final body = parseResponseBody(response.data, context: 'VehicleDataSource.getVehicleById');
      final obj = (body['data'] as Map<String, dynamic>?) ?? body;
      return VehicleModel.fromJson(obj);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[VehicleDataSource] Erreur inattendue : $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  @override
  Future<VehicleModel> createVehicle({
    required String plateNumber,
    required String brand,
    required String model,
    String? vin,
    int? year,
    String? color,
    String? fuelType,
    String? transmission,
    int? seats,
    String? ownerId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.vehicles,
        data: {
          'plateNumber': plateNumber,
          'brand': brand,
          'model': model,
          if (vin != null) 'vin': vin,
          if (year != null) 'year': year,
          if (color != null) 'color': color,
          if (fuelType != null) 'fuelType': fuelType,
          if (transmission != null) 'transmission': transmission,
          if (seats != null) 'seats': seats,
          if (ownerId != null) 'ownerId': ownerId,
        },
      );

      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);

      final body = parseResponseBody(response.data, context: 'VehicleDataSource.createVehicle');
      final obj = (body['data'] as Map<String, dynamic>?) ?? body;
      return VehicleModel.fromJson(obj);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[VehicleDataSource] Erreur inattendue : $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  @override
  Future<VehicleModel> updateVehicle(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch(
        ApiConstants.vehicleById(id),
        data: data,
      );

      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);

      final body = parseResponseBody(response.data, context: 'VehicleDataSource.updateVehicle');
      final obj = (body['data'] as Map<String, dynamic>?) ?? body;
      return VehicleModel.fromJson(obj);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[VehicleDataSource] Erreur inattendue : $e\n$st');
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
