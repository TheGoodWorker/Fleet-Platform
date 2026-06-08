import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injection.dart';
import '../../../../features/auth/domain/entities/user.dart';
import '../../../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../../../features/auth/presentation/bloc/auth_event.dart';
import '../../../../features/auth/presentation/bloc/auth_state.dart';
import '../../../../navigation/app_router.dart';
import '../../../../shared/theme/app_theme.dart';
import '../cubit/dashboard_cubit.dart';
import '../cubit/dashboard_state.dart';

// ── Entry point ───────────────────────────────────────────────────────────────

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

// ── Main view ─────────────────────────────────────────────────────────────────

class _DashboardView extends StatelessWidget {
  const _DashboardView();

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    final user = authState is AuthAuthenticated ? authState.user : null;

    return Scaffold(
      backgroundColor: const Color(0xFFF0F2F5),
      appBar: _buildAppBar(context, user),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => context.read<DashboardCubit>().refresh(),
        child: BlocBuilder<DashboardCubit, DashboardState>(
          builder: (context, state) => switch (state) {
            DashboardInitial() || DashboardLoading() =>
              _buildLoadingBody(user),
            DashboardError(:final message) =>
              _buildErrorBody(context, user, message),
            DashboardLoaded(:final data) =>
              _buildBody(context, user, data),
          },
        ),
      ),
    );
  }

  AppBar _buildAppBar(BuildContext context, User? user) {
    return AppBar(
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      title: const Text(
        'Fleet Platform',
        style: TextStyle(fontWeight: FontWeight.w700, color: Colors.white),
      ),
      actions: [
        BlocBuilder<DashboardCubit, DashboardState>(
          builder: (ctx, state) => IconButton(
            icon: state is DashboardLoading
                ? const SizedBox(
                    width: 18, height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.refresh_outlined, color: Colors.white),
            onPressed: state is DashboardLoading
                ? null
                : () => ctx.read<DashboardCubit>().refresh(),
          ),
        ),
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert, color: Colors.white),
          onSelected: (v) {
            if (v == 'logout') {
              context.read<AuthBloc>().add(const AuthLogoutRequested());
            }
          },
          itemBuilder: (_) => const [
            PopupMenuItem(
              value: 'logout',
              child: Row(children: [
                Icon(Icons.logout, size: 18, color: Colors.red),
                SizedBox(width: 8),
                Text('Déconnexion', style: TextStyle(color: Colors.red)),
              ]),
            ),
          ],
        ),
      ],
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  Widget _buildLoadingBody(User? user) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        _HeaderBanner(user: user),
        const SizedBox(height: 16),
        _skel(160), const SizedBox(height: 12),
        _skel(120), const SizedBox(height: 12),
        _skel(140), const SizedBox(height: 12),
        _skel(110),
      ],
    );
  }

  Widget _skel(double h) => Container(
    height: h,
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.6),
      borderRadius: BorderRadius.circular(14),
    ),
  );

  // ── Error ───────────────────────────────────────────────────────────────────
  Widget _buildErrorBody(BuildContext context, User? user, String message) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        _HeaderBanner(user: user),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.errorLight,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.error),
          ),
          child: Row(
            children: [
              const Icon(Icons.error_outline, color: AppColors.error),
              const SizedBox(width: 12),
              Expanded(
                child: Text(message,
                    style: const TextStyle(color: AppColors.error)),
              ),
              TextButton(
                onPressed: () => context.read<DashboardCubit>().load(),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const _QuickActionsSection(data: DashboardData.empty),
      ],
    );
  }

  // ── Full dashboard ──────────────────────────────────────────────────────────
  Widget _buildBody(BuildContext context, User? user, DashboardData data) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        // ── 0. Greeting banner ────────────────────────────────────────────
        _HeaderBanner(user: user),
        const SizedBox(height: 16),

        // ── 1. Résumé exécutif ────────────────────────────────────────────
        _ExecSummary(data: data),
        const SizedBox(height: 12),

        // ── 2. Alertes ────────────────────────────────────────────────────
        _AlertsSection(data: data),
        const SizedBox(height: 12),

        // ── 3. État de la flotte ──────────────────────────────────────────
        _FleetStatusSection(data: data),
        const SizedBox(height: 12),

        // ── 4. État des chauffeurs ────────────────────────────────────────
        _DriverStatusSection(data: data),
        const SizedBox(height: 12),

        // ── 5. Finances ───────────────────────────────────────────────────
        _FinancesSection(data: data),
        const SizedBox(height: 12),

        // ── 6. Actions rapides ────────────────────────────────────────────
        _QuickActionsSection(data: data),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 0 — Greeting banner
