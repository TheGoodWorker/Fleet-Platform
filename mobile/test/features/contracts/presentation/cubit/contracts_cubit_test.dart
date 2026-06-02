import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:fleet_mobile/core/api/api_exception.dart';
import 'package:fleet_mobile/features/contracts/domain/entities/contract.dart';
import 'package:fleet_mobile/features/contracts/domain/repositories/contract_repository.dart';
import 'package:fleet_mobile/features/contracts/presentation/cubit/contracts_cubit.dart';
import 'package:fleet_mobile/features/contracts/presentation/cubit/contracts_state.dart';

class MockContractRepository extends Mock implements ContractRepository {}

Contract _makeContract(String id, ContractType type) => Contract(
      id: id,
      type: type,
      status: ContractStatus.active,
      dailyAmount: 25000,
      vehicleId: 'v1',
      vehiclePlate: 'DK 1234 AB',
      vehicleBrand: 'Toyota',
      vehicleModel: 'HiAce',
      driverName: 'Moussa Diallo',
    );

void main() {
  late MockContractRepository repo;
  late ContractsCubit cubit;

  setUp(() {
    repo = MockContractRepository();
    cubit = ContractsCubit(repo);
  });

  tearDown(() => cubit.close());

  group('ContractsCubit — load', () {
    final contracts = [
      _makeContract('c1', ContractType.ownershipProgram),
      _makeContract('c2', ContractType.simpleRental),
    ];

    blocTest<ContractsCubit, ContractsState>(
      'émet [Loading, Loaded] avec la liste de contrats',
      build: () {
        when(() => repo.getContracts(
              type: any(named: 'type'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => contracts);
        return cubit;
      },
      act: (c) => c.load(),
      expect: () => [
        const ContractsLoading(),
        ContractsLoaded(contracts: contracts),
      ],
    );

    blocTest<ContractsCubit, ContractsState>(
      'émet [Loading, Loaded] vide si aucun contrat',
      build: () {
        when(() => repo.getContracts(
              type: any(named: 'type'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => []);
        return cubit;
      },
      act: (c) => c.load(),
      expect: () => [
        const ContractsLoading(),
        const ContractsLoaded(contracts: []),
      ],
    );

    blocTest<ContractsCubit, ContractsState>(
      'émet [Loading, Error] sur ForbiddenException',
      build: () {
        when(() => repo.getContracts(
              type: any(named: 'type'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenThrow(const ForbiddenException());
        return cubit;
      },
      act: (c) => c.load(),
      expect: () => [
        const ContractsLoading(),
        const ContractsError('Accès refusé'),
      ],
    );
  });

  group('ContractsCubit — filterByType', () {
    final contracts = [_makeContract('c1', ContractType.ownershipProgram)];

    blocTest<ContractsCubit, ContractsState>(
      'filtre OWNERSHIP_PROGRAM et expose typeFilter dans l\'état',
      build: () {
        when(() => repo.getContracts(
              type: 'OWNERSHIP_PROGRAM',
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => contracts);
        return cubit;
      },
      act: (c) => c.filterByType('OWNERSHIP_PROGRAM'),
      expect: () => [
        const ContractsLoading(),
        ContractsLoaded(
          contracts: contracts,
          typeFilter: 'OWNERSHIP_PROGRAM',
        ),
      ],
    );

    blocTest<ContractsCubit, ContractsState>(
      'filterByType(null) charge tous les contrats',
      build: () {
        when(() => repo.getContracts(
              type: any(named: 'type'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => contracts);
        return cubit;
      },
      act: (c) => c.filterByType(null),
      expect: () => [
        const ContractsLoading(),
        ContractsLoaded(contracts: contracts),
      ],
    );
  });

  group('ContractsCubit — refresh', () {
    final contracts = [_makeContract('c1', ContractType.partnerFleet)];

    blocTest<ContractsCubit, ContractsState>(
      'refresh() conserve le typeFilter courant',
      build: () {
        when(() => repo.getContracts(
              type: any(named: 'type'),
              page: any(named: 'page'),
              limit: any(named: 'limit'),
            )).thenAnswer((_) async => contracts);
        return cubit;
      },
      seed: () => ContractsLoaded(
        contracts: contracts,
        typeFilter: 'PARTNER_FLEET',
      ),
      act: (c) => c.refresh(),
      expect: () => [
        const ContractsLoading(),
        ContractsLoaded(contracts: contracts, typeFilter: 'PARTNER_FLEET'),
      ],
      verify: (_) {
        verify(() => repo.getContracts(
              type: 'PARTNER_FLEET',
              page: 1,
              limit: 50,
            )).called(1);
      },
    );
  });
}
