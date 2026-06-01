/// Rôles utilisateur Fleet Platform
/// Hiérarchie : ADMIN > SUPER_MANAGER > MANAGER > DRIVER
/// OWNER est un rôle parallèle (propriétaire de véhicule)
enum UserRole {
  admin('ADMIN'),
  superManager('SUPER_MANAGER'),
  manager('MANAGER'),
  driver('DRIVER'),
  owner('OWNER');

  const UserRole(this.value);
  final String value;

  static UserRole fromString(String value) {
    return UserRole.values.firstWhere(
      (r) => r.value == value,
      orElse: () => UserRole.driver,
    );
  }

  /// Hiérarchie numérique — plus le niveau est haut, plus le rôle est élevé
  int get level => switch (this) {
        UserRole.admin => 5,
        UserRole.superManager => 4,
        UserRole.manager => 3,
        UserRole.driver => 1,
        UserRole.owner => 2,
      };

  /// L'utilisateur a au moins ce niveau de rôle
  bool hasAtLeast(UserRole required) => level >= required.level;

  /// Label lisible
  String get label => switch (this) {
        UserRole.admin => 'Administrateur',
        UserRole.superManager => 'Super Manager',
        UserRole.manager => 'Manager',
        UserRole.driver => 'Chauffeur',
        UserRole.owner => 'Propriétaire',
      };
}
