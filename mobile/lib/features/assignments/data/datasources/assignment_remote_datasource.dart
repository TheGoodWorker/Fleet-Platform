import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../../../../core/api/api_exception.dart';
import '../../../../core/api/response_parser.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/assignment_model.dart';

class AssignmentRemoteDataSource {
  const AssignmentRemoteDataSource(this._dio);
  final Dio _dio;

  Future<List<AssignmentModel>> getVehicleAssignments(
    String vehicleId, {
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        ApiConstants.vehicleAssignments(vehicleId),
        queryParameters: {'page': page, 'limit': limit},
      );
      _checkStatus(response.statusCode);
      final body = parseResponseBody(response.data, context: 'AssignmentDS.vehicleHistory');
      final list = (body['data'] as List?) ?? [];
      return list
          .map((e) => AssignmentModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      throw _handleDio(e);
    } catch (e, st) {
      debugPrint('[AssignmentDS] getVehicleAssignments: $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  Future<List<AssignmentModel>> getDriverAssignments(
    String driverId, {
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        ApiConstants.driverAssignments(driverId),
        queryParameters: {'page': page, 'limit': limit},
      );
      _checkStatus(response.statusCode);
      final body = parseResponseBody(response.data, context: 'AssignmentDS.driverHistory');
      final list = (body['data'] as List?) ?? [];
      return list
          .map((e) => AssignmentModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      throw _handleDio(e);
    } catch (e, st) {
      debugPrint('[AssignmentDS] getDriverAssignments: $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  Future<void> assignDriver({
    required String vehicleId,
    required String driverId,
    String? notes,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        ApiConstants.vehicleAssignDriver(vehicleId),
        data: {
          'driverId': driverId,
          if (notes != null) 'notes': notes,
        },
      );
      _checkStatus(response.statusCode);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      throw _handleDio(e);
    } catch (e, st) {
      debugPrint('[AssignmentDS] assignDriver: $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  Future<void> unassignDriver(String vehicleId) async {
    try {
      final response = await _dio.delete<dynamic>(
        ApiConstants.vehicleAssignDriver(vehicleId),
      );
      _checkStatus(response.statusCode);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      throw _handleDio(e);
    } catch (e, st) {
      debugPrint('[AssignmentDS] unassignDriver: $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  void _checkStatus(int? code) {
    final s = code ?? 0;
    if (s == 401) throw const UnauthorizedException();
    if (s == 403) throw const ForbiddenException();
    if (s < 200 || s >= 300) throw ServerException(s);
  }

  ApiException _handleDio(DioException e) {
    if (e.error is ApiException) return e.error as ApiException;
    final code = e.response?.statusCode;
    if (code == null) return const NetworkException();
    if (code == 401) return const UnauthorizedException();
    if (code == 403) return const ForbiddenException();
    if (code == 429) return const TooManyRequestsException();
    if (code >= 500) return ServerException(code);
    // 4xx — tenter d'extraire le message du serveur
    final body = e.response?.data;
    String? msg;
    if (body is Map) msg = body['message'] as String?;
    return ServerException(code, msg ?? 'Erreur serveur');
  }
}
