import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../domain/entities/driver.dart';
import '../cubit/drivers_cubit.dart';
import '../cubit/drivers_state.dart';
import '../widgets/driver_card.dart';

class DriversPage extends StatefulWidget {
  const DriversPage({super.key});

  @override
  State<DriversPage> createState() => _DriversPageState();
}

class _DriversPageState extends State<DriversPage> {
  DriverStatus? _selectedStatus;

  @override
  void initState() {
    super.initState();
    context.read<DriversCubit>().load();
  }

  void _onFilterChanged(DriverStatus? status) {
    setState(() => _selectedStatus = status);
    context.read<DriversCubit>().filterByStatus(
          status != null ? _statusToApiString(status) : null,
        );
  }

  String _statusToApiString(DriverStatus status) => switch (status) {
        DriverStatus.pendingKyc => 'PENDING_KYC',
        DriverStatus.pendingFieldValidation => 'PENDING_FIELD_VALIDATION',
        DriverStatus.approved => 'APPROVED',
        DriverStatus.active => 'ACTIVE',
        DriverStatus.suspended => 'SUSPENDED',
        DriverStatus.atRisk => 'AT_RISK',
        DriverStatus.terminated => 'TERMINATED',
        DriverStatus.blacklisted => 'BLACKLISTED',
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chauffeurs'),
      ),
      body: Column(
        children: [
          _FilterChipsRow(
            selected: _selectedStatus,
            onChanged: _onFilterChanged,
          ),
          const Divider(height: 1),
          Expanded(
            child: BlocBuilder<DriversCubit, DriversState>(
              builder: (context, state) {
                return switch (state) {
                  DriversInitial() => const SizedBox.shrink(),
                  DriversLoading() => const LoadingView(
                      message: 'Chargement des chauffeurs…',
                    ),
                  DriversError(:final message) => ErrorView(
                      message: message,
                      onRetry: () =>
                          context.read<DriversCubit>().load(
                                status: _selectedStatus != null
                                    ? _statusToApiString(_selectedStatus!)
                                    : null,
                              ),
                    ),
                  DriversLoaded(:final drivers) when drivers.isEmpty =>
                    EmptyState(
                      title: 'Aucun chauffeur',
                      subtitle: _selectedStatus != null
                          ? 'Aucun chauffeur avec le statut "${_selectedStatus!.label}"'
                          : 'Aucun chauffeur enregistré pour le moment.',
                      icon: Icons.person_outline,
                    ),
                  DriversLoaded(:final drivers) => RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: () =>
                          context.read<DriversCubit>().refresh(),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: drivers.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final driver = drivers[index];
                          return DriverCard(
                            driver: driver,
                            onTap: () {},
                          );
                        },
                      ),
                    ),
                };
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChipsRow extends StatelessWidget {
  const _FilterChipsRow({
    required this.selected,
    required this.onChanged,
  });

  final DriverStatus? selected;
  final ValueChanged<DriverStatus?> onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        scrollDirection: Axis.horizontal,
        children: [
          _Chip(
            label: 'Tous',
            selected: selected == null,
            color: AppColors.primary,
            onTap: () => onChanged(null),
          ),
          const SizedBox(width: 8),
          ...DriverStatus.values.map((status) {
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _Chip(
                label: status.label,
                selected: selected == status,
                color: status.color,
                onTap: () =>
                    onChanged(selected == status ? null : status),
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? color : color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? color : color.withValues(alpha: 0.3),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : color,
          ),
        ),
      ),
    );
  }
}
