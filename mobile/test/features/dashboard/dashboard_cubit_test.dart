import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:fleet_mobile/features/dashboard/domain/repositories/dashboard_repository.dart';
import 'package:fleet_mobile/features/dashboard/presentation/cubit/dashboard_cubit.dart';
import 'package:fleet_mobile/features/dashboard/presentation/cubit/dashboard_state.dart';

class MockDashboardRepository extends Mock implements DashboardRepository {}

const _kKpi = DashboardData(
  vehiclesTotal: 20, vehiclesAvailable: 4, vehiclesAssignedOrInService: 12,
  vehiclesImmobilized: 4, driversTotal: 30, driversActive: 8,
  driversPendingKyc: 15, driversAtRiskOrSuspended: 5, contractsTotal: 15,
  contractsActive: 8, contractsPending: 4, contractsClosed: 3,
  paymentsToday: 45000, paymentsThisMonth: 875000, paymentCountToday: 3,
  paymentsValidated: 47, paymentsPending: 3, documentsExpired: 2,
  documentsExpiringSoon: 3, vehiclesWithoutDriver: 1,
  vehiclesWithoutActiveContract: 4,
);

void main() {
  late MockDashboardRepository repo;
  late DashboardCubit cubit;

  setUp(() {
    repo = MockDashboardRepository();
    cubit = DashboardCubit(repo);
  });

  tearDown(() => cubit.close());

  group('DashboardCubit', () {
    test('état initial est DashboardInitial', () {
      expect(cubit.state, const DashboardInitial());
    });

    blocTest<DashboardCubit, DashboardState>(
      'load → Loading puis Loaded',
      build: () {
        when(() => repo.load()).thenAnswer((_) async => _kKpi);
        return DashboardCubit(repo);
      },
      act: (c) => c.load(),
      expect: () => [
        const DashboardLoading(),
        const DashboardLoaded(_kKpi),
      ],
    );

    blocTest<DashboardCubit, DashboardState>(
      'load → Error si exception',
      build: () {
        when(() => repo.load()).thenThrow(Exception('réseau KO'));
        return DashboardCubit(repo);
      },
      act: (c) => c.load(),
      expect: () => [
        const DashboardLoading(),
        isA<DashboardError>(),
      ],
    );

    blocTest<DashboardCubit, DashboardState>(
      'refresh rappelle load',
      build: () {
        when(() => repo.load()).thenAnswer((_) async => _kKpi);
        return DashboardCubit(repo);
      },
      act: (c) => c.refresh(),
      expect: () => [
        const DashboardLoading(),
        const DashboardLoaded(_kKpi),
      ],
      verify: (_) => verify(() => repo.load()).called(1),
    );
  });

  group('DashboardData', () {
    test('alertCount = somme des 4 alertes', () {
      expect(
        _kKpi.alertCount,
        _kKpi.documentsExpired +
            _kKpi.documentsExpiringSoon +
            _kKpi.vehiclesWithoutDriver +
            _kKpi.vehiclesWithoutActiveContract,
      );
    });

    test('DashboardData.empty a tous les compteurs à 0', () {
      expect(DashboardData.empty.vehiclesTotal, 0);
      expect(DashboardData.empty.paymentsToday, 0.0);
      expect(DashboardData.empty.alertCount, 0);
    });
  });
}
