import 'package:dio/dio.dart';

import '../../../../core/api/api_exception.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/auth_response_model.dart';

abstract class AuthRemoteDataSource {
  Future<AuthResponseModel> login({
    String? email,
    String? phone,
    required String password,
  });

  Future<AuthUserModel> getCurrentUser();

  Future<void> logout({required String refreshToken});
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  const AuthRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<AuthResponseModel> login({
    String? email,
    String? phone,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.login,
        data: {
          if (email != null) 'email': email,
          if (phone != null) 'phone': phone,
          'password': password,
        },
      );

      final body = response.data as Map<String, dynamic>;
      // Format: { statusCode, message, data: AuthResponseDto }
      final data = body['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw const UnauthorizedException('Réponse login invalide');
      }
      return AuthResponseModel.fromJson(data);
    } on DioException catch (e) {
      if (e.error is ApiException) rethrow;
      throw _handleDioError(e);
    }
  }

  @override
  Future<AuthUserModel> getCurrentUser() async {
    try {
      final response = await _dio.get(ApiConstants.me);
      final body = response.data as Map<String, dynamic>;
      final data = body['data'] as Map<String, dynamic>?;
      if (data == null) throw const UnauthorizedException();
      return AuthUserModel.fromJson(data);
    } on DioException catch (e) {
      if (e.error is ApiException) rethrow;
      throw _handleDioError(e);
    }
  }

  @override
  Future<void> logout({required String refreshToken}) async {
    try {
      await _dio.post(
        ApiConstants.logout,
        data: {'refreshToken': refreshToken},
      );
    } on DioException catch (e) {
      // Logout silencieux — on efface les tokens même en cas d'erreur réseau
      if (e.type != DioExceptionType.connectionError) {
        throw _handleDioError(e);
      }
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
