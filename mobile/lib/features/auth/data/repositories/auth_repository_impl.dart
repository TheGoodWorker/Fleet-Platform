import '../../../../core/storage/token_storage.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
    required TokenStorage tokenStorage,
  })  : _remote = remoteDataSource,
        _storage = tokenStorage;

  final AuthRemoteDataSource _remote;
  final TokenStorage _storage;

  @override
  Future<User> login({
    String? email,
    String? phone,
    required String password,
  }) async {
    final response = await _remote.login(
      email: email,
      phone: phone,
      password: password,
    );

    // Persistance sécurisée des tokens
    await _storage.saveTokens(
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    );

    return response.user.toEntity();
  }

  @override
  Future<User> getCurrentUser() async {
    final model = await _remote.getCurrentUser();
    return model.toEntity();
  }

  @override
  Future<void> logout() async {
    final refreshToken = await _storage.getRefreshToken();
    if (refreshToken != null) {
      // Révocation serveur (H-01 — jti invalidé) — silencieux si hors-ligne
      try {
        await _remote.logout(refreshToken: refreshToken);
      } catch (_) {
        // On efface les tokens localement même en cas d'erreur réseau
      }
    }
    await _storage.clearTokens();
  }

  @override
  Future<bool> isAuthenticated() => _storage.hasTokens();
}
