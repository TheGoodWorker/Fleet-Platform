import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:fleet_mobile/core/api/api_exception.dart';
import 'package:fleet_mobile/core/storage/token_storage.dart';
import 'package:fleet_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:fleet_mobile/features/auth/data/models/auth_response_model.dart';
import 'package:fleet_mobile/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:fleet_mobile/shared/permissions/user_role.dart';

// ─── Mocks ────────────────────────────────────────────────────────────────────

class MockAuthRemoteDataSource extends Mock implements AuthRemoteDataSource {}

class MockTokenStorage extends Mock implements TokenStorage {}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

AuthResponseModel buildAuthResponse() => const AuthResponseModel(
      accessToken: 'access.token',
      refreshToken: 'refresh.token',
      expiresIn: '1d',
      user: AuthUserModel(
        id: 'user-1',
        firstName: 'Mamadou',
        lastName: 'Diallo',
        role: UserRole.manager,
        email: 'mamadou@fleet.local',
      ),
    );

// ─── Tests ────────────────────────────────────────────────────────────────────

void main() {
  late MockAuthRemoteDataSource mockDataSource;
  late MockTokenStorage mockStorage;
  late AuthRepositoryImpl repository;

  setUp(() {
    mockDataSource = MockAuthRemoteDataSource();
    mockStorage = MockTokenStorage();
    repository = AuthRepositoryImpl(
      remoteDataSource: mockDataSource,
      tokenStorage: mockStorage,
    );

    // Stub par défaut
    when(() => mockStorage.saveTokens(
          accessToken: any(named: 'accessToken'),
          refreshToken: any(named: 'refreshToken'),
        )).thenAnswer((_) async {});
    when(() => mockStorage.clearTokens()).thenAnswer((_) async {});
    when(() => mockStorage.getRefreshToken())
        .thenAnswer((_) async => 'refresh.token');
    when(() => mockStorage.hasTokens()).thenAnswer((_) async => true);
  });

  group('AuthRepository — login()', () {
    test('retourne un User et sauvegarde les tokens', () async {
      when(() => mockDataSource.login(
            email: 'mamadou@fleet.local',
            phone: null,
            password: 'password123',
          )).thenAnswer((_) async => buildAuthResponse());

      final user = await repository.login(
        email: 'mamadou@fleet.local',
        password: 'password123',
      );

      expect(user.id, 'user-1');
      expect(user.fullName, 'Mamadou Diallo');
      expect(user.role, UserRole.manager);

      verify(() => mockStorage.saveTokens(
            accessToken: 'access.token',
            refreshToken: 'refresh.token',
          )).called(1);
    });

    test('propage UnauthorizedException si identifiants incorrects', () async {
      when(() => mockDataSource.login(
            email: any(named: 'email'),
            phone: any(named: 'phone'),
            password: any(named: 'password'),
          )).thenThrow(const UnauthorizedException());

      expect(
        () => repository.login(email: 'bad@email.com', password: 'wrong'),
        throwsA(isA<UnauthorizedException>()),
      );
    });

    test('propage TooManyRequestsException sur 429', () async {
      when(() => mockDataSource.login(
            email: any(named: 'email'),
            phone: any(named: 'phone'),
            password: any(named: 'password'),
          )).thenThrow(const TooManyRequestsException());

      expect(
        () => repository.login(email: 'test@test.com', password: 'pass'),
        throwsA(isA<TooManyRequestsException>()),
      );
    });
  });

  group('AuthRepository — logout()', () {
    test('révoque le refresh token et efface le storage', () async {
      when(() => mockDataSource.logout(refreshToken: 'refresh.token'))
          .thenAnswer((_) async {});

      await repository.logout();

      verify(() => mockDataSource.logout(refreshToken: 'refresh.token'))
          .called(1);
      verify(() => mockStorage.clearTokens()).called(1);
    });

    test('efface le storage même si le serveur retourne une erreur', () async {
      when(() => mockDataSource.logout(refreshToken: any(named: 'refreshToken')))
          .thenThrow(const NetworkException());

      await repository.logout();

      verify(() => mockStorage.clearTokens()).called(1);
    });
  });

  group('AuthRepository — isAuthenticated()', () {
    test('retourne true si token présent', () async {
      when(() => mockStorage.hasTokens()).thenAnswer((_) async => true);

      final result = await repository.isAuthenticated();
      expect(result, isTrue);
    });

    test('retourne false si token absent', () async {
      when(() => mockStorage.hasTokens()).thenAnswer((_) async => false);

      final result = await repository.isAuthenticated();
      expect(result, isFalse);
    });
  });
}
