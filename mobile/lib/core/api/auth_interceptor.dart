import 'package:dio/dio.dart';

import '../constants/api_constants.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

/// Interceptor Dio pour la gestion automatique des tokens JWT
///
/// Comportement :
/// 1. Injecte Authorization: Bearer <accessToken> sur chaque requête
/// 2. Sur 401 : tente un refresh automatique (une seule fois)
/// 3. Si le refresh échoue : appelle [onLogout] et lève UnauthorizedException
///
/// Utilise un verrou [_isRefreshing] pour éviter les appels parallèles
/// au refresh token.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this.tokenStorage,
    required this.onLogout,
    Dio? refreshDio,
  }) : _refreshDio = refreshDio;

  final TokenStorage tokenStorage;
  final Future<void> Function() onLogout;

  /// Dio séparé pour l'appel refresh (évite la boucle infinie sur le
  /// même client qui a l'interceptor)
  Dio? _refreshDio;

  bool _isRefreshing = false;
  final List<Function> _pendingRequests = [];

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await tokenStorage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401) {
      handler.next(_mapDioError(err));
      return;
    }

    // Éviter de tenter le refresh sur l'endpoint refresh lui-même
    final path = err.requestOptions.path;
    if (path.endsWith(ApiConstants.refresh) ||
        path.endsWith(ApiConstants.logout)) {
      await onLogout();
      handler.reject(
        DioException(
          requestOptions: err.requestOptions,
          error: const UnauthorizedException(),
        ),
      );
      return;
    }

    // Refresh en cours — mettre la requête en attente
    if (_isRefreshing) {
      _pendingRequests.add(() async {
        try {
          final response = await _retry(err.requestOptions);
          handler.resolve(response);
        } catch (e) {
          handler.next(err);
        }
      });
      return;
    }

    _isRefreshing = true;

    try {
      await _refreshToken();

      // Rejouer les requêtes en attente
      for (final request in _pendingRequests) {
        request();
      }
      _pendingRequests.clear();

      // Rejouer la requête initiale
      final response = await _retry(err.requestOptions);
      handler.resolve(response);
    } catch (_) {
      _pendingRequests.clear();
      await onLogout();
      handler.reject(
        DioException(
          requestOptions: err.requestOptions,
          error: const UnauthorizedException('Session expirée'),
        ),
      );
    } finally {
      _isRefreshing = false;
    }
  }

  /// Tente de renouveler les tokens via POST /auth/refresh
  Future<void> _refreshToken() async {
    final refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      throw const UnauthorizedException('Refresh token absent');
    }

    final dio = _refreshDio ?? Dio();
    final response = await dio.post(
      ApiConstants.refresh,
      data: {'refreshToken': refreshToken},
    );

    final body = response.data as Map<String, dynamic>?;
    final data = body?['data'] as Map<String, dynamic>?;
    if (data == null) throw const UnauthorizedException('Refresh invalide');

    await tokenStorage.saveTokens(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
  }

  /// Rejoue une requête après refresh
  Future<Response<dynamic>> _retry(RequestOptions requestOptions) async {
    final token = await tokenStorage.getAccessToken();
    final options = Options(
      method: requestOptions.method,
      headers: {
        ...requestOptions.headers,
        'Authorization': 'Bearer $token',
      },
    );

    final dio = _refreshDio ?? Dio();
    return dio.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
    );
  }

  /// Mappe les DioException en ApiException typées
  DioException _mapDioError(DioException err) {
    ApiException apiEx;

    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.sendTimeout) {
      apiEx = const TimeoutException();
    } else if (err.type == DioExceptionType.connectionError) {
      apiEx = const NetworkException();
    } else {
      final statusCode = err.response?.statusCode;
      apiEx = switch (statusCode) {
        null => const NetworkException(),
        401 => const UnauthorizedException(),
        403 => const ForbiddenException(),
        404 => const NotFoundException(),
        422 => _parseValidationError(err.response),
        429 => const TooManyRequestsException(),
        final code when code >= 500 => ServerException(code),
        _ => const UnknownException(),
      };
    }

    return DioException(
      requestOptions: err.requestOptions,
      response: err.response,
      error: apiEx,
      message: apiEx.message,
    );
  }

  ValidationException _parseValidationError(Response? response) {
    final data = response?.data as Map<String, dynamic>?;
    final message = data?['message'];
    if (message is List) {
      return ValidationException(message.map((e) => e.toString()).toList());
    }
    return ValidationException([message?.toString() ?? 'Validation échouée']);
  }
}
