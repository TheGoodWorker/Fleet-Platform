import 'package:flutter_test/flutter_test.dart';

import 'package:fleet_mobile/features/auth/presentation/bloc/auth_state.dart';
import 'package:fleet_mobile/features/auth/domain/entities/user.dart';
import 'package:fleet_mobile/shared/permissions/user_role.dart';
import 'package:fleet_mobile/navigation/app_router.dart';

/// Tests de navigation — guard d'authentification
///
/// On teste la logique de redirection du router SANS instancier GoRouter
/// (ce qui nécessiterait un contexte Flutter complet), en vérifiant directement
/// la logique de décision basée sur [AuthState].
///
/// Principe : pour chaque (authState, currentRoute) on détermine la route
/// cible attendue et on valide la règle de redirection.
void main() {
  const testUser = User(
    id: 'user-1',
    firstName: 'Admin',
    lastName: 'Fleet',
    role: UserRole.admin,
    email: 'admin@fleet.local',
  );

  /// Réplique la logique de redirect() du router pour les tests unitaires.
  String? computeRedirect(AuthState authState, String currentPath) {
    final isLoginRoute = currentPath == AppRoutes.login;
    return switch (authState) {
      AuthInitial() || AuthLoading() => null,
      AuthAuthenticated() => isLoginRoute ? AppRoutes.dashboard : null,
      AuthUnauthenticated() || AuthError() =>
        isLoginRoute ? null : AppRoutes.login,
    };
  }

  group('AuthGuard — utilisateur non authentifié', () {
    test('redirige vers /login depuis /dashboard', () {
      final redirect = computeRedirect(
        const AuthUnauthenticated(),
        AppRoutes.dashboard,
      );
      expect(redirect, AppRoutes.login);
    });

    test('redirige vers /login depuis /vehicles', () {
      final redirect = computeRedirect(
        const AuthUnauthenticated(),
        AppRoutes.vehicles,
      );
      expect(redirect, AppRoutes.login);
    });

    test('redirige vers /login depuis /contracts', () {
      final redirect = computeRedirect(
        const AuthUnauthenticated(),
        AppRoutes.contracts,
      );
      expect(redirect, AppRoutes.login);
    });

    test('ne redirige pas depuis /login (reste sur /login)', () {
      final redirect = computeRedirect(
        const AuthUnauthenticated(),
        AppRoutes.login,
      );
      expect(redirect, isNull);
    });

    test('AuthError redirige également vers /login', () {
      final redirect = computeRedirect(
        const AuthError('session expirée'),
        AppRoutes.vehicles,
      );
      expect(redirect, AppRoutes.login);
    });
  });

  group('AuthGuard — utilisateur authentifié', () {
    test('ne redirige pas depuis /dashboard', () {
      final redirect = computeRedirect(
        const AuthAuthenticated(testUser),
        AppRoutes.dashboard,
      );
      expect(redirect, isNull);
    });

    test('ne redirige pas depuis /vehicles', () {
      final redirect = computeRedirect(
        const AuthAuthenticated(testUser),
        AppRoutes.vehicles,
      );
      expect(redirect, isNull);
    });

    test('ne redirige pas depuis /contracts', () {
      final redirect = computeRedirect(
        const AuthAuthenticated(testUser),
        AppRoutes.contracts,
      );
      expect(redirect, isNull);
    });

    test('redirige depuis /login vers /dashboard', () {
      final redirect = computeRedirect(
        const AuthAuthenticated(testUser),
        AppRoutes.login,
      );
      expect(redirect, AppRoutes.dashboard);
    });
  });

  group('AuthGuard — état Initial / Loading (splash)', () {
    test('ne redirige pas (splash attend la vérification)', () {
      expect(
        computeRedirect(const AuthInitial(), AppRoutes.dashboard),
        isNull,
      );
    });

    test('AuthLoading ne redirige pas non plus', () {
      expect(
        computeRedirect(const AuthLoading(), AppRoutes.login),
        isNull,
      );
    });
  });

  group('AppRoutes — constantes de routes', () {
    test('toutes les routes sont définies', () {
      expect(AppRoutes.login, '/login');
      expect(AppRoutes.dashboard, '/dashboard');
      expect(AppRoutes.vehicles, '/vehicles');
      expect(AppRoutes.drivers, '/drivers');
      expect(AppRoutes.contracts, '/contracts');
      expect(AppRoutes.payments, '/payments');
      expect(AppRoutes.documents, '/documents');
    });
  });
}
