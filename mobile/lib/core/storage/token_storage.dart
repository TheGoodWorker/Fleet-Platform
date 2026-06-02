import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Interface de stockage sécurisé des tokens JWT
abstract class TokenStorage {
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  });

  Future<String?> getAccessToken();
  Future<String?> getRefreshToken();
  Future<void> clearTokens();
  Future<bool> hasTokens();
}

/// Implémentation avec flutter_secure_storage
/// - iOS : Keychain
/// - Android : EncryptedSharedPreferences
class SecureTokenStorage implements TokenStorage {
  SecureTokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                encryptedSharedPreferences: true,
              ),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
              // Web : IndexedDB via Web Crypto API
              // dbName et publicKey stables évitent les incohérences entre rechargements
              webOptions: WebOptions(
                dbName: 'fleet_secure_storage',
                publicKey: 'fleet_secure_key',
              ),
            );

  final FlutterSecureStorage _storage;

  static const String _accessKey = 'fleet_access_token';
  static const String _refreshKey = 'fleet_refresh_token';

  @override
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _accessKey, value: accessToken),
      _storage.write(key: _refreshKey, value: refreshToken),
    ]);
  }

  @override
  Future<String?> getAccessToken() => _storage.read(key: _accessKey);

  @override
  Future<String?> getRefreshToken() => _storage.read(key: _refreshKey);

  @override
  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: _accessKey),
      _storage.delete(key: _refreshKey),
    ]);
  }

  @override
  Future<bool> hasTokens() async {
    final access = await getAccessToken();
    return access != null && access.isNotEmpty;
  }
}