// ═══════════════════════════════════════════════════════════════════════════════

class _HeaderBanner extends StatelessWidget {
  const _HeaderBanner({this.user});
  final User? user;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    const months = [
      'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
      'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
    ];
    final date = '${now.day} ${months[now.month - 1]} ${now.year}';
    final greeting = _greeting(now.hour);
    final name = user != null
        ? user!.firstName
        : 'Manager';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1A56DB), Color(0xFF1E429F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$greeting, $name 👋',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined,
                        size: 12, color: Colors.white70),
                    const SizedBox(width: 4),
                    Text(
                      date,
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 12),
                    ),
                    if (user != null) ...[
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          user!.role.label,
                          style: const TextStyle(
                              color: Colors.white, fontSize: 11,
                              fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          CircleAvatar(
            radius: 24,
            backgroundColor: Colors.white.withValues(alpha: 0.2),
            child: Text(
              user?.initials ?? '?',
              style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 16),
            ),
          ),
        ],
      ),
    );
  }

  String _greeting(int hour) {
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Résumé exécutif
// ═══════════════════════════════════════════════════════════════════════════════

class _ExecSummary extends StatelessWidget {
  const _ExecSummary({required this.data});
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'RÉSUMÉ EXÉCUTIF',
      icon: Icons.dashboard_outlined,
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 1.5,
        children: [
          _HeroKpi(
            value: '${data.vehiclesAssignedOrInService}',
            label: 'Véhicules\nen service',
            icon: Icons.local_shipping_outlined,
            color: AppColors.primary,
            sub: 'sur ${data.vehiclesTotal} total',
          ),
          _HeroKpi(
            value: '${data.driversActive}',
            label: 'Chauffeurs\nactifs',
            icon: Icons.person_pin_outlined,
            color: AppColors.success,
            sub: 'sur ${data.driversTotal} total',
          ),
          _HeroKpi(
            value: '${data.contractsActive}',
            label: 'Contrats\nactifs',
            icon: Icons.description_outlined,
            color: const Color(0xFF7E3AF2),
            sub: '${data.contractsPending} en attente',
          ),
          _HeroKpi(
            value: _fmtAmount(data.paymentsThisMonth),
            label: 'Revenus\ndu mois',
            icon: Icons.trending_up_outlined,
            color: const Color(0xFF057A55),
            sub: 'F CFA',
          ),
        ],
      ),
    );
  }

  String _fmtAmount(double v) {
    final n = v.toInt();
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(0)}k';
    return '$n';
  }
}

