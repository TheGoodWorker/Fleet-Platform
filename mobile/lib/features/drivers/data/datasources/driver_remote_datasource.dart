import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../../../../core/api/api_exception.dart';
import '../../../../core/api/response_parser.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/driver_model.dart';

abstract class DriverRemoteDataSource {
  Future<List<DriverModel>> getDrivers({
    String? status,
    int page = 1,
    int limit = 20,
  });
  Future<DriverModel> getDriverById(String id);
  Future<DriverModel> createDriver({
    required String userId,
    String? idCardNumber,
    String? licenseNumber,
    String? address,
    String? emergencyContact,
  });
  Future<DriverModel> updateDriver(String id, Map<String, dynamic> data);
  Future<void> validateKyc(String id);
  Future<void> validateField(String id);
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

      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);

      final body = parseResponseBody(response.data, context: 'DriverDataSource');
      final rawData = (body['data'] as List?) ?? const <dynamic>[];
      return rawData.map((e) {
        final item = e as Map<String, dynamic>;
        try {
          return DriverModel.fromJson(item);
        } catch (mapErr, mapSt) {
          debugPrint('[DriverDataSource] crash parsing item id=${item['id']} : $mapErr\n$mapSt');
          rethrow;
        }
      }).toList();

    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[DriverDataSource] Erreur inattendue : $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  @override
  Future<DriverModel> getDriverById(String id) async {
    try {
      final response = await _dio.get(ApiConstants.driverById(id));

      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);

      final body = parseResponseBody(response.data, context: 'DriverDataSource.getDriverById');
      final obj = (body['data'] as Map<String, dynamic>?) ?? body;
      return DriverModel.fromJson(obj);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[DriverDataSource] Erreur inattendue : $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  @override
  Future<DriverModel> createDriver({
    required String userId,
    String? idCardNumber,
    String? licenseNumber,
    String? address,
    String? emergencyContact,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.drivers,
        data: {
          'userId': userId,
          if (idCardNumber != null) 'idCardNumber': idCardNumber,
          if (licenseNumber != null) 'licenseNumber': licenseNumber,
          if (address != null) 'address': address,
          if (emergencyContact != null) 'emergencyContact': emergencyContact,
        },
      );

      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);

      final body = parseResponseBody(response.data, context: 'DriverDataSource.createDriver');
      final obj = (body['data'] as Map<String, dynamic>?) ?? body;
      return DriverModel.fromJson(obj);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[DriverDataSource] Erreur inattendue : $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  @override
  Future<DriverModel> updateDriver(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.patch(
        ApiConstants.driverById(id),
        data: data,
      );

      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);

      final body = parseResponseBody(response.data, context: 'DriverDataSource.updateDriver');
      final obj = (body['data'] as Map<String, dynamic>?) ?? body;
      return DriverModel.fromJson(obj);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[DriverDataSource] Erreur inattendue : $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  @override
  Future<void> validateKyc(String id) async {
    try {
      final response = await _dio.post(ApiConstants.driverValidateKyc(id));
      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[DriverDataSource] Erreur inattendue : $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  @override
  Future<void> validateField(String id) async {
    try {
      final response = await _dio.post(ApiConstants.driverValidateField(id));
      final statusCode = response.statusCode ?? 0;
      if (statusCode == 401) throw const UnauthorizedException();
      if (statusCode == 403) throw const ForbiddenException();
      if (statusCode < 200 || statusCode >= 300) throw ServerException(statusCode);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDioError(e);
    } catch (e, st) {
      debugPrint('[DriverDataSource] Erreur inattendue : $e\n$st');
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
