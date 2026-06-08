import 'dart:math' show max;

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injection.dart';
import '../../../../features/auth/domain/entities/user.dart';
import '../../../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../../../features/auth/presentation/bloc/auth_event.dart';
import '../../../../features/auth/presentation/bloc/auth_state.dart';
import '../../../../navigation/app_router.dart';
import '../cubit/dashboard_cubit.dart';
import '../cubit/dashboard_state.dart';

// ── Palette dashboard ─────────────────────────────────────────────────────────
// Indépendante du thème global pour ne pas casser les autres modules.
class _C {
  static const bg = Color(0xFFF3F4F6);
  static const card = Colors.white;
  static const green = Color(0xFF059669);
  static const greenLight = Color(0xFFD1FAE5);
  static const amber = Color(0xFFD97706);
  static const red = Color(0xFFDC2626);
  static const blue = Color(0xFF2563EB);
  static const text = Color(0xFF111827);
  static const sub = Color(0xFF6B7280);
  static const border = Color(0xFFE5E7EB);
  static const shadow = Color(0x0A000000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Entry point
// ═══════════════════════════════════════════════════════════════════════════════

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<DashboardCubit>()..load(),
      child: const _Shell(),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shell (AppBar + body)
// ═══════════════════════════════════════════════════════════════════════════════

class _Shell extends StatelessWidget {
  const _Shell();

  @override
  Widget build(BuildContext context) {
    final user = _user(context);
    return Scaffold(
      backgroundColor: _C.bg,
      appBar: AppBar(
        backgroundColor: _C.card,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 16,
        title: Row(
          children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                color: _C.green,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.local_shipping, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 8),
            const Text(
              'Fleet',
              style: TextStyle(
                fontSize: 17, fontWeight: FontWeight.w800,
                color: _C.text, letterSpacing: -0.3,
              ),
            ),
            const Text(
              'Platform',
              style: TextStyle(
                fontSize: 17, fontWeight: FontWeight.w400,
                color: _C.sub,
              ),
            ),
          ],
        ),
        actions: [
          BlocBuilder<DashboardCubit, DashboardState>(
            builder: (ctx, s) => IconButton(
              icon: s is DashboardLoading
                  ? const SizedBox(
                      width: 18, height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: _C.green))
                  : const Icon(Icons.refresh_rounded, color: _C.sub, size: 20),
              onPressed: s is DashboardLoading
                  ? null
                  : () => ctx.read<DashboardCubit>().refresh(),
            ),
          ),
          PopupMenuButton<String>(
            icon: CircleAvatar(
              radius: 14,
              backgroundColor: _C.greenLight,
              child: Text(
                user?.initials ?? '?',
                style: const TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w700, color: _C.green),
              ),
            ),
            onSelected: (v) {
              if (v == 'logout') {
                context.read<AuthBloc>().add(const AuthLogoutRequested());
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(
                value: 'logout',
                child: Row(children: [
                  Icon(Icons.logout, size: 16, color: _C.red),
                  SizedBox(width: 8),
                  Text('Déconnexion', style: TextStyle(color: _C.red)),
                ]),
              ),
            ],
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        color: _C.green,
        onRefresh: () => context.read<DashboardCubit>().refresh(),
        child: BlocBuilder<DashboardCubit, DashboardState>(
          builder: (context, state) => switch (state) {
            DashboardInitial() || DashboardLoading() => _Skeleton(user: user),
            DashboardError(:final message) => _ErrorBody(message: message),
            DashboardLoaded(:final data) => _Body(user: user, data: data),
          },
        ),
      ),
    );
  }

  User? _user(BuildContext context) {
    final s = context.watch<AuthBloc>().state;
    return s is AuthAuthenticated ? s.user : null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Body complet
// ═══════════════════════════════════════════════════════════════════════════════

class _Body extends StatelessWidget {
  const _Body({required this.user, required this.data});
  final User? user;
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
      children: [
        // ── Welcome header ────────────────────────────────────────────────
        _WelcomeHeader(user: user),
        const SizedBox(height: 20),

        // ── Hero card (revenus + flotte en bref) ──────────────────────────
        _HeroCard(data: data),
        const SizedBox(height: 16),

        // ── Bar chart — paiements par semaine ─────────────────────────────
        _WeeklyChart(data: data),
        const SizedBox(height: 16),

        // ── Flotte + Chauffeurs (2 colonnes) ──────────────────────────────
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _FleetCard(data: data)),
            const SizedBox(width: 12),
            Expanded(child: _DriversCard(data: data)),
          ],
        ),
        const SizedBox(height: 16),

        // ── Contrats ──────────────────────────────────────────────────────
        _ContractsCard(data: data),
        const SizedBox(height: 16),

        // ── Alertes ───────────────────────────────────────────────────────
        if (data.alertCount > 0) ...[
          _AlertsCard(data: data),
          const SizedBox(height: 16),
        ],

        // ── Actions rapides ───────────────────────────────────────────────
        _QuickActions(),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Welcome header
// ═══════════════════════════════════════════════════════════════════════════════

class _WelcomeHeader extends StatelessWidget {
  const _WelcomeHeader({this.user});
  final User? user;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    const months = [
      'janv.','févr.','mars','avr.','mai','juin',
      'juil.','août','sept.','oct.','nov.','déc.'
    ];
    final date = '${now.day} ${months[now.month - 1]} ${now.year}';

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              RichText(
                text: TextSpan(
                  style: const TextStyle(
                      fontSize: 22, color: _C.text, height: 1.2),
                  children: [
                    const TextSpan(
                      text: 'Bonjour, ',
                      style: TextStyle(fontWeight: FontWeight.w400),
                    ),
                    TextSpan(
                      text: user?.firstName ?? 'Manager',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Text(date,
                  style: const TextStyle(fontSize: 13, color: _C.sub)),
            ],
          ),
        ),
        // Date chip
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: _C.card,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _C.border),
          ),
          child: Row(
            children: [
              const Icon(Icons.calendar_today_outlined, size: 13, color: _C.sub),
              const SizedBox(width: 4),
              Text(
                user?.role.label ?? '',
                style: const TextStyle(fontSize: 12, color: _C.sub,
                    fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hero card — gradient vert
// ═══════════════════════════════════════════════════════════════════════════════

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.data});
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF059669), Color(0xFF064E3B)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Color(0xFF059669).withValues(alpha: 0.35), // ignore: prefer_const_constructors
            blurRadius: 20, offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top row
          Row(
            children: [
              const Text(
                'Revenus du mois',
                style: TextStyle(
                  color: Colors.white70, fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(children: [
                  Icon(Icons.trending_up, size: 13, color: Colors.white),
                  SizedBox(width: 4),
                  Text('Ce mois',
                      style: TextStyle(color: Colors.white, fontSize: 11)),
                ]),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Big amount
          Text(
            '${_fmtFull(data.paymentsThisMonth)} F',
            style: const TextStyle(
              color: Colors.white, fontSize: 30,
              fontWeight: FontWeight.w800, letterSpacing: -0.5,
            ),
          ),
          Text(
            "dont ${_fmtFull(data.paymentsToday)} F aujourd'hui"
            '  ·  ${data.paymentCountToday} paiement${data.paymentCountToday > 1 ? 's' : ''}',
            style: const TextStyle(color: Colors.white60, fontSize: 12),
          ),

          const SizedBox(height: 20),
          const Divider(color: Colors.white24, height: 1),
          const SizedBox(height: 16),

          // Bottom 3 KPIs
          Row(
            children: [
              _HeroStat('${data.vehiclesAssignedOrInService}',
                  'Véhicules actifs', Icons.directions_car_outlined),
              _HeroStatDivider(),
              _HeroStat('${data.driversActive}',
                  'Chauffeurs actifs', Icons.person_outline),
              _HeroStatDivider(),
              _HeroStat('${data.contractsActive}',
                  'Contrats actifs', Icons.description_outlined),
            ],
          ),
        ],
      ),
    );
  }

  String _fmtFull(double v) {
    final n = v.toInt();
    final s = n.toString();
    final b = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) b.write(' ');
      b.write(s[i]);
    }
    return b.toString();
  }
}