class _HeroKpi extends StatelessWidget {
  const _HeroKpi({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
    this.sub,
  });
  final String value;
  final String label;
  final IconData icon;
  final Color color;
  final String? sub;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: color),
              const Spacer(),
              Text(
                value,
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: color,
                  height: 1,
                ),
              ),
            ],
          ),
          const Spacer(),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
              height: 1.3,
            ),
          ),
          if (sub != null)
            Text(
              sub!,
              style: const TextStyle(
                  fontSize: 10, color: AppColors.textSecondary),
            ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Alertes
// ═══════════════════════════════════════════════════════════════════════════════

class _AlertsSection extends StatelessWidget {
  const _AlertsSection({required this.data});
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    if (data.alertCount == 0) {
      return _SectionCard(
        title: 'ATTENTION REQUISE',
        icon: Icons.notifications_outlined,
        badge: 0,
        badgeColor: AppColors.success,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          child: const Row(
            children: [
              Icon(Icons.check_circle_outline,
                  color: AppColors.success, size: 20),
              SizedBox(width: 10),
              Text(
                'Aucune alerte — tout est en ordre ✓',
                style: TextStyle(
                  color: AppColors.success,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final alerts = <_AlertItem>[];
    if (data.documentsExpired > 0) {
      alerts.add(_AlertItem(
        icon: Icons.assignment_late_outlined,
        color: AppColors.error,
        label: '${data.documentsExpired} document${data.documentsExpired > 1 ? 's' : ''} expiré${data.documentsExpired > 1 ? 's' : ''}',
        sublabel: 'Renouvellement urgent',
        route: AppRoutes.documents,
        severity: _Severity.critical,
      ));
    }
    if (data.documentsExpiringSoon > 0) {
      alerts.add(_AlertItem(
        icon: Icons.timer_outlined,
        color: AppColors.warning,
        label: '${data.documentsExpiringSoon} document${data.documentsExpiringSoon > 1 ? 's expirent' : ' expire'} bientôt',
        sublabel: 'À renouveler dans 30 jours',
        route: AppRoutes.documents,
        severity: _Severity.warning,
      ));
    }
    if (data.vehiclesWithoutDriver > 0) {
      alerts.add(_AlertItem(
        icon: Icons.person_off_outlined,
        color: AppColors.warning,
        label: '${data.vehiclesWithoutDriver} véhicule${data.vehiclesWithoutDriver > 1 ? 's' : ''} sans chauffeur',
        sublabel: 'Contrat actif sans conducteur assigné',
        route: AppRoutes.vehicles,
        severity: _Severity.warning,
      ));
    }
    if (data.vehiclesWithoutActiveContract > 0) {
      alerts.add(_AlertItem(
        icon: Icons.directions_car_outlined,
        color: AppColors.textSecondary,
        label: '${data.vehiclesWithoutActiveContract} véhicule${data.vehiclesWithoutActiveContract > 1 ? 's' : ''} disponible${data.vehiclesWithoutActiveContract > 1 ? 's' : ''}',
        sublabel: 'Non affectés à un contrat',
        route: AppRoutes.vehicles,
        severity: _Severity.info,
      ));
    }

    return _SectionCard(
      title: 'ATTENTION REQUISE',
      icon: Icons.notifications_active_outlined,
      badge: data.alertCount,
      badgeColor: data.documentsExpired > 0 ? AppColors.error : AppColors.warning,
      child: Column(
        children: alerts.asMap().entries.map((e) {
          final isLast = e.key == alerts.length - 1;
          return Column(
            children: [
              _AlertRow(item: e.value),
              if (!isLast)
                const Divider(height: 1, color: AppColors.border),
            ],
          );
        }).toList(),
      ),
    );
  }
}

enum _Severity { critical, warning, info }

class _AlertItem {
  const _AlertItem({
    required this.icon,
    required this.color,
    required this.label,
    required this.sublabel,
    required this.route,
    required this.severity,
  });
  final IconData icon;
  final Color color;
  final String label;
  final String sublabel;
  final String route;
  final _Severity severity;
}

class _AlertRow extends StatelessWidget {
  const _AlertRow({required this.item});
  final _AlertItem item;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push(item.route),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: item.color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(item.icon, size: 18, color: item.color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.label,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: item.color,
                    ),
                  ),
                  Text(
                    item.sublabel,
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right,
                size: 18, color: AppColors.textDisabled),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — État de la flotte
// ═══════════════════════════════════════════════════════════════════════════════

class _FleetStatusSection extends StatelessWidget {
  const _FleetStatusSection({required this.data});
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    final total = data.vehiclesTotal;
    if (total == 0) return const SizedBox.shrink();

    final segments = [
      _Seg('En service', data.vehiclesAssignedOrInService,
          AppColors.primary),
      _Seg('Disponibles', data.vehiclesAvailable, AppColors.success),
      _Seg('Indisponibles', data.vehiclesImmobilized, AppColors.error),
    ];

    return _SectionCard(
      title: 'ÉTAT DE LA FLOTTE',
      icon: Icons.directions_car_outlined,
      trailing: Text(
        '$total véhicules',
        style: const TextStyle(
            fontSize: 12, color: AppColors.textSecondary,
            fontWeight: FontWeight.w600),
      ),
      child: Column(
        children: [
          _ProportionalBar(segments: segments, total: total),
          const SizedBox(height: 14),
          ...segments.map((s) => _StatusRow(seg: s, total: total)),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — État des chauffeurs
// ═══════════════════════════════════════════════════════════════════════════════

class _DriverStatusSection extends StatelessWidget {
  const _DriverStatusSection({required this.data});
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    final total = data.driversTotal;
    if (total == 0) return const SizedBox.shrink();

    final segments = [
      _Seg('Actifs', data.driversActive, AppColors.success),
      _Seg('KYC / Terrain', data.driversPendingKyc, AppColors.warning),
      _Seg('Suspendus / Risque',
          data.driversAtRiskOrSuspended, AppColors.error),
    ];

    return _SectionCard(
      title: 'ÉTAT DES CHAUFFEURS',
      icon: Icons.people_outlined,
      trailing: Text(
        '$total enregistrés',
        style: const TextStyle(
            fontSize: 12, color: AppColors.textSecondary,
            fontWeight: FontWeight.w600),
      ),
      child: Column(
        children: [
          _ProportionalBar(segments: segments, total: total),
          const SizedBox(height: 14),
          ...segments.map((s) => _StatusRow(seg: s, total: total)),
        ],
      ),
    );
  }
}

// ── Proportional bar shared widget ───────────────────────────────────────────

class _Seg {
  const _Seg(this.label, this.count, this.color);
  final String label;
  final int count;
  final Color color;
}

class _ProportionalBar extends StatelessWidget {
  const _ProportionalBar(
      {required this.segments, required this.total});
  final List<_Seg> segments;
  final int total;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: SizedBox(
        height: 10,
        child: Row(
          children: segments.map((s) {
            final ratio = total > 0 ? s.count / total : 0.0;
            return Expanded(
              flex: (ratio * 1000).round().clamp(1, 1000),
              child: ColoredBox(color: s.color),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.seg, required this.total});
  final _Seg seg;
  final int total;

  @override
  Widget build(BuildContext context) {
    final ratio = total > 0 ? seg.count / total : 0.0;
    final pct = (ratio * 100).round();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Container(
            width: 8, height: 8,
            decoration: BoxDecoration(
              color: seg.color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 4,
            child: Text(
              seg.label,
              style: const TextStyle(
                  fontSize: 13, color: AppColors.textPrimary),
            ),
          ),
          Text(
            '${seg.count}',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: seg.color,
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            flex: 3,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: ratio,
                minHeight: 5,
                backgroundColor: seg.color.withValues(alpha: 0.1),
                valueColor: AlwaysStoppedAnimation<Color>(seg.color),
              ),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 32,
            child: Text(
              '$pct%',
              style: const TextStyle(
                  fontSize: 11, color: AppColors.textSecondary),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Finances
// ═══════════════════════════════════════════════════════════════════════════════

class _FinancesSection extends StatelessWidget {
  const _FinancesSection({required this.data});
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'FINANCES',
      icon: Icons.account_balance_wallet_outlined,
      child: Column(
        children: [
          // Revenus
          Row(
            children: [
              Expanded(
                child: _FinanceTile(
                  label: "Aujourd'hui",
                  amount: data.paymentsToday,
                  count: data.paymentCountToday,
                  countLabel: 'paiement${data.paymentCountToday > 1 ? 's' : ''}',
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _FinanceTile(
                  label: 'Ce mois',
                  amount: data.paymentsThisMonth,
                  count: data.paymentsValidated + data.paymentsPending,
                  countLabel: 'paiement${(data.paymentsValidated + data.paymentsPending) > 1 ? 's' : ''}',
                  color: AppColors.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: AppColors.border),
          const SizedBox(height: 12),
          // Validated vs pending
          Row(
            children: [
              _StatusPill(
                icon: Icons.check_circle_outline,
                label: '${data.paymentsValidated} validés',
                color: AppColors.success,
              ),
              const SizedBox(width: 10),
              _StatusPill(
                icon: Icons.hourglass_empty_outlined,
                label: '${data.paymentsPending} en attente',
                color: AppColors.warning,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FinanceTile extends StatelessWidget {
  const _FinanceTile({
    required this.label,
    required this.amount,
    required this.count,
    required this.countLabel,
    required this.color,
  });
  final String label;
  final double amount;
  final int count;
  final String countLabel;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
                fontSize: 11, color: AppColors.textSecondary,
                fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Text(
            _fmt(amount),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          Text(
            'F CFA',
            style: TextStyle(fontSize: 10, color: color.withValues(alpha: 0.7)),
          ),
          const SizedBox(height: 4),
          Text(
            '$count $countLabel',
            style: const TextStyle(
                fontSize: 11, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  String _fmt(double v) {
    final n = v.toInt();
    final str = n.toString();
    final buf = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) buf.write(' ');
      buf.write(str[i]);
    }
    return buf.toString();
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.icon,
    required this.label,
    required this.color,
  });
  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — Actions rapides
// ═══════════════════════════════════════════════════════════════════════════════

class _QuickActionsSection extends StatelessWidget {
  const _QuickActionsSection({required this.data});
  final DashboardData data;

  static const _actions = [
    _Action('+ Véhicule', Icons.directions_car_outlined,
        '/vehicles/new', AppColors.primary),
    _Action('+ Chauffeur', Icons.person_add_outlined,
        '/drivers/new', Color(0xFF057A55)),
    _Action('+ Contrat', Icons.description_outlined,
        '/contracts/new', Color(0xFF7E3AF2)),
    _Action('+ Paiement', Icons.payments_outlined,
        AppRoutes.payments, Color(0xFFC27803)),
  ];

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: 'ACTIONS RAPIDES',
      icon: Icons.bolt_outlined,
      child: Row(
        children: _actions
            .map((a) => Expanded(child: _QuickActionBtn(action: a)))
            .toList(),
      ),
    );
  }
}

class _Action {
  const _Action(this.label, this.icon, this.route, this.color);
  final String label;
  final IconData icon;
  final String route;
  final Color color;
}

class _QuickActionBtn extends StatelessWidget {
  const _QuickActionBtn({required this.action});
  final _Action action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 3),
      child: InkWell(
        onTap: () => context.push(action.route),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: action.color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
                color: action.color.withValues(alpha: 0.25)),
          ),
          child: Column(
            children: [
              Icon(action.icon, color: action.color, size: 22),
              const SizedBox(height: 5),
              Text(
                action.label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: action.color,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared section card wrapper
// ═══════════════════════════════════════════════════════════════════════════════

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.child,
    this.trailing,
    this.badge,
    this.badgeColor,
  });

  final String title;
  final IconData icon;
  final Widget child;
  final Widget? trailing;
  final int? badge;
  final Color? badgeColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding:
                const EdgeInsets.fromLTRB(16, 14, 12, 0),
            child: Row(
              children: [
                Icon(icon, size: 15, color: AppColors.textSecondary),
                const SizedBox(width: 6),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary,
                    letterSpacing: 0.8,
                  ),
                ),
                if (badge != null && badge! > 0) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: (badgeColor ?? AppColors.primary)
                          .withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$badge',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: badgeColor ?? AppColors.primary,
                      ),
                    ),
                  ),
                ],
                if (badge == 0) ...[
                  const SizedBox(width: 6),
                  const Icon(Icons.check_circle,
                      size: 13, color: AppColors.success),
                ],
                const Spacer(),
                if (trailing != null) trailing!,
              ],
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: child,
          ),
        ],
      ),
    );
  }
}
