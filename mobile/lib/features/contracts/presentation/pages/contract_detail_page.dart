import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/di/injection.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../domain/entities/contract.dart';
import '../cubit/contract_detail_cubit.dart';
import '../cubit/contract_detail_state.dart';

class ContractDetailPage extends StatelessWidget {
  const ContractDetailPage({super.key, required this.contractId});

  final String contractId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<ContractDetailCubit>()..load(contractId),
      child: _ContractDetailView(contractId: contractId),
    );
  }
}

class _ContractDetailView extends StatelessWidget {
  const _ContractDetailView({required this.contractId});

  final String contractId;

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ContractDetailCubit, ContractDetailState>(
      listener: (context, state) {
        if (state is ContractDetailActionSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.success,
            ),
          );
          context.read<ContractDetailCubit>().load(contractId);
        } else if (state is ContractDetailActionError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.error,
            ),
          );
        }
      },
      builder: (context, state) {
        final Contract? contract = switch (state) {
          ContractDetailLoaded(:final contract) => contract,
          ContractDetailActionInProgress(:final contract) => contract,
          ContractDetailActionSuccess(:final contract) => contract,
          ContractDetailActionError(:final contract) => contract,
          _ => null,
        };

        return Scaffold(
          appBar: AppBar(
            title: Text(contract?.contractNumber ?? 'Contrat'),
            actions: contract != null
                ? [
                    Container(
                      margin: const EdgeInsets.only(right: 12),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: contract.type == ContractType.ownershipProgram
                            ? AppColors.primary.withValues(alpha: 0.12)
                            : contract.type == ContractType.partnerFleet
                                ? AppColors.success.withValues(alpha: 0.12)
                                : AppColors.warning.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        contract.type.label,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: contract.type == ContractType.ownershipProgram
                              ? AppColors.primary
                              : contract.type == ContractType.partnerFleet
                                  ? AppColors.success
                                  : AppColors.warning,
                        ),
                      ),
                    ),
                  ]
                : null,
          ),
          body: switch (state) {
            ContractDetailInitial() || ContractDetailLoading() =>
              const LoadingView(message: 'Chargement du contrat…'),
            ContractDetailError(:final message) => ErrorView(
                message: message,
                onRetry: () =>
                    context.read<ContractDetailCubit>().load(contractId),
              ),
            _ when contract != null => _ContractDetailBody(contract: contract),
            _ => const LoadingView(message: 'Chargement…'),
          },
        );
      },
    );
  }
}

class _ContractDetailBody extends StatelessWidget {
  const _ContractDetailBody({required this.contract});

  final Contract contract;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<ContractDetailCubit>();
    final state = context.watch<ContractDetailCubit>().state;
    final isActionInProgress = state is ContractDetailActionInProgress;

