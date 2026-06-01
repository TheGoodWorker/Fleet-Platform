import 'package:equatable/equatable.dart';

import '../../domain/entities/user.dart';

sealed class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

/// État initial — vérification en cours (splash)
class AuthInitial extends AuthState {
  const AuthInitial();
}

/// Chargement en cours (login / logout)
class AuthLoading extends AuthState {
  const AuthLoading();
}

/// Utilisateur authentifié
class AuthAuthenticated extends AuthState {
  const AuthAuthenticated(this.user);

  final User user;

  @override
  List<Object?> get props => [user];
}

/// Utilisateur non authentifié
class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

/// Erreur d'authentification
class AuthError extends AuthState {
  const AuthError(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}
