import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/di/injection.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../domain/entities/vehicle.dart';
import '../cubit/vehicle_detail_cubit.dart';
import '../cubit/vehicle_detail_state.dart';

class VehicleDetailPage extends StatelessWidget {
  const VehicleDetailPage({super.key, required this.vehicleId});

  final String vehicleId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<VehicleDetailCubit>()..load(vehicleId),
      child: _VehicleDetailView(vehicleId: vehicleId),
    );
  }
}

class _VehicleDetailView extends StatelessWidget {
  const _VehicleDetailView({required this.vehicleId});

  final String vehicleId;

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<VehicleDetailCubit, VehicleDetailState>(
      listener: (context, state) {
        if (state is VehicleDetailActionSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.success,
            ),
          );
        }
      },
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            title: Text(
              _plateNumberFromState(state),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.edit_outlined),
                tooltip: 'Modifier',
                onPressed: () => context.push('/vehicles/$vehicleId/edit'),
              ),
            ],
          ),
          body: _buildBody(context, state),
        );
      },
    );
  }

  String _plateNumberFromState(VehicleDetailState state) {
    return switch (state) {
      VehicleDetailLoaded(:final vehicle) => vehicle.plateNumber,
      VehicleDetailActionInProgress(:final vehicle) =>
        vehicle?.plateNumber ?? 'Véhicule',
      VehicleDetailActionSuccess(:final vehicle) => vehicle.plateNumber,
      VehicleDetailActionError(:final vehicle) =>
        vehicle?.plateNumber ?? 'Véhicule',
      _ => 'Véhicule',
    };
  }

  Widget _buildBody(BuildContext context, VehicleDetailState state) {
    return switch (state) {
      VehicleDetailInitial() => const LoadingView(
          message: 'Chargement…',
        ),
      VehicleDetailLoading() => const LoadingView(
          message: 'Chargement du véhicule…',
        ),
      VehicleDetailError(:final message) => ErrorView(
          message: message,
          onRetry: () =>
              context.read<VehicleDetailCubit>().load(vehicleId),
        ),
      VehicleDetailLoaded(:final vehicle) => _VehicleDetailContent(
          vehicle: vehicle,
        ),
      VehicleDetailActionInProgress(:final vehicle) when vehicle != null =>
        _VehicleDetailContent(vehicle: vehicle),
      VehicleDetailActionInProgress() => const LoadingView(
          message: 'Opération en cours…',
        ),
      VehicleDetailActionSuccess(:final vehicle) => _VehicleDetailContent(
          vehicle: vehicle,
        ),
      VehicleDetailActionError(:final vehicle) when vehicle != null =>
        _VehicleDetailContent(vehicle: vehicle),
      VehicleDetailActionError(:final message) => ErrorView(
          message: message,
          onRetry: () =>
              context.read<VehicleDetailCubit>().load(vehicleId),
        ),
    };
  }
}

class _VehicleDetailContent extends StatelessWidget {
  const _VehicleDetailContent({required this.vehicle});

  final Vehicle vehicle;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Row 1: brand + model + year
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${vehicle.brand} ${vehicle.model}',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      Text(
                        '${vehicle.year}',
                        style: const TextStyle(
                          fontSize: 16,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Row 2: status chip
                  _StatusChip(status: vehicle.status),
                  const Divider(height: 24),
                  // Section: Informations techniques
                  const Text(
                    'Informations techniques',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _InfoRow(
                    label: 'Immatriculation',
                    value: vehicle.plateNumber,
                  ),
                  _InfoRow(
                    label: 'VIN',
                    value: vehicle.vin ?? 'Non renseigné',
                  ),
                  _InfoRow(
                    label: 'Carrosserie',
                    value: vehicle.color.isEmpty
                        ? 'Non renseignée'
                        : vehicle.color,
                  ),
                  _InfoRow(
                    label: 'Carburant',
                    value: vehicle.fuelType.isEmpty
                        ? 'Non renseigné'
                        : vehicle.fuelType,
                  ),
                  _InfoRow(
                    label: 'Transmission',
                    value: vehicle.transmission ?? 'Non renseignée',
                  ),
                  _InfoRow(
                    label: 'Places',
                    value: vehicle.seats != null
                        ? '${vehicle.seats}'
                        : 'Non renseigné',
                  ),
                  // Section: Affectation actuelle (conditional)
                  if (vehicle.driverName != null ||
                      vehicle.currentContractType != null) ...[
                    const Divider(height: 24),
                    const Text(
                      'Affectation actuelle',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _InfoRow(
                      label: 'Chauffeur',
                      value: vehicle.driverName ?? '-',
                    ),
                    _InfoRow(
                      label: 'Contrat',
                      value: vehicle.currentContractType ?? '-',
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final VehicleStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: status.color.withValues(alpha: 0.4)),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: status.color,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }
}
