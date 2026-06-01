import '../../features/auth/domain/entities/user.dart';
import 'user_role.dart';

/// Helper pour la gestion des permissions côté Flutter
/// Miroir simplifié du système RBAC backend

class PermissionHelper {
  const PermissionHelper._();

  /// L'utilisateur peut accéder à ce module
  static bool canAccessModule(User? user, AppModule module) {
    if (user == null) return false;
    return switch (module) {
      AppModule.dashboard => true, // tous les rôles
      AppModule.vehicles => true,  // tous (lecture scopée par rôle)
      AppModule.drivers =>
        user.role.hasAtLeast(UserRole.manager),
      AppModule.contracts =>
        user.role.hasAtLeast(UserRole.manager),
      AppModule.payments =>
        user.role.hasAtLeast(UserRole.manager),
      AppModule.charges =>
        user.role.hasAtLeast(UserRole.manager),
      AppModule.deposits =>
        user.role.hasAtLeast(UserRole.manager),
      AppModule.inspections =>
        user.role.hasAtLeast(UserRole.manager),
      AppModule.documents =>
        user.role.hasAtLeast(UserRole.manager),
      AppModule.notifications => true,
      AppModule.ownerPortal => user.role == UserRole.owner,
      AppModule.users =>
        user.role.hasAtLeast(UserRole.manager),
      AppModule.settings =>
        user.role.hasAtLeast(UserRole.superManager),
    };
  }

  /// Visible uniquement pour les rôles listés
  static bool visibleForRoles(User? user, List<UserRole> roles) {
    if (user == null) return false;
    return roles.contains(user.role);
  }

  /// Peut créer des ressources (SUPER_MANAGER+)
  static bool canCreate(User? user) =>
      user?.role.hasAtLeast(UserRole.superManager) ?? false;

  /// Peut modifier des ressources (MANAGER+)
  static bool canEdit(User? user) =>
      user?.role.hasAtLeast(UserRole.manager) ?? false;

  /// Peut supprimer des ressources (ADMIN uniquement)
  static bool canDelete(User? user) =>
      user?.role == UserRole.admin;

  /// Peut gérer les utilisateurs (SUPER_MANAGER+)
  static bool canManageUsers(User? user) =>
      user?.role.hasAtLeast(UserRole.superManager) ?? false;

  /// Peut valider des opérations sensibles (MANAGER+)
  static bool canValidate(User? user) =>
      user?.role.hasAtLeast(UserRole.manager) ?? false;
}

/// Modules de l'application Flutter
enum AppModule {
  dashboard,
  vehicles,
  drivers,
  contracts,
  payments,
  charges,
  deposits,
  inspections,
  documents,
  notifications,
  ownerPortal,
  users,
  settings,
}
