import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../domain/entities/vehicle.dart';
import '../cubit/vehicles_cubit.dart';
import '../cubit/vehicles_state.dart';
import '../widgets/vehicle_card.dart';

class VehiclesPage extends StatefulWidget {
  const VehiclesPage({super.key});

  @override
  State<VehiclesPage> createState() => _VehiclesPageState();
}

class _VehiclesPageState extends State<VehiclesPage> {
  VehicleStatus? _selectedStatus;

  @override
  void initState() {
    super.initState();
    context.read<VehiclesCubit>().load();
  }

  void _onFilterChanged(VehicleStatus? status) {
    setState(() => _selectedStatus = status);
    context.read<VehiclesCubit>().filterByStatus(
          status != null ? _statusToApiString(status) : null,
        );
  }

  String _statusToApiString(VehicleStatus status) => switch (status) {
        VehicleStatus.available => 'AVAILABLE',
        VehicleStatus.assigned => 'ASSIGNED',
        VehicleStatus.inService => 'IN_SERVICE',
        VehicleStatus.immobilized => 'IMMOBILIZED',
        VehicleStatus.inRepair => 'IN_REPAIR',
        VehicleStatus.accidented => 'ACCIDENTED',
        VehicleStatus.pendingInspection => 'PENDING_INSPECTION',
        VehicleStatus.repossessed => 'REPOSSESSED',
        VehicleStatus.outOfService => 'OUT_OF_SERVICE',
        VehicleStatus.sold => 'SOLD',
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Véhicules'),
      ),
      body: Column(
        children: [
          _FilterChipsRow(
            selected: _selectedStatus,
            onChanged: _onFilterChanged,
          ),
          const Divider(height: 1),
          Expanded(
            child: BlocBuilder<VehiclesCubit, VehiclesState>(
              builder: (context, state) {
                return switch (state) {
                  VehiclesInitial() => const SizedBox.shrink(),
                  VehiclesLoading() => const LoadingView(
                      message: 'Chargement des véhicules…',
                    ),
                  VehiclesError(:final message) => ErrorView(
                      message: message,
                      onRetry: () =>
                          context.read<VehiclesCubit>().load(
                                status: _selectedStatus != null
                                    ? _statusToApiString(_selectedStatus!)
                                    : null,
                              ),
                    ),
                  VehiclesLoaded(:final vehicles) when vehicles.isEmpty =>
                    EmptyState(
                      title: 'Aucun véhicule',
                      subtitle: _selectedStatus != null
                          ? 'Aucun véhicule avec le statut "${_selectedStatus!.label}"'
                          : 'La flotte est vide pour le moment.',
                      icon: Icons.directions_car_outlined,
                    ),
                  VehiclesLoaded(:final vehicles) => RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: () =>
                          context.read<VehiclesCubit>().refresh(),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: vehicles.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final vehicle = vehicles[index];
                          return VehicleCard(
                            vehicle: vehicle,
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

  final VehicleStatus? selected;
  final ValueChanged<VehicleStatus?> onChanged;

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
          ...VehicleStatus.values.map((status) {
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
