import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injection.dart';
import '../../../../features/auth/domain/entities/user.dart';
import '../../../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../../../features/auth/presentation/bloc/auth_event.dart';
import '../../../../features/auth/presentation/bloc/auth_state.dart';
import '../../../../shared/permissions/permission_helper.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../navigation/app_router.dart';
import '../cubit/dashboard_cubit.dart';
import '../cubit/dashboard_state.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<DashboardCubit>()..load(),
      child: const _DashboardView(),
    );
  }
}

class _DashboardView extends StatelessWidget {
  const _DashboardView();

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    final user = authState is AuthAuthenticated ? authState.user : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Fleet Platform'),
        actions: [
          // Rafraîchir les KPI
          BlocBuilder<DashboardCubit, DashboardState>(
            builder: (ctx, state) => IconButton(
              icon: state is DashboardLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors.primary),
                    )
                  : const Icon(Icons.refresh_outlined),
              tooltip: 'Rafraîchir',
              onPressed: state is DashboardLoading
                  ? null
                  : () => ctx.read<DashboardCubit>().refresh(),
            ),
          ),
          // Menu déconnexion
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (value) {
              if (value == 'logout') {
                context.read<AuthBloc>().add(const AuthLogoutRequested());
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 18, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Déconnexion',
                        style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => context.read<DashboardCubit>().refresh(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Profil utilisateur ─────────────────────────────────────
              _UserProfileCard(user: user),
              const SizedBox(height: 20),

              // ── KPI Dashboard ──────────────────────────────────────────
              BlocBuilder<DashboardCubit, DashboardState>(
                builder: (context, state) => switch (state) {
                  DashboardLoading() => const _KpiSkeleton(),
                  DashboardError(:final message) => _KpiError(
                      message: message,
                      onRetry: () =>
                          context.read<DashboardCubit>().load(),
                    ),
                  DashboardLoaded(:final data) => _KpiSections(data: data),
                  _ => const _KpiSkeleton(),
                },
              ),

              const SizedBox(height: 20),

              // ── Modules de navigation ──────────────────────────────────
              const Text(
                'Navigation',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 10),
              _ModuleGrid(user: user),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

// ── KPI Sections ──────────────────────────────────────────────────────────────

class _KpiSections extends StatelessWidget {
  const _KpiSections({required this.data});

  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Alertes en tête si > 0
        if (data.alertCount > 0) ...[
          _SectionTitle(
            label: 'Alertes',
            badge: data.alertCount,
            badgeColor: AppColors.error,
          ),
          const SizedBox(height: 8),
          _KpiRow(children: [
            _KpiCard(
              label: 'Docs expirés',
              value: '${data.documentsExpired}',
              icon: Icons.warning_amber_outlined,
              color: AppColors.error,
            ),
            _KpiCard(
              label: 'Expirent bientôt',
              value: '${data.documentsExpiringSoon}',
              icon: Icons.timer_outlined,
              color: AppColors.warning,
            ),
          ]),
          const SizedBox(height: 8),
          _KpiRow(children: [
            _KpiCard(
              label: 'Sans chauffeur',
              value: '${data.vehiclesWithoutDriver}',
              icon: Icons.person_off_outlined,
              color: AppColors.warning,
            ),
            _KpiCard(
              label: 'Sans contrat',
              value: '${data.vehiclesWithoutActiveContract}',
              icon: Icons.directions_car_outlined,
              color: AppColors.textSecondary,
            ),
          ]),
          const SizedBox(height: 20),
        ],

        // Paiements
        const _SectionTitle(label: 'Paiements'),
        const SizedBox(height: 8),
        _KpiRow(children: [
          _KpiCard(
            label: "Encaissé aujourd'hui",
            value: _fmtAmount(data.paymentsToday),
            icon: Icons.today_outlined,
            color: AppColors.primary,
            suffix: 'F',
          ),
          _KpiCard(
            label: 'Ce mois',
            value: _fmtAmount(data.paymentsThisMonth),
            icon: Icons.calendar_month_outlined,
            color: AppColors.primary,
            suffix: 'F',
          ),
        ]),
        const SizedBox(height: 8),
        _KpiRow(children: [
          _KpiCard(
            label: "Paiements aujourd'hui",
            value: '${data.paymentCountToday}',
            icon: Icons.receipt_outlined,
            color: AppColors.info,
          ),
          _KpiCard(
            label: 'En attente',
            value: '${data.paymentsPending}',
            icon: Icons.hourglass_empty_outlined,
            color: AppColors.warning,
          ),
        ]),
        const SizedBox(height: 20),

        // Véhicules
        const _SectionTitle(label: 'Véhicules'),
        const SizedBox(height: 8),
        _KpiRow(children: [
          _KpiCard(
            label: 'Total',
            value: '${data.vehiclesTotal}',
            icon: Icons.directions_car_outlined,
            color: AppColors.primary,
          ),
          _KpiCard(
            label: 'Disponibles',
            value: '${data.vehiclesAvailable}',
            icon: Icons.check_circle_outline,
            color: AppColors.success,
          ),
        ]),
        const SizedBox(height: 8),
        _KpiRow(children: [
          _KpiCard(
            label: 'Assignés/En service',
            value: '${data.vehiclesAssignedOrInService}',
            icon: Icons.local_shipping_outlined,
            color: AppColors.info,
          ),
          _KpiCard(
            label: 'Immob./Répar.',
            value: '${data.vehiclesImmobilized}',
            icon: Icons.build_outlined,
            color: AppColors.warning,
          ),
        ]),
        const SizedBox(height: 20),

        // Chauffeurs
        const _SectionTitle(label: 'Chauffeurs'),
        const SizedBox(height: 8),
        _KpiRow(children: [
          _KpiCard(
            label: 'Total',
            value: '${data.driversTotal}',
            icon: Icons.people_outlined,
            color: AppColors.primary,
          ),
          _KpiCard(
            label: 'Actifs',
            value: '${data.driversActive}',
            icon: Icons.person_pin_outlined,
            color: AppColors.success,
          ),
        ]),
        const SizedBox(height: 8),
        _KpiRow(children: [
          _KpiCard(
            label: 'KYC / Terrain',
            value: '${data.driversPendingKyc}',
            icon: Icons.assignment_ind_outlined,
            color: AppColors.warning,
          ),
          _KpiCard(
            label: 'Suspendus/Risque',
            value: '${data.driversAtRiskOrSuspended}',
            icon: Icons.person_off_outlined,
            color: AppColors.error,
          ),
        ]),
        const SizedBox(height: 20),

        // Contrats
        const _SectionTitle(label: 'Contrats'),
        const SizedBox(height: 8),
        _KpiRow(children: [
          _KpiCard(
            label: 'Total',
            value: '${data.contractsTotal}',
            icon: Icons.description_outlined,
            color: AppColors.primary,
          ),
          _KpiCard(
            label: 'Actifs',
            value: '${data.contractsActive}',
            icon: Icons.check_circle_outline,
            color: AppColors.success,
          ),
        ]),
        const SizedBox(height: 8),
        _KpiRow(children: [
          _KpiCard(
            label: 'En attente',
            value: '${data.contractsPending}',
            icon: Icons.pending_outlined,
            color: AppColors.warning,
          ),
          _KpiCard(
            label: 'Terminés',
            value: '${data.contractsClosed}',
            icon: Icons.archive_outlined,
            color: AppColors.textSecondary,
          ),
        ]),
      ],
    );
  }

  String _fmtAmount(double amount) {
    final intAmount = amount.toInt();
    final str = intAmount.toString();
    final buf = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) buf.write(' ');
      buf.write(str[i]);
    }
    return buf.toString();
  }
}

