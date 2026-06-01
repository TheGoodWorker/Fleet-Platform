import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/presentation/bloc/auth_bloc.dart';
import '../features/auth/presentation/bloc/auth_state.dart';
import '../features/auth/presentation/pages/login_page.dart';
import '../features/dashboard/presentation/pages/dashboard_page.dart';
import '../features/vehicles/presentation/pages/vehicles_placeholder_page.dart';
import '../features/drivers/presentation/pages/drivers_placeholder_page.dart';
import '../shared/widgets/loading_view.dart';

/// Routes Fleet Platform
class AppRoutes {
  AppRoutes._();
  static const String login = '/login';
  static const String dashboard = '/dashboard';
  static const String vehicles = '/vehicles';
  static const String drivers = '/drivers';
  static const String contracts = '/contracts';
  static const String payments = '/payments';
  static const String documents = '/documents';
  static const String owner = '/owner';
  static const String notifications = '/notifications';
}

GoRouter createRouter(AuthBloc authBloc) {
  return GoRouter(
    initialLocation: AppRoutes.dashboard,
    debugLogDiagnostics: true,

    redirect: (context, state) {
      final authState = authBloc.state;
      final isLoginRoute = state.matchedLocation == AppRoutes.login;

      return switch (authState) {
        AuthInitial() || AuthLoading() => null, // splash — pas de redirect
        AuthAuthenticated() => isLoginRoute ? AppRoutes.dashboard : null,
        AuthUnauthenticated() || AuthError() =>
          isLoginRoute ? null : AppRoutes.login,
      };
    },

    refreshListenable: _AuthBlocListenable(authBloc),

    routes: [
      // ─── Auth ────────────────────────────────────────────────────────────
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),

      // ─── App Shell ───────────────────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.dashboard,
            name: 'dashboard',
            builder: (context, state) => const DashboardPage(),
          ),
          GoRoute(
            path: AppRoutes.vehicles,
            name: 'vehicles',
            builder: (context, state) => const VehiclesPlaceholderPage(),
          ),
          GoRoute(
            path: AppRoutes.drivers,
            name: 'drivers',
            builder: (context, state) => const DriversPlaceholderPage(),
          ),
          GoRoute(
            path: AppRoutes.contracts,
            name: 'contracts',
            builder: (context, state) => const _ComingSoonPage(
              title: 'Contrats',
              icon: Icons.description_outlined,
            ),
          ),
          GoRoute(
            path: AppRoutes.payments,
            name: 'payments',
            builder: (context, state) => const _ComingSoonPage(
              title: 'Paiements',
              icon: Icons.payment_outlined,
            ),
          ),
          GoRoute(
            path: AppRoutes.documents,
            name: 'documents',
            builder: (context, state) => const _ComingSoonPage(
              title: 'Documents',
              icon: Icons.folder_outlined,
            ),
          ),
          GoRoute(
            path: AppRoutes.owner,
            name: 'owner',
            builder: (context, state) => const _ComingSoonPage(
              title: 'Portail Propriétaire',
              icon: Icons.account_balance_outlined,
            ),
          ),
          GoRoute(
            path: AppRoutes.notifications,
            name: 'notifications',
            builder: (context, state) => const _ComingSoonPage(
              title: 'Notifications',
              icon: Icons.notifications_outlined,
            ),
          ),
        ],
      ),
    ],

    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Page introuvable: ${state.uri}'),
      ),
    ),
  );
}

/// Wrapper Material pour la navigation shell (bottom nav ou drawer)
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => child;
}

/// Listenable pour déclencher les redirections GoRouter quand AuthBloc change
class _AuthBlocListenable extends ChangeNotifier {
  _AuthBlocListenable(AuthBloc authBloc) {
    _subscription = authBloc.stream.listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

/// Page placeholder pour les modules non encore développés
class _ComingSoonPage extends StatelessWidget {
  const _ComingSoonPage({required this.title, required this.icon});

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Module en cours de développement',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}

/// Écran de chargement initial (splash)
class SplashPage extends StatelessWidget {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: LoadingView(message: 'Chargement...'),
    );
  }
}
