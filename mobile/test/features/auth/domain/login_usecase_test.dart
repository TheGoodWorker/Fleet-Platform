import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:fleet_mobile/features/auth/domain/entities/user.dart';
import 'package:fleet_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:fleet_mobile/features/auth/domain/usecases/login_usecase.dart';
import 'package:fleet_mobile/shared/permissions/user_role.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  late MockAuthRepository mockRepository;
  late LoginUseCase loginUseCase;

  final testUser = User(
    id: 'user-1',
    firstName: 'Mamadou',
    lastName: 'Diallo',
    role: UserRole.manager,
    email: 'mamadou@fleet.local',
  );

  setUp(() {
    mockRepository = MockAuthRepository();
    loginUseCase = LoginUseCase(mockRepository);
  });

  test('appelle repository.login avec email et password', () async {
    when(() => mockRepository.login(
          email: 'mamadou@fleet.local',
          phone: null,
          password: 'password123',
        )).thenAnswer((_) async => testUser);

    final result = await loginUseCase(
      const LoginParams(email: 'mamadou@fleet.local', password: 'password123'),
    );

    expect(result, testUser);
  });

  test('appelle repository.login avec phone et password', () async {
    when(() => mockRepository.login(
          email: null,
          phone: '+221701234567',
          password: 'password123',
        )).thenAnswer((_) async => testUser);

    final result = await loginUseCase(
      const LoginParams(phone: '+221701234567', password: 'password123'),
    );

    expect(result.role, UserRole.manager);
  });
}