// ── KPI Widgets ───────────────────────────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.label,
    this.badge,
    this.badgeColor,
  });

  final String label;
  final int? badge;
  final Color? badgeColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: AppColors.textSecondary,
            letterSpacing: 0.8,
          ),
        ),
        if (badge != null && badge! > 0) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: (badgeColor ?? AppColors.primary).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: (badgeColor ?? AppColors.primary).withValues(alpha: 0.4)),
            ),
            child: Text(
              '$badge',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: badgeColor ?? AppColors.primary,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _KpiRow extends StatelessWidget {
  const _KpiRow({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: children
          .expand((w) => [Expanded(child: w), const SizedBox(width: 8)])
          .toList()
        ..removeLast(),
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.suffix,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String? suffix;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: color,
                  height: 1,
                ),
              ),
              if (suffix != null) ...[
                const SizedBox(width: 2),
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text(
                    suffix!,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: color,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
              height: 1.2,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _KpiSkeleton extends StatelessWidget {
  const _KpiSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (int i = 0; i < 3; i++) ...[
          Container(
            height: 12,
            width: 80,
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          Row(
            children: [
              Expanded(child: _SkeletonCard()),
              const SizedBox(width: 8),
              Expanded(child: _SkeletonCard()),
            ],
          ),
          const SizedBox(height: 20),
        ],
      ],
    );
  }
}

class _SkeletonCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 96,
      decoration: BoxDecoration(
        color: AppColors.border.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
    );
  }
}

