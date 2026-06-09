import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../../../../core/api/api_exception.dart';
import '../../../../core/api/response_parser.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/incident_model.dart';

class IncidentRemoteDataSource {
  const IncidentRemoteDataSource(this._dio);

  final Dio _dio;

  // ── List ──────────────────────────────────────────────────────────────────

  Future<List<IncidentModel>> getIncidents({
    String? vehicleId,
    String? type,
    String? status,
    String? severity,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        ApiConstants.incidents,
        queryParameters: {
          if (vehicleId != null) 'vehicleId': vehicleId,
          if (type != null) 'type': type,
          if (status != null) 'status': status,
          if (severity != null) 'severity': severity,
          'page': page,
          'limit': limit,
        },
      );
      _checkStatus(response.statusCode);
      final body = parseResponseBody(response.data, context: 'IncidentDS.list');
      final list = (body['data'] as List?) ?? [];
      return list.map((e) {
        final item = e as Map<String, dynamic>;
        try {
          return IncidentModel.fromJson(item);
        } catch (err, st) {
          debugPrint('[IncidentDS] parse error id=${item['id']}: $err\n$st');
          rethrow;
        }
      }).toList();
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDio(e);
    } catch (e, st) {
      debugPrint('[IncidentDS] getIncidents: $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  // ── Get by id ─────────────────────────────────────────────────────────────

  Future<IncidentModel> getIncidentById(String id) async {
    try {
      final response =
          await _dio.get<dynamic>(ApiConstants.incidentById(id));
      _checkStatus(response.statusCode);
      final body = parseResponseBody(response.data, context: 'IncidentDS.byId');
      final obj = (body['data'] as Map<String, dynamic>?) ?? body;
      return IncidentModel.fromJson(obj);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDio(e);
    } catch (e, st) {
      debugPrint('[IncidentDS] getById: $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────

  Future<IncidentModel> createIncident({
    required String type,
    required String vehicleId,
    required String description,
    required String occurredAt,
    String? driverId,
    String? managerId,
    String? severity,
    String? notes,
    double? locationLat,
    double? locationLng,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        ApiConstants.incidents,
        data: {
          'type': type,
          'vehicleId': vehicleId,
          'description': description,
          'occurredAt': occurredAt,
          if (driverId != null) 'driverId': driverId,
          if (managerId != null) 'managerId': managerId,
          if (severity != null) 'severity': severity,
          if (notes != null) 'notes': notes,
          if (locationLat != null) 'locationLat': locationLat,
          if (locationLng != null) 'locationLng': locationLng,
        },
      );
      _checkStatus(response.statusCode);
      final body =
          parseResponseBody(response.data, context: 'IncidentDS.create');
      final obj = (body['data'] as Map<String, dynamic>?) ?? body;
      return IncidentModel.fromJson(obj);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDio(e);
    } catch (e, st) {
      debugPrint('[IncidentDS] create: $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  // ── Status transitions ────────────────────────────────────────────────────

  Future<IncidentModel> markInProgress(String id) async =>
      _action(ApiConstants.incidentInProgress(id));

  Future<IncidentModel> resolve(String id, {String? notes}) async {
    try {
      final response = await _dio.post<dynamic>(
        ApiConstants.incidentResolve(id),
        data: notes != null ? {'notes': notes} : {},
      );
      _checkStatus(response.statusCode);
      final body =
          parseResponseBody(response.data, context: 'IncidentDS.resolve');
      final obj = (body['data'] as Map<String, dynamic>?) ?? body;
      return IncidentModel.fromJson(obj);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDio(e);
    } catch (e, st) {
      debugPrint('[IncidentDS] resolve: $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  Future<IncidentModel> closeIncident(String id) async =>
      _action(ApiConstants.incidentClose(id));

  // ── Private helpers ───────────────────────────────────────────────────────

  Future<IncidentModel> _action(String url) async {
    try {
      final response = await _dio.post<dynamic>(url);
      _checkStatus(response.statusCode);
      final body = parseResponseBody(response.data, context: 'IncidentDS');
      final obj = (body['data'] as Map<String, dynamic>?) ?? body;
      return IncidentModel.fromJson(obj);
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _handleDio(e);
    } catch (e, st) {
      debugPrint('[IncidentDS] action $url: $e\n$st');
      throw UnknownException(e.toString());
    }
  }

  void _checkStatus(int? code) {
    final s = code ?? 0;
    if (s == 401) throw const UnauthorizedException();
    if (s == 403) throw const ForbiddenException();
    if (s < 200 || s >= 300) throw ServerException(s);
  }

  ApiException _handleDio(DioException e) {
    if (e.error is ApiException) return e.error as ApiException;
    return switch (e.response?.statusCode) {
      null => const NetworkException(),
      401 => const UnauthorizedException(),
      403 => const ForbiddenException(),
      429 => const TooManyRequestsException(),
      final c when c >= 500 => ServerException(c),
      _ => const NetworkException(),
    };
  }
}
