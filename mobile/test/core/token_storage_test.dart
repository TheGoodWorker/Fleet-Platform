import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:fleet_mobile/core/storage/token_storage.dart';

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  late MockFlutterSecureStorage mockStorage;
  late SecureTokenStorage tokenStorage;

  setUp(() {
    mockStorage = MockFlutterSecureStorage();
    tokenStorage = SecureTokenStorage(storage: mockStorage);
  });

  group('TokenStorage', () {
    const accessToken = 'access.jwt.token';
    const refreshToken = 'refresh.jwt.token';

    test('saveTokens — écrit accessToken et refreshToken', () async {
      when(() => mockStorage.write(
            key: any(named: 'key'),
            value: any(named: 'value'),
          )).thenAnswer((_) async {});

      await tokenStorage.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );

      verify(() => mockStorage.write(
            key: 'fleet_access_token',
            value: accessToken,
          )).called(1);

      verify(() => mockStorage.write(
            key: 'fleet_refresh_token',
            value: refreshToken,
          )).called(1);
    });

    test('getAccessToken — retourne le token stocké', () async {
      when(() => mockStorage.read(key: 'fleet_access_token'))
          .thenAnswer((_) async => accessToken);

      final result = await tokenStorage.getAccessToken();
      expect(result, accessToken);
    });

    test('getRefreshToken — retourne le token stocké', () async {
      when(() => mockStorage.read(key: 'fleet_refresh_token'))
          .thenAnswer((_) async => refreshToken);

      final result = await tokenStorage.getRefreshToken();
      expect(result, refreshToken);
    });

    test('clearTokens — supprime les deux tokens', () async {
      when(() => mockStorage.delete(key: any(named: 'key')))
          .thenAnswer((_) async {});

      await tokenStorage.clearTokens();

      verify(() => mockStorage.delete(key: 'fleet_access_token')).called(1);
      verify(() => mockStorage.delete(key: 'fleet_refresh_token')).called(1);
    });

    test('hasTokens — true si accessToken présent', () async {
      when(() => mockStorage.read(key: 'fleet_access_token'))
          .thenAnswer((_) async => accessToken);

      final result = await tokenStorage.hasTokens();
      expect(result, isTrue);
    });

    test('hasTokens — false si accessToken absent', () async {
      when(() => mockStorage.read(key: 'fleet_access_token'))
          .thenAnswer((_) async => null);

      final result = await tokenStorage.hasTokens();
      expect(result, isFalse);
    });

    test('hasTokens — false si accessToken vide', () async {
      when(() => mockStorage.read(key: 'fleet_access_token'))
          .thenAnswer((_) async => '');

      final result = await tokenStorage.hasTokens();
      expect(result, isFalse);
    });
  });
}
