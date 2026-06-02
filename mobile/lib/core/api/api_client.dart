import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'auth_interceptor.dart';

/// Client HTTP principal — Dio configuré pour Fleet Platform API
///
/// Usage :
/// ```dart
/// final client = sl<ApiClient>();
/// final response = await client.dio.get('/users');
/// ```
class ApiClient {
  ApiClient({
    required TokenStorage tokenStorage,
    required Future<void> Function() onLogout,
    Dio? dio,
  }) {
    _dio = dio ?? Dio();
    _configure(tokenStorage, onLogout);
  }

  late final Dio _dio;

  /// Dio configuré avec interceptors — à utiliser pour tous les appels API
  Dio get dio => _dio;

  void _configure(
    TokenStorage tokenStorage,
    Future<void> Function() onLogout,
  ) {
    _dio.options = BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: Duration(seconds: AppConfig.timeoutSeconds),
      receiveTimeout: Duration(seconds: AppConfig.timeoutSeconds),
      sendTimeout: Duration(seconds: AppConfig.timeoutSeconds),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // validateStatus par défaut : seuls les 2xx sont des succès.
      // Les 4xx (401/403) déclenchent DioExceptionType.badResponse → AuthInterceptor.onError
    );

    // Dio séparé pour l'appel refresh (même baseUrl, sans auth interceptor)
    final refreshDio = Dio(
      BaseOptions(
        baseUrl: AppConfig.baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      AuthInterceptor(
        tokenStorage: tokenStorage,
        onLogout: onLogout,
        refreshDio: refreshDio,
      ),
    );

    // Log en développement
    if (AppConfig.isDevelopment) {
      _dio.interceptors.add(
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          logPrint: (obj) {
            // ignore: avoid_print
            print('[ApiClient] $obj');
          },
        ),
      );
    }
  }
}
