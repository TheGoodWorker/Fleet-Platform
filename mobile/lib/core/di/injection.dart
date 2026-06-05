import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';

import '../api/api_client.dart';
import '../storage/token_storage.dart';
import '../../features/auth/data/datasources/auth_remote_datasource.dart';
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/domain/usecases/login_usecase.dart';
import '../../features/auth/domain/usecases/logout_usecase.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/bloc/auth_event.dart';

import '../../features/vehicles/data/datasources/vehicle_remote_datasource.dart';
import '../../features/vehicles/data/repositories/vehicle_repository_impl.dart';
import '../../features/vehicles/domain/repositories/vehicle_repository.dart';
import '../../features/vehicles/presentation/cubit/vehicle_detail_cubit.dart';
import '../../features/vehicles/presentation/cubit/vehicles_cubit.dart';

import '../../features/drivers/data/datasources/driver_remote_datasource.dart';
import '../../features/drivers/data/repositories/driver_repository_impl.dart';
import '../../features/drivers/domain/repositories/driver_repository.dart';
import '../../features/drivers/presentation/cubit/driver_detail_cubit.dart';
import '../../features/drivers/presentation/cubit/drivers_cubit.dart';

import '../../features/contracts/data/datasources/contract_remote_datasource.dart';
import '../../features/contracts/data/repositories/contract_repository_impl.dart';
import '../../features/contracts/domain/repositories/contract_repository.dart';
import '../../features/contracts/presentation/cubit/contract_detail_cubit.dart';
import '../../features/contracts/presentation/cubit/contracts_cubit.dart';

import '../../features/payments/data/datasources/payment_remote_datasource.dart';
import '../../features/payments/data/repositories/payment_repository_impl.dart';
import '../../features/payments/domain/repositories/payment_repository.dart';
import '../../features/payments/presentation/cubit/payments_cubit.dart';

import '../../features/documents/data/datasources/document_remote_datasource.dart';
import '../../features/documents/data/repositories/document_repository_impl.dart';
import '../../features/documents/domain/repositories/document_repository.dart';
import '../../features/documents/presentation/cubit/documents_cubit.dart';

/// Service locator GetIt
final GetIt sl = GetIt.instance;

Future<void> configureDependencies() async {
  // ─── Storage ───────────────────────────────────────────────────────────────
  sl.registerLazySingleton<TokenStorage>(
    () => SecureTokenStorage(),
  );

  // ─── API Client ────────────────────────────────────────────────────────────
  sl.registerLazySingleton<ApiClient>(
    () => ApiClient(
      tokenStorage: sl<TokenStorage>(),
      onLogout: () async {
        // 1. Effacer les tokens du stockage sécurisé
        await sl<TokenStorage>().clearTokens();
        // 2. Signaler l'AuthBloc → redirige vers /login via GoRouter
        if (sl.isRegistered<AuthBloc>()) {
          sl<AuthBloc>().add(const AuthLogoutRequested());
        }
      },
    ),
  );

  // Exposer le Dio directement pour usage dans les datasources
  sl.registerLazySingleton<Dio>(
    () => sl<ApiClient>().dio,
  );

  // ─── Auth — Data ───────────────────────────────────────────────────────────
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(sl<Dio>()),
  );

  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      remoteDataSource: sl<AuthRemoteDataSource>(),
      tokenStorage: sl<TokenStorage>(),
    ),
  );

  // ─── Auth — Domain ─────────────────────────────────────────────────────────
  sl.registerLazySingleton<LoginUseCase>(
    () => LoginUseCase(sl<AuthRepository>()),
  );

  sl.registerLazySingleton<LogoutUseCase>(
    () => LogoutUseCase(sl<AuthRepository>()),
  );

  // ─── Auth — BLoC ───────────────────────────────────────────────────────────
  sl.registerLazySingleton<AuthBloc>(
    () => AuthBloc(
      authRepository: sl<AuthRepository>(),
      loginUseCase: sl<LoginUseCase>(),
      logoutUseCase: sl<LogoutUseCase>(),
    ),
  );

  // ─── Vehicles — Data ───────────────────────────────────────────────────────
  sl.registerLazySingleton<VehicleRemoteDataSource>(
    () => VehicleRemoteDataSourceImpl(sl<Dio>()),
  );

  sl.registerLazySingleton<VehicleRepository>(
    () => VehicleRepositoryImpl(sl<VehicleRemoteDataSource>()),
  );

  // Cubit créé à chaque navigation (factory)
  sl.registerFactory<VehiclesCubit>(
    () => VehiclesCubit(sl<VehicleRepository>()),
  );

  sl.registerFactory<VehicleDetailCubit>(
    () => VehicleDetailCubit(sl<VehicleRepository>()),
  );

  // ─── Drivers — Data ────────────────────────────────────────────────────────
  sl.registerLazySingleton<DriverRemoteDataSource>(
    () => DriverRemoteDataSourceImpl(sl<Dio>()),
  );

  sl.registerLazySingleton<DriverRepository>(
    () => DriverRepositoryImpl(sl<DriverRemoteDataSource>()),
  );

  sl.registerFactory<DriversCubit>(
    () => DriversCubit(sl<DriverRepository>()),
  );

  sl.registerFactory<DriverDetailCubit>(
    () => DriverDetailCubit(sl<DriverRepository>()),
  );

  // ─── Contracts — Data ──────────────────────────────────────────────────────
  sl.registerLazySingleton<ContractRemoteDataSource>(
    () => ContractRemoteDataSourceImpl(sl<Dio>()),
  );

  sl.registerLazySingleton<ContractRepository>(
    () => ContractRepositoryImpl(sl<ContractRemoteDataSource>()),
  );

  sl.registerFactory<ContractsCubit>(
    () => ContractsCubit(sl<ContractRepository>()),
  );

  sl.registerFactory<ContractDetailCubit>(
    () => ContractDetailCubit(sl<ContractRepository>()),
  );

  // ─── Payments — Data ───────────────────────────────────────────────────────
  sl.registerLazySingleton<PaymentRemoteDataSource>(
    () => PaymentRemoteDataSourceImpl(sl<Dio>()),
  );

  sl.registerLazySingleton<PaymentRepository>(
    () => PaymentRepositoryImpl(sl<PaymentRemoteDataSource>()),
  );

  sl.registerFactory<PaymentsCubit>(
    () => PaymentsCubit(sl<PaymentRepository>()),
  );

  // ─── Documents — Data ──────────────────────────────────────────────────────
  sl.registerLazySingleton<DocumentRemoteDataSource>(
    () => DocumentRemoteDataSourceImpl(sl<Dio>()),
  );

  sl.registerLazySingleton<DocumentRepository>(
    () => DocumentRepositoryImpl(sl<DocumentRemoteDataSource>()),
  );

  sl.registerFactory<DocumentsCubit>(
    () => DocumentsCubit(sl<DocumentRepository>()),
  );
}