class _KpiError extends StatelessWidget {
  const _KpiError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.errorLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.error),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.error),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Impossible de charger les KPI\n$message',
              style: const TextStyle(fontSize: 13, color: AppColors.error),
            ),
          ),
          TextButton(
            onPressed: onRetry,
            child: const Text('Réessayer'),
          ),
        ],
      ),
    );
  }
}

// ── User Profile Card (inchangé) ──────────────────────────────────────────────

class _UserProfileCard extends StatelessWidget {
  const _UserProfileCard({this.user});

  final User? user;

  @override
  Widget build(BuildContext context) {
    final u = user;
    if (u == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: Colors.white.withValues(alpha: 0.2),
            child: Text(
              u.initials,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bienvenue,',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8),
                    fontSize: 14,
                  ),
                ),
                Text(
                  u.fullName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    u.role.label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Module Grid (inchangé) ────────────────────────────────────────────────────

class _ModuleGrid extends StatelessWidget {
  const _ModuleGrid({this.user});

  final User? user;

  static const _modules = [
    _ModuleItem('Véhicules', Icons.directions_car_outlined,
        AppRoutes.vehicles, AppModule.vehicles),
    _ModuleItem('Chauffeurs', Icons.people_outlined,
        AppRoutes.drivers, AppModule.drivers),
    _ModuleItem('Contrats', Icons.description_outlined,
        AppRoutes.contracts, AppModule.contracts),
    _ModuleItem('Paiements', Icons.payments_outlined,
        AppRoutes.payments, AppModule.payments),
    _ModuleItem('Documents', Icons.folder_outlined,
        AppRoutes.documents, AppModule.documents),
    _ModuleItem('Propriétaire', Icons.account_balance_outlined,
        AppRoutes.owner, AppModule.ownerPortal),
  ];

  @override
  Widget build(BuildContext context) {
    final visible = _modules
        .where((m) => PermissionHelper.canAccessModule(user, m.module))
        .toList();

    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
      childAspectRatio: 1.0,
      children: visible.map((m) => _ModuleTile(item: m)).toList(),
    );
  }
}

class _ModuleItem {
  const _ModuleItem(this.label, this.icon, this.route, this.module);
  final String label;
  final IconData icon;
  final String route;
  final AppModule module;
}

class _ModuleTile extends StatelessWidget {
  const _ModuleTile({required this.item});
  final _ModuleItem item;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: () => context.push(item.route),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(item.icon, color: AppColors.primary, size: 24),
            const SizedBox(height: 6),
            Text(
              item.label,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 11,
                color: AppColors.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
