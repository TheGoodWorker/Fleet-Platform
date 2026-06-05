import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injection.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../domain/entities/driver.dart';
import '../cubit/driver_detail_cubit.dart';
import '../cubit/driver_detail_state.dart';

class DriverDetailPage extends StatelessWidget {
  const DriverDetailPage({super.key, required this.driverId});

  final String driverId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<DriverDetailCubit>()..load(driverId),
      child: _DriverDetailView(driverId: driverId),
    );
  }
}

class _DriverDetailView extends StatelessWidget {
  const _DriverDetailView({required this.driverId});

  final String driverId;

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<DriverDetailCubit, DriverDetailState>(
      listener: (context, state) {
        if (state is DriverDetailActionSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.success,
            ),
          );
          context.read<DriverDetailCubit>().load(driverId);
        } else if (state is DriverDetailActionError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.error,
            ),
          );
        }
      },
      builder: (context, state) {
        final driver = switch (state) {
          DriverDetailLoaded(:final driver) => driver,
          DriverDetailActionInProgress(:final driver) => driver,
          DriverDetailActionSuccess(:final driver) => driver,
          DriverDetailActionError(:final driver) => driver,
          _ => null,
        };

        return Scaffold(
          appBar: AppBar(
            title: Text(driver?.fullName ?? 'Chauffeur'),
            actions: [
              if (driver != null)
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  tooltip: 'Modifier',
                  onPressed: () => context.push('/drivers/$driverId/edit'),
                ),
            ],
          ),
          body: switch (state) {
            DriverDetailInitial() => const SizedBox.shrink(),
            DriverDetailLoading() => const LoadingView(
                message: 'Chargement du chauffeur…',
              ),
            DriverDetailError(:final message) => ErrorView(
                message: message,
                onRetry: () =>
                    context.read<DriverDetailCubit>().load(driverId),
              ),
            _ when driver != null => _DriverBody(
                driver: driver,
                isLoading: state is DriverDetailActionInProgress,
              ),
            _ => const SizedBox.shrink(),
          },
        );
      },
    );
  }
}

class _DriverBody extends StatelessWidget {
  const _DriverBody({required this.driver, required this.isLoading});

  final Driver driver;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── Status chip ─────────────────────────────────────────────────
          _StatusChip(status: driver.status),
          const SizedBox(height: 20),

          // ─── Informations personnelles ───────────────────────────────────
          _Section(
            title: 'Informations personnelles',
            rows: [
              _InfoRow(label: 'Nom', value: driver.lastName.toUpperCase()),
              _InfoRow(label: 'Prénom', value: driver.firstName),
              _InfoRow(label: 'Email', value: driver.email ?? '-'),
              _InfoRow(label: 'Téléphone', value: driver.phone ?? '-'),
              _InfoRow(
                label: 'Adresse',
                value: driver.address ?? 'Non renseignée',
              ),
            ],
          ),
          const SizedBox(height: 16),

          // ─── Informations professionnelles ───────────────────────────────
          _Section(
            title: 'Informations professionnelles',
            rows: [
              _InfoRow(
                label: 'N° CIN',
                value: driver.idCardNumber.isEmpty
                    ? 'Non renseigné'
                    : driver.idCardNumber,
              ),
              _InfoRow(
                label: 'N° Permis',
                value: driver.licenseNumber.isEmpty
                    ? 'Non renseigné'
                    : driver.licenseNumber,
              ),
              _InfoRow(
                label: 'Score',
                value: driver.scoreValue != null
                    ? '${driver.scoreValue!.toStringAsFixed(1)}/100'
                    : '-',
              ),
            ],
          ),
          const SizedBox(height: 24),

          // ─── Action buttons ───────────────────────────────────────────────
          if (driver.status == DriverStatus.pendingKyc)
            _ActionButton(
              label: 'Valider KYC',
              isLoading: isLoading,
              onPressed: () =>
                  context.read<DriverDetailCubit>().validateKyc(),
            ),
          if (driver.status == DriverStatus.pendingFieldValidation)
            _ActionButton(
              label: 'Valider terrain',
              isLoading: isLoading,
              onPressed: () =>
                  context.read<DriverDetailCubit>().validateField(),
            ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.rows});

  final String title;
  final List<_InfoRow> rows;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.textSecondary,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: rows
                  .map(
                    (row) => _InfoTile(label: row.label, value: row.value),
                  )
                  .toList(),
            ),
          ),
        ),
      ],
    );
  }
}

class _InfoRow {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final String value;
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
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

  final DriverStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: status.color.withValues(alpha: 0.4)),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: status.color,
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.isLoading,
    required this.onPressed,
  });

  final String label;
  final bool isLoading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        child: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Text(label),
      ),
    );
  }
}
