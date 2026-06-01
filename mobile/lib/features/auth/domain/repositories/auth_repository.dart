import '../entities/user.dart';

/// Contrat du repository Auth — couche domain
abstract class AuthRepository {
  /// Login par email+password ou phone+password
  /// Retourne l'utilisateur authentifié et stocke les tokens
  Future<User> login({
    String? email,
    String? phone,
    required String password,
  });

  /// Récupère le profil de l'utilisateur courant depuis /auth/me
  Future<User> getCurrentUser();

  /// Déconnecte l'utilisateur (révoque le refresh token)
  Future<void> logout();

  /// Vérifie si l'utilisateur est authentifié (token présent en storage)
  Future<bool> isAuthenticated();
}