class _HeroStat extends StatelessWidget {
  const _HeroStat(this.value, this.label, this.icon);
  final String value;
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 13, color: Colors.white60),
              const SizedBox(width: 4),
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white, fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(color: Colors.white54, fontSize: 10),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _HeroStatDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) =>
      Container(width: 1, height: 36, color: Colors.white.withValues(alpha: 0.12));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bar chart — paiements par semaine
// ═══════════════════════════════════════════════════════════════════════════════

class _WeeklyChart extends StatelessWidget {
  const _WeeklyChart({required this.data});
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    final weekly = data.weeklyPayments;
    final maxVal = weekly.reduce(max);
    final labels = ['S1', 'S2', 'S3', 'S4', 'S5'];

    // Indice de la semaine courante
    final currentWeek = ((DateTime.now().day - 1) ~/ 7).clamp(0, 4);

    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Paiements mensuels',
                style: TextStyle(
                  fontSize: 14, fontWeight: FontWeight.w700, color: _C.text),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: _C.greenLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'Ce mois',
                  style: TextStyle(
                      fontSize: 11, color: _C.green,
                      fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          SizedBox(
            height: 110,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(5, (i) {
                final v = weekly[i];
                final ratio = maxVal > 0 ? v / maxVal : 0.0;
                final barH = (ratio * 80).clamp(4.0, 80.0);
                final isActive = i == currentWeek;
                final hasData = v > 0;

                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 5),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        // Valeur au-dessus si c'est la semaine active
                        if (isActive && hasData) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: _C.green,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              _fmtK(v),
                              style: const TextStyle(
                                color: Colors.white, fontSize: 9,
                                fontWeight: FontWeight.w700),
                            ),
                          ),
                          const SizedBox(height: 4),
                        ] else
                          const SizedBox(height: 20),

