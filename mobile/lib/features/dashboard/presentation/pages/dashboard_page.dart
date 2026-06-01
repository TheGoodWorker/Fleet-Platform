import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';

import '../../../../core/di/injection.dart';
import '../../../../features/auth/domain/entities/user.dart';
import '../../../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../../../features/auth/presentation/bloc/auth_event.dart';
import '../../../../features/auth/presentation/bloc/auth_state.dart';
import '../../../../shared/permissions/permission_helper.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../navigation/app_router.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  bool _apiConnected = false;
  bool _checkingApi = true;

  @override
  void initState() {
    super.initState();
    _checkApiStatus();
  }

  Future<void> _checkApiStatus() async {
    try {
      final dio = sl<Dio>();
      final response = await dio.get('/auth/me');
      setState(() {
        _apiConnected = response.statusCode == 200;
        _checkingApi = false;
      });
    } catch (_) {
      setState(() {
        _apiConnected = false;
        _checkingApi = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final user = authState is AuthAuthenticated ? authState.user : null;

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: const Text('Fleet Platform'),
            actions: [
              // Statut API
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: _checkingApi
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Icon(
                        _apiConnected
                            ? Icons.cloud_done_outlined
                            : Icons.cloud_off_outlined,
                        color: _apiConnected
                            ? AppColors.success
                            : AppColors.error,
                        size: 22,
                      ),
              ),
              // Déconnexion
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert),
                onSelected: (value) {
                  if (value == 'logout') {
                    context.read<AuthBloc>().add(const AuthLogoutRequested());
                  }
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(
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
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ─── Profil utilisateur ──────────────────────────────────
                _UserProfileCard(user: user),
                const SizedBox(height: 24),

                // ─── Statut API ──────────────────────────────────────────
                _ApiStatusCard(
                  connected: _apiConnected,
                  checking: _checkingApi,
                  onRefresh: _checkApiStatus,
                ),
                const SizedBox(height: 24),

                // ─── Modules principaux ──────────────────────────────────
                const Text(
                  'Modules',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                _ModuleGrid(user: user),
              ],
            ),
          ),
        );
      },
    );
  }
}

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
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
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

class _ApiStatusCard extends StatelessWidget {
  const _ApiStatusCard({
    required this.connected,
    required this.checking,
    required this.onRefresh,
  });

  final bool connected;
  final bool checking;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: checking
            ? AppColors.surface
            : connected
                ? AppColors.successLight
                : AppColors.errorLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: checking
              ? AppColors.border
              : connected
                  ? AppColors.success
                  : AppColors.error,
        ),
      ),
      child: Row(
        children: [
          Icon(
            checking
                ? Icons.sync
                : connected
                    ? Icons.cloud_done_outlined
                    : Icons.cloud_off_outlined,
            color: checking
                ? AppColors.textSecondary
                : connected
                    ? AppColors.success
                    : AppColors.error,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  checking
                      ? 'Vérification...'
                      : connected
                          ? 'API connectée'
                          : 'API non connectée',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: checking
                        ? AppColors.textPrimary
                        : connected
                            ? AppColors.success
                            : AppColors.error,
                  ),
                ),
                const Text(
                  'Backend Fleet Platform V2',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          if (!checking)
            IconButton(
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh, size: 20),
            ),
        ],
      ),
    );
  }
}

class _ModuleGrid extends StatelessWidget {
  const _ModuleGrid({this.user});

  final User? user;

  static const List<_ModuleItem> _modules = [
    _ModuleItem(
      label: 'Véhicules',
      icon: Icons.directions_car_outlined,
      route: AppRoutes.vehicles,
      module: AppModule.vehicles,
    ),
    _ModuleItem(
      label: 'Chauffeurs',
      icon: Icons.people_outlined,
      route: AppRoutes.drivers,
      module: AppModule.drivers,
    ),
    _ModuleItem(
      label: 'Contrats',
      icon: Icons.description_outlined,
      route: AppRoutes.contracts,
      module: AppModule.contracts,
    ),
    _ModuleItem(
      label: 'Paiements',
      icon: Icons.payments_outlined,
      route: AppRoutes.payments,
      module: AppModule.payments,
    ),
    _ModuleItem(
      label: 'Documents',
      icon: Icons.folder_outlined,
      route: AppRoutes.documents,
      module: AppModule.documents,
    ),
    _ModuleItem(
      label: 'Propriétaire',
      icon: Icons.account_balance_outlined,
      route: AppRoutes.owner,
      module: AppModule.ownerPortal,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.3,
      children: _modules
          .where((m) => PermissionHelper.canAccessModule(user, m.module))
          .map((m) => _ModuleTile(item: m))
          .toList(),
    );
  }
}

class _ModuleItem {
  const _ModuleItem({
    required this.label,
    required this.icon,
    required this.route,
    required this.module,
  });

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
      borderRadius: BorderRadius.circular(12),
      onTap: () => context.push(item.route),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(item.icon, color: AppColors.primary, size: 24),
            ),
            const SizedBox(height: 10),
            Text(
              item.label,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
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