    final hasChecklist = contract.kycValidated != null ||
        contract.fieldValidated != null ||
        contract.depositPaid != null ||
        contract.contractSigned != null ||
        contract.managerApproved != null ||
        contract.adminApproved != null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header row ────────────────────────────────────────────────────
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  contract.type.label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              _StatusChip(status: contract.status),
            ],
          ),
          const SizedBox(height: 20),

          // ── Section Véhicule ──────────────────────────────────────────────
          _SectionCard(
            title: 'Véhicule',
            icon: Icons.directions_car_outlined,
            children: [
              _DetailRow(
                label: 'Immatriculation',
                value: contract.vehiclePlate,
                bold: true,
              ),
              _DetailRow(
                label: 'Marque / Modèle',
                value: '${contract.vehicleBrand} ${contract.vehicleModel}',
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── Section Chauffeur ─────────────────────────────────────────────
          _SectionCard(
            title: 'Chauffeur',
            icon: Icons.person_outline,
            children: [
              _DetailRow(
                label: 'Nom',
                value: contract.driverName ?? 'Multi-chauffeur',
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── Section Financier ─────────────────────────────────────────────
          _SectionCard(
            title: 'Financier',
            icon: Icons.payments_outlined,
            children: [
              _DetailRow(
                label: 'Montant journalier',
                value: '${contract.dailyAmount.toStringAsFixed(0)} FCFA',
                bold: true,
              ),
              _DetailRow(
                label: 'Jours cible',
                value: contract.targetDays != null
                    ? '${contract.targetDays} jours'
                    : '-',
              ),
              _DetailRow(
                label: 'Jours validés',
                value: contract.validatedDays != null
                    ? '${contract.validatedDays}'
                    : '-',
              ),
              _DetailRow(
                label: 'Date début',
                value: contract.startDate != null
                    ? _formatDate(contract.startDate!)
                    : '-',
              ),
              _DetailRow(
                label: 'Date activation',
                value: contract.activatedAt != null
                    ? _formatDate(contract.activatedAt!)
                    : '-',
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── Section Checklist ─────────────────────────────────────────────
          if (hasChecklist) ...[
            _SectionCard(
              title: 'Checklist',
              icon: Icons.checklist_outlined,
              children: [
                _ChecklistRow(
                  label: 'KYC',
                  value: contract.kycValidated,
                ),
                _ChecklistRow(
                  label: 'Terrain',
                  value: contract.fieldValidated,
                ),
                _ChecklistRow(
                  label: 'Caution',
                  value: contract.depositPaid,
                ),
                _ChecklistRow(
                  label: 'Contrat signé',
                  value: contract.contractSigned,
                ),
                _ChecklistRow(
                  label: 'Manager',
                  value: contract.managerApproved,
                ),
                _ChecklistRow(
                  label: 'Admin',
                  value: contract.adminApproved,
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],

          // ── Action buttons ────────────────────────────────────────────────
          _ActionButtons(
            contract: contract,
            cubit: cubit,
            isLoading: isActionInProgress,
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) =>
      '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
}

class _ActionButtons extends StatelessWidget {
  const _ActionButtons({
    required this.contract,
    required this.cubit,
    required this.isLoading,
  });

  final Contract contract;
  final ContractDetailCubit cubit;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final status = contract.status;

    final showActivate = status == ContractStatus.draft ||
        status == ContractStatus.pendingApproval ||
        status == ContractStatus.pending;
    final showSuspend = status == ContractStatus.active;
    final showClose = status == ContractStatus.active ||
        status == ContractStatus.suspended;

    if (!showActivate && !showSuspend && !showClose) {
      return const SizedBox.shrink();
    }

    return Column(
      children: [
        if (showActivate)
          AppButton(
            label: 'Activer le contrat',
            isLoading: isLoading,
            icon: Icons.play_circle_outline,
            onPressed: () => cubit.activateContract(),
          ),
        if (showSuspend) ...[
          if (showActivate) const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.warning,
                side: const BorderSide(color: AppColors.warning),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onPressed: isLoading ? null : () => cubit.suspendContract(),
              icon: const Icon(Icons.pause_circle_outline, size: 18),
              label: const Text('Suspendre'),
            ),
          ),
        ],
        if (showClose) ...[
          if (showActivate || showSuspend) const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: const BorderSide(color: AppColors.error),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onPressed: isLoading ? null : () => cubit.closeContract(),
              icon: const Icon(Icons.stop_circle_outlined, size: 18),
              label: const Text('Clôturer'),
            ),
          ),
        ],
      ],
    );
  }
}

// ── Reusable sub-widgets ───────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.children,
  });

  final String title;
  final IconData icon;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Row(
              children: [
                Icon(icon, size: 16, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              children: children,
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.label,
    required this.value,
    this.bold = false,
  });

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChecklistRow extends StatelessWidget {
  const _ChecklistRow({required this.label, required this.value});

  final String label;
  final bool? value;

  @override
  Widget build(BuildContext context) {
    final icon = value == null
        ? const Icon(Icons.remove, size: 18, color: AppColors.textSecondary)
        : value!
            ? const Icon(Icons.check_circle, size: 18, color: AppColors.success)
            : const Icon(Icons.cancel, size: 18, color: AppColors.error);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          icon,
          const SizedBox(width: 10),
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final ContractStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: status.color.withValues(alpha: 0.4)),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: status.color,
        ),
      ),
    );
  }
}
