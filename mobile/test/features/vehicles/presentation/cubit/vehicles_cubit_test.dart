import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:fleet_mobile/core/api/api_exception.dart';
import 'package:fleet_mobile/features/vehicles/domain/entities/vehicle.dart';
import 'package:fleet_mobile/features/vehicles/domain/repositories/vehicle_repository.dart';
import 'package:fleet_mobile/features/vehicles/presentation/cubit/vehicles_cubit.dart';
import 'package:fleet_mobile/features/vehicles/presentation/cubit/vehicles_state.dart';

class MockVehicleRepository extends Mock implements VehicleRepository {}

/// Construit un Vehicle de test avec des valeurs minimales.
Vehicle _makeVehicle(String id) => Vehicle(
      id: id,
      plateNumber: 'DK ${id}00 AB',
      brand: 'Toyota',
      model: 'HiAce',
      year: 2022,
      color: 'Blanc',
      fuelType: 'DIESEL',
      status: VehicleStatus.available,
    );

void main() {
  late MockVehicleRepository repo;
  late VehiclesCubit cubit;

  setUp(() {
    repo = MockVehicleRepository();
    cubit = VehiclesCubit(repo);
  });

  tearDown(() => cubit.close());

  group('VehiclesCubit — load', () {
    final vehicles = [_makeVehicle('v1'), _makeVehicle('v2')];

    blocTest<VehiclesCubit, VehiclesState>(
      'émet [Loading, Loaded] quand le dépôt retourne une liste',
      build: () {
        when(() => repo.getVehicles(
              status: any(named: 'status'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => vehicles);
        return cubit;
      },
      act: (c) => c.load(),
      expect: () => [
        const VehiclesLoading(),
        VehiclesLoaded(vehicles: vehicles),
      ],
    );

    blocTest<VehiclesCubit, VehiclesState>(
      'émet [Loading, Loaded] vide si le dépôt retourne []',
      build: () {
        when(() => repo.getVehicles(
              status: any(named: 'status'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => []);
        return cubit;
      },
      act: (c) => c.load(),
      expect: () => [
        const VehiclesLoading(),
        const VehiclesLoaded(vehicles: []),
      ],
    );

    blocTest<VehiclesCubit, VehiclesState>(
      'émet [Loading, Error] quand le dépôt lance NetworkException',
      build: () {
        when(() => repo.getVehicles(
              status: any(named: 'status'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenThrow(const NetworkException());
        return cubit;
      },
      act: (c) => c.load(),
      expect: () => [
        const VehiclesLoading(),
        const VehiclesError('Connexion réseau indisponible'),
      ],
    );

    blocTest<VehiclesCubit, VehiclesState>(
      'émet [Loading, Error] quand le dépôt lance ServerException',
      build: () {
        when(() => repo.getVehicles(
              status: any(named: 'status'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenThrow(const ServerException(500));
        return cubit;
      },
      act: (c) => c.load(),
      expect: () => [
        const VehiclesLoading(),
        const VehiclesError('Erreur serveur'),
      ],
    );
  });

  group('VehiclesCubit — filterByStatus', () {
    final vehicles = [_makeVehicle('v1')];

    blocTest<VehiclesCubit, VehiclesState>(
      'filtre par statut et émet Loaded avec statusFilter renseigné',
      build: () {
        when(() => repo.getVehicles(
              status: 'AVAILABLE',
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => vehicles);
        return cubit;
      },
      act: (c) => c.filterByStatus('AVAILABLE'),
      expect: () => [
        const VehiclesLoading(),
        VehiclesLoaded(vehicles: vehicles, statusFilter: 'AVAILABLE'),
      ],
    );
  });

  group('VehiclesCubit — refresh', () {
    final vehicles = [_makeVehicle('v1')];

    blocTest<VehiclesCubit, VehiclesState>(
      'refresh() recharge avec le filtre courant',
      build: () {
        when(() => repo.getVehicles(
              status: any(named: 'status'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => vehicles);
        return cubit;
      },
      seed: () => VehiclesLoaded(vehicles: vehicles, statusFilter: 'ASSIGNED'),
      act: (c) => c.refresh(),
      expect: () => [
        const VehiclesLoading(),
        VehiclesLoaded(vehicles: vehicles, statusFilter: 'ASSIGNED'),
      ],
      verify: (_) {
        verify(() => repo.getVehicles(
              status: 'ASSIGNED',
              page: 1,
              limit: 50,
            )).called(1);
      },
    );
  });
}
