import 'package:equatable/equatable.dart';

sealed class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// Vérifie l'état d'authentification au démarrage de l'app
class AuthCheckRequested extends AuthEvent {
  const AuthCheckRequested();
}

/// L'utilisateur soumet le formulaire de login
class AuthLoginRequested extends AuthEvent {
  const AuthLoginRequested({
    this.email,
    this.phone,
    required this.password,
  });

  final String? email;
  final String? phone;
  final String password;

  @override
  List<Object?> get props => [email, phone, password];
}

/// L'utilisateur se déconnecte
class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}
