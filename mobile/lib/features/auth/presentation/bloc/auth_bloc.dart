import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/api/api_exception.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/repositories/auth_repository.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc({
    required AuthRepository authRepository,
    required LoginUseCase loginUseCase,
    required LogoutUseCase logoutUseCase,
  })  : _authRepository = authRepository,
        _loginUseCase = loginUseCase,
        _logoutUseCase = logoutUseCase,
        super(const AuthInitial()) {
    on<AuthCheckRequested>(_onCheckRequested);
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthLogoutRequested>(_onLogoutRequested);
  }

  final AuthRepository _authRepository;
  final LoginUseCase _loginUseCase;
  final LogoutUseCase _logoutUseCase;

  Future<void> _onCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final isAuth = await _authRepository.isAuthenticated();
      if (!isAuth) {
        emit(const AuthUnauthenticated());
        return;
      }
      final user = await _authRepository.getCurrentUser();
      emit(AuthAuthenticated(user));
    } on UnauthorizedException {
      emit(const AuthUnauthenticated());
    } catch (_) {
      // En cas d'erreur réseau au démarrage : montrer le login
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> _onLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final user = await _loginUseCase(
        LoginParams(
          email: event.email,
          phone: event.phone,
          password: event.password,
        ),
      );
      emit(AuthAuthenticated(user));
    } on UnauthorizedException {
      emit(const AuthError('Identifiants incorrects'));
    } on TooManyRequestsException {
      emit(const AuthError('Trop de tentatives. Réessayez dans une minute.'));
    } on NetworkException {
      emit(const AuthError('Connexion réseau indisponible'));
    } on TimeoutException {
      emit(const AuthError('Le serveur ne répond pas'));
    } catch (e) {
      emit(AuthError('Erreur inattendue : ${e.toString()}'));
    }
  }

  Future<void> _onLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      await _logoutUseCase();
    } catch (_) {
      // Logout silencieux — on déconnecte même en cas d'erreur
    }
    emit(const AuthUnauthenticated());
  }
}
