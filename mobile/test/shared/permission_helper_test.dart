import 'package:flutter_test/flutter_test.dart';

import 'package:fleet_mobile/features/auth/domain/entities/user.dart';
import 'package:fleet_mobile/shared/permissions/permission_helper.dart';
import 'package:fleet_mobile/shared/permissions/user_role.dart';

User buildUser(UserRole role) => User(
      id: 'user-${role.value}',
      firstName: 'Test',
      lastName: 'User',
      role: role,
    );

void main() {
  group('UserRole — hiérarchie', () {
    test('ADMIN a le niveau le plus élevé', () {
      expect(UserRole.admin.level, greaterThan(UserRole.superManager.level));
      expect(UserRole.admin.hasAtLeast(UserRole.manager), isTrue);
    });

    test('DRIVER ne peut pas accéder aux fonctions MANAGER', () {
      expect(UserRole.driver.hasAtLeast(UserRole.manager), isFalse);
    });

    test('MANAGER peut accéder aux fonctions MANAGER', () {
      expect(UserRole.manager.hasAtLeast(UserRole.manager), isTrue);
    });

    test('fromString retourne le bon rôle', () {
      expect(UserRole.fromString('ADMIN'), UserRole.admin);
      expect(UserRole.fromString('SUPER_MANAGER'), UserRole.superManager);
      expect(UserRole.fromString('MANAGER'), UserRole.manager);
      expect(UserRole.fromString('DRIVER'), UserRole.driver);
      expect(UserRole.fromString('OWNER'), UserRole.owner);
    });

    test('fromString fallback sur DRIVER pour valeur inconnue', () {
      expect(UserRole.fromString('UNKNOWN'), UserRole.driver);
    });
  });

  group('PermissionHelper — canAccessModule()', () {
    test('tous les rôles accèdent au dashboard', () {
      for (final role in UserRole.values) {
        expect(
          PermissionHelper.canAccessModule(buildUser(role), AppModule.dashboard),
          isTrue,
          reason: '${role.value} doit accéder au dashboard',
        );
      }
    });

    test('DRIVER ne peut pas accéder au module drivers', () {
      expect(
        PermissionHelper.canAccessModule(
          buildUser(UserRole.driver),
          AppModule.drivers,
        ),
        isFalse,
      );
    });

    test('MANAGER peut accéder au module drivers', () {
      expect(
        PermissionHelper.canAccessModule(
          buildUser(UserRole.manager),
          AppModule.drivers,
        ),
        isTrue,
      );
    });

    test('OWNER accède au portail owner', () {
      expect(
        PermissionHelper.canAccessModule(
          buildUser(UserRole.owner),
          AppModule.ownerPortal,
        ),
        isTrue,
      );
    });

    test('MANAGER n\'accède pas au portail owner', () {
      expect(
        PermissionHelper.canAccessModule(
          buildUser(UserRole.manager),
          AppModule.ownerPortal,
        ),
        isFalse,
      );
    });

    test('null user retourne false partout', () {
      for (final module in AppModule.values) {
        expect(
          PermissionHelper.canAccessModule(null, module),
          isFalse,
          reason: 'null user ne doit pas accéder à ${module.name}',
        );
      }
    });
  });

  group('PermissionHelper — visibleForRoles()', () {
    test('retourne true si le rôle est dans la liste', () {
      expect(
        PermissionHelper.visibleForRoles(
          buildUser(UserRole.admin),
          [UserRole.admin, UserRole.superManager],
        ),
        isTrue,
      );
    });

    test('retourne false si le rôle n\'est pas dans la liste', () {
      expect(
        PermissionHelper.visibleForRoles(
          buildUser(UserRole.driver),
          [UserRole.admin, UserRole.superManager],
        ),
        isFalse,
      );
    });
  });

  group('PermissionHelper — canCreate/canEdit/canDelete()', () {
    test('SUPER_MANAGER peut créer', () {
      expect(
        PermissionHelper.canCreate(buildUser(UserRole.superManager)),
        isTrue,
      );
    });

    test('MANAGER peut éditer', () {
      expect(
        PermissionHelper.canEdit(buildUser(UserRole.manager)),
        isTrue,
      );
    });

    test('seul ADMIN peut supprimer', () {
      expect(
        PermissionHelper.canDelete(buildUser(UserRole.admin)),
        isTrue,
      );
      expect(
        PermissionHelper.canDelete(buildUser(UserRole.superManager)),
        isFalse,
      );
    });
  });
}