                        // Barre
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 600),
                          curve: Curves.easeOutCubic,
                          height: barH,
                          decoration: BoxDecoration(
                            color: isActive
                                ? _C.green
                                : hasData
                                    ? _C.green.withValues(alpha: 0.3)
                                    : _C.border,
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(6),
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          labels[i],
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isActive
                                ? FontWeight.w700
                                : FontWeight.w400,
                            color: isActive ? _C.green : _C.sub,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  String _fmtK(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}M';
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(0)}k';
    return v.toInt().toString();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Flotte (petite carte)
// ═══════════════════════════════════════════════════════════════════════════════

class _FleetCard extends StatelessWidget {
  const _FleetCard({required this.data});
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.directions_car_outlined,
                  size: 15, color: _C.sub),
              SizedBox(width: 4),
              Text(
                'Flotte',
                style: TextStyle(
                    fontSize: 12, color: _C.sub,
                    fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Total centré
          Center(
            child: Text(
              '${data.vehiclesTotal}',
              style: const TextStyle(
                fontSize: 36, fontWeight: FontWeight.w800,
                color: _C.text, height: 1,
              ),
            ),
          ),
          const Center(
            child: Text(
              'véhicules',
              style: TextStyle(fontSize: 12, color: _C.sub),
            ),
          ),

          const SizedBox(height: 14),

          // Mini stacked bar
          _MiniStackedBar(segments: [
            _Seg(data.vehiclesAssignedOrInService, _C.green),
            _Seg(data.vehiclesAvailable, const Color(0xFF6EE7B7)),
            _Seg(data.vehiclesImmobilized, const Color(0xFFFCD34D)),
          ], total: data.vehiclesTotal),

          const SizedBox(height: 10),
          _LegendRow('Actifs', data.vehiclesAssignedOrInService,
              _C.green),
          const SizedBox(height: 4),
          _LegendRow('Disponibles', data.vehiclesAvailable,
              const Color(0xFF6EE7B7)),
          const SizedBox(height: 4),
          _LegendRow('Indisponibles', data.vehiclesImmobilized,
              const Color(0xFFFCD34D)),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chauffeurs (petite carte)
// ═══════════════════════════════════════════════════════════════════════════════

class _DriversCard extends StatelessWidget {
  const _DriversCard({required this.data});
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.people_outlined, size: 15, color: _C.sub),
              SizedBox(width: 4),
              Text(
                'Chauffeurs',
                style: TextStyle(
                    fontSize: 12, color: _C.sub,
                    fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Center(
            child: Text(
              '${data.driversTotal}',
              style: const TextStyle(
                fontSize: 36, fontWeight: FontWeight.w800,
                color: _C.text, height: 1,
              ),
            ),
          ),
          const Center(
            child: Text(
              'chauffeurs',
              style: TextStyle(fontSize: 12, color: _C.sub),
            ),
          ),

          const SizedBox(height: 14),

          _MiniStackedBar(segments: [
            _Seg(data.driversActive, _C.green),
            _Seg(data.driversPendingKyc, _C.amber),
            _Seg(data.driversAtRiskOrSuspended, _C.red),
          ], total: data.driversTotal),

          const SizedBox(height: 10),
          _LegendRow('Actifs', data.driversActive, _C.green),
          const SizedBox(height: 4),
          _LegendRow('KYC/Terrain', data.driversPendingKyc, _C.amber),
          const SizedBox(height: 4),
          _LegendRow('Suspendus', data.driversAtRiskOrSuspended, _C.red),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Contrats
// ═══════════════════════════════════════════════════════════════════════════════

class _ContractsCard extends StatelessWidget {
  const _ContractsCard({required this.data});
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.description_outlined, size: 15, color: _C.sub),
              const SizedBox(width: 4),
              const Text(
                'Contrats',
                style: TextStyle(
                    fontSize: 12, color: _C.sub,
                    fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              Text(
                '${data.contractsTotal} total',
                style: const TextStyle(fontSize: 12, color: _C.sub),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _ContractStatBox(
                  value: data.contractsActive,
                  label: 'Actifs',
                  color: _C.green,
                  bg: _C.greenLight,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ContractStatBox(
                  value: data.contractsPending,
                  label: 'En attente',
                  color: _C.amber,
                  bg: const Color(0xFFFEF3C7),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ContractStatBox(
                  value: data.contractsClosed,
                  label: 'Terminés',
                  color: _C.sub,
                  bg: const Color(0xFFF3F4F6),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ContractStatBox extends StatelessWidget {
  const _ContractStatBox({
    required this.value,
    required this.label,
    required this.color,
    required this.bg,
  });
  final int value;
  final String label;
  final Color color;
  final Color bg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            '$value',
            style: TextStyle(
              fontSize: 22, fontWeight: FontWeight.w800, color: color),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(fontSize: 11, color: color),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Alertes
// ═══════════════════════════════════════════════════════════════════════════════

class _AlertsCard extends StatelessWidget {
  const _AlertsCard({required this.data});
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    final items = <_AlertRow>[];
    if (data.documentsExpired > 0) {
      items.add(_AlertRow(
        icon: Icons.warning_amber_rounded,
        color: _C.red,
        label: '${data.documentsExpired} doc${data.documentsExpired > 1 ? 's' : ''} expiré${data.documentsExpired > 1 ? 's' : ''}',
        route: AppRoutes.documents,
      ));
    }
    if (data.documentsExpiringSoon > 0) {
      items.add(_AlertRow(
        icon: Icons.timer_outlined,
        color: _C.amber,
        label: '${data.documentsExpiringSoon} expir${data.documentsExpiringSoon > 1 ? 'ent' : 'e'} bientôt',
        route: AppRoutes.documents,
      ));
    }
    if (data.vehiclesWithoutDriver > 0) {
      items.add(_AlertRow(
        icon: Icons.person_off_outlined,
        color: _C.amber,
        label: '${data.vehiclesWithoutDriver} véhicule${data.vehiclesWithoutDriver > 1 ? 's' : ''} sans chauffeur',
        route: AppRoutes.vehicles,
      ));
    }
    if (data.vehiclesWithoutActiveContract > 0) {
      items.add(_AlertRow(
        icon: Icons.directions_car_outlined,
        color: _C.sub,
        label: '${data.vehiclesWithoutActiveContract} véhicule${data.vehiclesWithoutActiveContract > 1 ? 's' : ''} disponible${data.vehiclesWithoutActiveContract > 1 ? 's' : ''}',
        route: AppRoutes.vehicles,
      ));
    }

    return Container(
      decoration: BoxDecoration(
        color: _C.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: _C.red.withValues(alpha: 0.25)),
        boxShadow: const [
          BoxShadow(color: _C.shadow, blurRadius: 8,
              offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: _C.red.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.notifications_active_outlined,
                      size: 14, color: _C.red),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Attention requise',
                  style: TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w700,
                    color: _C.text),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: _C.red,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${data.alertCount}',
                    style: const TextStyle(
                      fontSize: 11, color: Colors.white,
                      fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
            child: Column(
              children: items
                  .asMap()
                  .entries
                  .expand((e) => [
                        e.value,
                        if (e.key < items.length - 1)
                          const Divider(height: 1, color: _C.border),
                      ])
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _AlertRow extends StatelessWidget {
  const _AlertRow({
    required this.icon,
    required this.color,
    required this.label,
    required this.route,
  });
  final IconData icon;
  final Color color;
  final String label;
  final String route;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push(route),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                style: TextStyle(fontSize: 13, color: color,
                    fontWeight: FontWeight.w600),
              ),
            ),
            Icon(Icons.chevron_right, size: 16,
                color: color.withValues(alpha: 0.5)),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Actions rapides
// ═══════════════════════════════════════════════════════════════════════════════

class _QuickActions extends StatelessWidget {
  static const _actions = [
    (Icons.add_box_outlined, 'Véhicule', '/vehicles/new', _C.blue),
    (Icons.person_add_outlined, 'Chauffeur', '/drivers/new', _C.green),
    (Icons.post_add_outlined, 'Contrat', '/contracts/new',
     Color(0xFF7C3AED)),
    (Icons.payments_outlined, 'Paiement', AppRoutes.payments, _C.amber),
  ];

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Actions rapides',
            style: TextStyle(
              fontSize: 14, fontWeight: FontWeight.w700, color: _C.text),
          ),
          const SizedBox(height: 14),
          Row(
            children: _actions.map((a) {
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: InkWell(
                    onTap: () => context.push(a.$3),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: a.$4.withValues(alpha: 0.07),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: a.$4.withValues(alpha: 0.2)),
                      ),
                      child: Column(
                        children: [
                          Icon(a.$1, size: 22, color: a.$4),
                          const SizedBox(height: 6),
                          Text(
                            a.$2,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: a.$4,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared micro-widgets
// ═══════════════════════════════════════════════════════════════════════════════

/// Wrapper carte blanche avec ombre
class _Card extends StatelessWidget {
  const _Card({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _C.card,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: _C.shadow, blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: child,
    );
  }
}

/// Barre proportionnelle segmentée
class _Seg {
  const _Seg(this.count, this.color);
  final int count;
  final Color color;
}

class _MiniStackedBar extends StatelessWidget {
  const _MiniStackedBar({required this.segments, required this.total});
  final List<_Seg> segments;
  final int total;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: SizedBox(
        height: 8,
        child: Row(
          children: segments.map((s) {
            final flex = total > 0
                ? ((s.count / total) * 1000).round().clamp(1, 1000)
                : 1;
            return Expanded(
              flex: flex,
              child: ColoredBox(color: s.color),
            );
          }).toList(),
        ),
      ),
    );
  }
}

/// Ligne légende : dot + label + valeur
class _LegendRow extends StatelessWidget {
  const _LegendRow(this.label, this.value, this.color);
  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 7, height: 7,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontSize: 11, color: _C.sub),
          ),
        ),
        Text(
          '$value',
          style: const TextStyle(
            fontSize: 11, fontWeight: FontWeight.w700, color: _C.text),
        ),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Skeleton + Error
// ═══════════════════════════════════════════════════════════════════════════════

class _Skeleton extends StatelessWidget {
  const _Skeleton({this.user});
  final User? user;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        _WelcomeHeader(user: user),
        const SizedBox(height: 20),
        _sk(140), const SizedBox(height: 16),
        _sk(130), const SizedBox(height: 16),
        Row(children: [
          Expanded(child: _sk(180)),
          const SizedBox(width: 12),
          Expanded(child: _sk(180)),
        ]),
      ],
    );
  }

  Widget _sk(double h) => Container(
    height: h,
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.7),
      borderRadius: BorderRadius.circular(16),
    ),
  );
}

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: _C.red, size: 40),
            const SizedBox(height: 12),
            Text(message,
                style: const TextStyle(color: _C.sub, fontSize: 13),
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.read<DashboardCubit>().load(),
              style: ElevatedButton.styleFrom(
                backgroundColor: _C.green,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}
