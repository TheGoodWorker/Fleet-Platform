import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:bloc_test/bloc_test.dart';

import 'package:fleet_mobile/features/vehicles/domain/entities/vehicle.dart';
import 'package:fleet_mobile/features/vehicles/domain/repositories/vehicle_repository.dart';
import 'package:fleet_mobile/features/vehicles/presentation/cubit/vehicle_detail_cubit.dart';
import 'package:fleet_mobile/features/vehicles/presentation/cubit/vehicle_detail_state.dart';
import 'package:fleet_mobile/core/api/api_exception.dart';

class MockVehicleRepository extends Mock implements VehicleRepository {}

const testVehicle = Vehicle(
  id: 'v1',
  plateNumber: 'DK 1001 AA',
  brand: 'Toyota',
  model: 'HiAce',
  year: 2021,
  color: 'Blanc',
  fuelType: '',
  status: VehicleStatus.available,
);

void main() {
  late MockVehicleRepository mockRepo;
  late VehicleDetailCubit cubit;

  setUp(() {
    mockRepo = MockVehicleRepository();
    cubit = VehicleDetailCubit(mockRepo);
  });

  tearDown(() => cubit.close());

  group('VehicleDetailCubit', () {
    test('état initial est VehicleDetailInitial', () {
      expect(cubit.state, const VehicleDetailInitial());
    });

    blocTest<VehicleDetailCubit, VehicleDetailState>(
      'load → Loading puis Loaded',
      build: () {
        when(() => mockRepo.getVehicleById('v1'))
            .thenAnswer((_) async => testVehicle);
        return VehicleDetailCubit(mockRepo);
      },
      act: (c) => c.load('v1'),
      expect: () => [
        const VehicleDetailLoading(),
        const VehicleDetailLoaded(testVehicle),
      ],
    );

    blocTest<VehicleDetailCubit, VehicleDetailState>(
      'load → Error sur NetworkException',
      build: () {
        when(() => mockRepo.getVehicleById('v1'))
            .thenThrow(const NetworkException());
        return VehicleDetailCubit(mockRepo);
      },
      act: (c) => c.load('v1'),
      expect: () => [
        const VehicleDetailLoading(),
        isA<VehicleDetailError>(),
      ],
    );

    blocTest<VehicleDetailCubit, VehicleDetailState>(
      'createVehicle → ActionSuccess',
      build: () {
        when(
          () => mockRepo.createVehicle(
            plateNumber: any(named: 'plateNumber'),
            brand: any(named: 'brand'),
            model: any(named: 'model'),
            vin: any(named: 'vin'),
            year: any(named: 'year'),
            color: any(named: 'color'),
            fuelType: any(named: 'fuelType'),
            transmission: any(named: 'transmission'),
            seats: any(named: 'seats'),
            ownerId: any(named: 'ownerId'),
          ),
        ).thenAnswer((_) async => testVehicle);
        return VehicleDetailCubit(mockRepo);
      },
      act: (c) => c.createVehicle(
        plateNumber: 'DK 1001 AA',
        brand: 'Toyota',
        model: 'HiAce',
      ),
      expect: () => [
        const VehicleDetailActionInProgress(),
        isA<VehicleDetailActionSuccess>(),
      ],
    );
  });
}
