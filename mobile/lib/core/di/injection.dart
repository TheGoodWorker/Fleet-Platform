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
        // Déclencher le logout dans le BLoC
        if (sl.isRegistered<AuthBloc>()) {
          // Le BLoC gère la déconnexion via son propre flux
        }
        await sl<TokenStorage>().clearTokens();
      },
    ),
  );

  // Exposer le Dio directement pour usage dans les pages
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
}
