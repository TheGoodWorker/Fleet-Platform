import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:bloc_test/bloc_test.dart';

import 'package:fleet_mobile/features/contracts/domain/entities/contract.dart';
import 'package:fleet_mobile/features/contracts/domain/repositories/contract_repository.dart';
import 'package:fleet_mobile/features/contracts/presentation/cubit/contract_detail_cubit.dart';
import 'package:fleet_mobile/features/contracts/presentation/cubit/contract_detail_state.dart';
import 'package:fleet_mobile/core/api/api_exception.dart';

class MockContractRepository extends Mock implements ContractRepository {}

const testContract = Contract(
  id: 'c1',
  type: ContractType.ownershipProgram,
  status: ContractStatus.draft,
  dailyAmount: 15000,
  vehicleId: 'v1',
  vehiclePlate: 'DK 1001 AA',
  vehicleBrand: 'Toyota',
  vehicleModel: 'HiAce',
);

void main() {
  late MockContractRepository mockRepo;
  late ContractDetailCubit cubit;

  setUp(() {
    mockRepo = MockContractRepository();
    cubit = ContractDetailCubit(mockRepo);
  });

  tearDown(() => cubit.close());

  group('ContractDetailCubit', () {
    test('état initial est ContractDetailInitial', () {
      expect(cubit.state, const ContractDetailInitial());
    });

    blocTest<ContractDetailCubit, ContractDetailState>(
      'load → Loading puis Loaded',
      build: () {
        when(() => mockRepo.getContractById('c1'))
            .thenAnswer((_) async => testContract);
        return ContractDetailCubit(mockRepo);
      },
      act: (c) => c.load('c1'),
      expect: () => [
        const ContractDetailLoading(),
        const ContractDetailLoaded(testContract),
      ],
    );

    blocTest<ContractDetailCubit, ContractDetailState>(
      'load → Error sur NetworkException',
      build: () {
        when(() => mockRepo.getContractById('c1'))
            .thenThrow(const NetworkException());
        return ContractDetailCubit(mockRepo);
      },
      act: (c) => c.load('c1'),
      expect: () => [
        const ContractDetailLoading(),
        isA<ContractDetailError>(),
      ],
    );

    blocTest<ContractDetailCubit, ContractDetailState>(
      'createContract → ActionSuccess',
      build: () {
        when(
          () => mockRepo.createContract(
            type: any(named: 'type'),
            vehicleId: any(named: 'vehicleId'),
            managerId: any(named: 'managerId'),
            driverId: any(named: 'driverId'),
            ownerId: any(named: 'ownerId'),
            dailyAmount: any(named: 'dailyAmount'),
            targetDays: any(named: 'targetDays'),
            restDay: any(named: 'restDay'),
            simpleRentalMonthlyAmount: any(named: 'simpleRentalMonthlyAmount'),
            ownerPaymentFrequency: any(named: 'ownerPaymentFrequency'),
            notes: any(named: 'notes'),
          ),
        ).thenAnswer((_) async => testContract);
        return ContractDetailCubit(mockRepo);
      },
      act: (c) => c.createContract(
        type: 'OWNERSHIP_PROGRAM',
        vehicleId: 'v1',
        managerId: 'mgr1',
        dailyAmount: 15000,
      ),
      expect: () => [
        const ContractDetailActionInProgress(),
        isA<ContractDetailActionSuccess>(),
      ],
    );
  });
}
