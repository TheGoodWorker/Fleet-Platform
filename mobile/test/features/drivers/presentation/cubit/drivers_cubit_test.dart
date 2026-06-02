import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:fleet_mobile/core/api/api_exception.dart';
import 'package:fleet_mobile/features/drivers/domain/entities/driver.dart';
import 'package:fleet_mobile/features/drivers/domain/repositories/driver_repository.dart';
import 'package:fleet_mobile/features/drivers/presentation/cubit/drivers_cubit.dart';
import 'package:fleet_mobile/features/drivers/presentation/cubit/drivers_state.dart';

class MockDriverRepository extends Mock implements DriverRepository {}

Driver _makeDriver(String id) => Driver(
      id: id,
      status: DriverStatus.active,
      firstName: 'Moussa',
      lastName: 'Diallo',
      idCardNumber: 'SN${id}123',
      licenseNumber: 'LIC${id}456',
      phone: '+221701234567',
    );

void main() {
  late MockDriverRepository repo;
  late DriversCubit cubit;

  setUp(() {
    repo = MockDriverRepository();
    cubit = DriversCubit(repo);
  });

  tearDown(() => cubit.close());

  group('DriversCubit — load', () {
    final drivers = [_makeDriver('d1'), _makeDriver('d2')];

    blocTest<DriversCubit, DriversState>(
      'émet [Loading, Loaded] quand le dépôt retourne une liste',
      build: () {
        when(() => repo.getDrivers(
              status: any(named: 'status'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => drivers);
        return cubit;
      },
      act: (c) => c.load(),
      expect: () => [
        const DriversLoading(),
        DriversLoaded(drivers: drivers),
      ],
    );

    blocTest<DriversCubit, DriversState>(
      'émet [Loading, Loaded] vide si la liste est vide',
      build: () {
        when(() => repo.getDrivers(
              status: any(named: 'status'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => []);
        return cubit;
      },
      act: (c) => c.load(),
      expect: () => [
        const DriversLoading(),
        const DriversLoaded(drivers: []),
      ],
    );

    blocTest<DriversCubit, DriversState>(
      'émet [Loading, Error] sur NetworkException',
      build: () {
        when(() => repo.getDrivers(
              status: any(named: 'status'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenThrow(const NetworkException());
        return cubit;
      },
      act: (c) => c.load(),
      expect: () => [
        const DriversLoading(),
        const DriversError('Connexion réseau indisponible'),
      ],
    );

    blocTest<DriversCubit, DriversState>(
      'émet [Loading, Error] sur UnauthorizedException',
      build: () {
        when(() => repo.getDrivers(
              status: any(named: 'status'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenThrow(const UnauthorizedException());
        return cubit;
      },
      act: (c) => c.load(),
      expect: () => [
        const DriversLoading(),
        const DriversError('Non authentifié'),
      ],
    );
  });

  group('DriversCubit — filterByStatus', () {
    final drivers = [_makeDriver('d1')];

    blocTest<DriversCubit, DriversState>(
      'filtre ACTIVE et expose statusFilter dans l\'état',
      build: () {
        when(() => repo.getDrivers(
              status: 'ACTIVE',
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => drivers);
        return cubit;
      },
      act: (c) => c.filterByStatus('ACTIVE'),
      expect: () => [
        const DriversLoading(),
        DriversLoaded(drivers: drivers, statusFilter: 'ACTIVE'),
      ],
    );
  });

  group('DriversCubit — refresh', () {
    final drivers = [_makeDriver('d1')];

    blocTest<DriversCubit, DriversState>(
      'refresh() conserve le statusFilter courant',
      build: () {
        when(() => repo.getDrivers(
              status: any(named: 'status'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => drivers);
        return cubit;
      },
      seed: () => DriversLoaded(drivers: drivers, statusFilter: 'SUSPENDED'),
      act: (c) => c.refresh(),
      expect: () => [
        const DriversLoading(),
        DriversLoaded(drivers: drivers, statusFilter: 'SUSPENDED'),
      ],
      verify: (_) {
        verify(() => repo.getDrivers(
              status: 'SUSPENDED',
              page: 1,
              limit: 50,
            )).called(1);
      },
    );
  });
}
