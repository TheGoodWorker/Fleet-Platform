import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../../../../core/api/response_parser.dart';
import '../../../../core/constants/api_constants.dart';

/// Données brutes récupérées depuis l'API (listes JSON non parsées).
class DashboardRawData {
  const DashboardRawData({
    required this.vehicles,
    required this.drivers,
    required this.contracts,
    required this.payments,
    required this.documents,
  });

  final List<Map<String, dynamic>> vehicles;
  final List<Map<String, dynamic>> drivers;
  final List<Map<String, dynamic>> contracts;
  final List<Map<String, dynamic>> payments;
  final List<Map<String, dynamic>> documents;
}

/// Récupère les 5 listes en parallèle via les endpoints existants.
class DashboardDatasource {
  const DashboardDatasource(this._dio);

  final Dio _dio;

  Future<DashboardRawData> fetchAll() async {
    final results = await Future.wait([
      _fetchList(ApiConstants.vehicles),
      _fetchList(ApiConstants.drivers),
      _fetchList(ApiConstants.contracts),
      _fetchList(ApiConstants.payments),
      _fetchList(ApiConstants.documents),
    ]);

    return DashboardRawData(
      vehicles: results[0],
      drivers: results[1],
      contracts: results[2],
      payments: results[3],
      documents: results[4],
    );
  }

  Future<List<Map<String, dynamic>>> _fetchList(String path) async {
    try {
      final response = await _dio.get<dynamic>(
        path,
        queryParameters: {'page': 1, 'limit': 100},
      );
      final statusCode = response.statusCode ?? 0;
      if (statusCode < 200 || statusCode >= 300) return const [];

      final body = parseResponseBody(response.data,
          context: 'DashboardDatasource.$path');
      final rawList = body['data'] as List? ?? const [];
      return rawList.whereType<Map<String, dynamic>>().toList();
    } catch (e, st) {
      debugPrint('[DashboardDatasource] erreur $path : $e\n$st');
      return const [];
    }
  }
}
