/// Exceptions API Fleet Platform
/// Mappe les erreurs HTTP et réseau en exceptions typées
library;

sealed class ApiException implements Exception {
  const ApiException(this.message);
  final String message;

  @override
  String toString() => 'ApiException($message)';
}

/// 401 — Token expiré ou invalide
class UnauthorizedException extends ApiException {
  const UnauthorizedException([super.message = 'Non authentifié']);
}

/// 403 — Accès refusé (rôle ou permission insuffisant)
class ForbiddenException extends ApiException {
  const ForbiddenException([super.message = 'Accès refusé']);
}

/// 404 — Ressource introuvable
class NotFoundException extends ApiException {
  const NotFoundException([super.message = 'Ressource introuvable']);
}

/// 422 — Validation DTO échouée
class ValidationException extends ApiException {
  final List<String> errors;

  const ValidationException(this.errors, [String? message])
      : super(message ?? 'Données invalides');
}

/// 429 — Trop de requêtes (rate limiting)
class TooManyRequestsException extends ApiException {
  const TooManyRequestsException(
      [super.message = 'Trop de tentatives, réessayez plus tard']);
}

/// 5xx — Erreur serveur
class ServerException extends ApiException {
  final int statusCode;
  const ServerException(this.statusCode, [super.message = 'Erreur serveur']);
}

/// Réseau non disponible
class NetworkException extends ApiException {
  const NetworkException([super.message = 'Connexion réseau indisponible']);
}

/// Timeout
class TimeoutException extends ApiException {
  const TimeoutException([super.message = 'Délai d\'attente dépassé']);
}

/// Erreur inconnue
class UnknownException extends ApiException {
  const UnknownException([super.message = 'Erreur inconnue']);
}
