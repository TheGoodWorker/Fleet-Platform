import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/presentation/bloc/auth_bloc.dart';
import '../features/auth/presentation/bloc/auth_state.dart';
import '../features/auth/presentation/pages/login_page.dart';
import '../features/contracts/presentation/cubit/contract_detail_cubit.dart';
import '../features/contracts/presentation/cubit/contracts_cubit.dart';
import '../features/contracts/presentation/pages/contract_detail_page.dart';
import '../features/contracts/presentation/pages/contract_form_page.dart';
import '../features/contracts/presentation/pages/contracts_page.dart';
import '../features/dashboard/presentation/pages/dashboard_page.dart';
import '../features/documents/presentation/cubit/documents_cubit.dart';
import '../features/documents/presentation/pages/documents_page.dart';
import '../features/drivers/presentation/cubit/driver_detail_cubit.dart';
import '../features/drivers/presentation/cubit/drivers_cubit.dart';
import '../features/drivers/presentation/pages/driver_detail_page.dart';
import '../features/drivers/presentation/pages/driver_form_page.dart';
import '../features/drivers/presentation/pages/drivers_page.dart';
import '../features/payments/presentation/cubit/payments_cubit.dart';
import '../features/payments/presentation/pages/payment_detail_page.dart';
import '../features/payments/presentation/pages/payments_page.dart';
import '../features/vehicles/presentation/cubit/vehicle_detail_cubit.dart';
import '../features/vehicles/presentation/cubit/vehicles_cubit.dart';
import '../features/vehicles/presentation/pages/vehicle_detail_page.dart';
import '../features/vehicles/presentation/pages/vehicle_form_page.dart';
import '../features/vehicles/presentation/pages/vehicles_page.dart';
import '../features/incidents/presentation/cubit/incident_detail_cubit.dart';
import '../features/incidents/presentation/cubit/incidents_cubit.dart';
import '../features/incidents/presentation/pages/incident_detail_page.dart';
import '../features/incidents/presentation/pages/incident_form_page.dart';
import '../features/incidents/presentation/pages/incidents_page.dart';
import '../features/assignments/presentation/cubit/assignments_cubit.dart';
import '../features/assignments/presentation/pages/assignments_page.dart';
import '../core/di/injection.dart';
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
  static const String incidents = '/incidents';
  static const String assignments = '/assignments';

  static String vehicleDetail(String id) => '/vehicles/$id';
  static const String vehicleNew = '/vehicles/new';
  static String vehicleEdit(String id) => '/vehicles/$id/edit';
  static String driverDetail(String id) => '/drivers/$id';
  static const String driverNew = '/drivers/new';
  static String contractDetail(String id) => '/contracts/$id';
  static const String contractNew = '/contracts/new';
  static String paymentDetail(String id) => '/payments/$id';
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
            builder: (context, state) => BlocProvider(
              create: (_) => sl<VehiclesCubit>(),
              child: const VehiclesPage(),
            ),
          ),
          GoRoute(
            path: '/vehicles/new',
            name: 'vehicleNew',
            builder: (context, state) => BlocProvider(
              create: (_) => sl<VehicleDetailCubit>(),
              child: const VehicleFormPage(),
            ),
          ),
          GoRoute(
            path: '/vehicles/:id',
            name: 'vehicleDetail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return BlocProvider(
                create: (_) => sl<VehicleDetailCubit>()..load(id),
                child: VehicleDetailPage(vehicleId: id),
              );
            },
          ),
          GoRoute(
            path: '/vehicles/:id/edit',
            name: 'vehicleEdit',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return BlocProvider(
                create: (_) => sl<VehicleDetailCubit>()..load(id),
                child: VehicleFormPage(vehicleId: id),
              );
            },
          ),
          GoRoute(
            path: AppRoutes.drivers,
            name: 'drivers',
            builder: (context, state) => BlocProvider(
              create: (_) => sl<DriversCubit>(),
              child: const DriversPage(),
            ),
          ),
          GoRoute(
            path: '/drivers/new',
            name: 'driverNew',
            builder: (context, state) => BlocProvider(
              create: (_) => sl<DriverDetailCubit>(),
              child: const DriverFormPage(),
            ),
          ),
          GoRoute(
            path: '/drivers/:id',
            name: 'driverDetail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return BlocProvider(
                create: (_) => sl<DriverDetailCubit>()..load(id),
                child: DriverDetailPage(driverId: id),
              );
            },
          ),
          GoRoute(
            path: AppRoutes.contracts,
            name: 'contracts',
            builder: (context, state) => BlocProvider(
              create: (_) => sl<ContractsCubit>(),
              child: const ContractsPage(),
            ),
          ),
          GoRoute(
            path: '/contracts/new',
            name: 'contractNew',
            builder: (context, state) => BlocProvider(
              create: (_) => sl<ContractDetailCubit>(),
              child: const ContractFormPage(),
            ),
          ),
          GoRoute(
            path: '/contracts/:id',
            name: 'contractDetail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return BlocProvider(
                create: (_) => sl<ContractDetailCubit>()..load(id),
                child: ContractDetailPage(contractId: id),
              );
            },
          ),
          GoRoute(
            path: AppRoutes.payments,
            name: 'payments',
            builder: (context, state) => BlocProvider(
              create: (_) => sl<PaymentsCubit>(),
              child: const PaymentsPage(),
            ),
          ),
          GoRoute(
            path: '/payments/:id',
            name: 'paymentDetail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return BlocProvider.value(
                value: sl<PaymentsCubit>(),
                child: PaymentDetailPage(paymentId: id),
              );
            },
          ),
          GoRoute(
            path: AppRoutes.documents,
            name: 'documents',
            builder: (context, state) => BlocProvider(
              create: (_) => sl<DocumentsCubit>(),
              child: const DocumentsPage(),
            ),
          ),

          // ── Incidents ─────────────────────────────────────────────
          GoRoute(
            path: AppRoutes.incidents,
            name: 'incidents',
            builder: (context, state) => BlocProvider(
              create: (_) => sl<IncidentsCubit>(),
              child: const IncidentsPage(),
            ),
            routes: [
              GoRoute(
                path: 'new',
                name: 'incident-new',
                builder: (context, state) => const IncidentFormPage(),
              ),
              GoRoute(
                path: ':id',
                name: 'incident-detail',
                builder: (context, state) {
                  final id = state.pathParameters['id']!;
                  return BlocProvider(
                    create: (_) => sl<IncidentDetailCubit>()..load(id),
                    child: IncidentDetailPage(incidentId: id),
                  );
                },
              ),
            ],
          ),
          // ── Assignments ───────────────────────────────────────────
          GoRoute(
            path: AppRoutes.assignments,
            name: 'assignments',
            builder: (context, state) => BlocProvider(
              create: (_) => sl<AssignmentsCubit>(),
              child: const AssignmentsPage(),
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
