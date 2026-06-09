import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../domain/entities/incident.dart';
import '../cubit/incident_detail_cubit.dart';
import '../cubit/incident_detail_state.dart';

class IncidentDetailPage extends StatelessWidget {
  const IncidentDetailPage({super.key, required this.incidentId});
  final String incidentId;

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<IncidentDetailCubit, IncidentDetailState>(
      listener: (context, state) {
        if (state is IncidentDetailActionSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.message),
            backgroundColor: AppColors.success,
          ));
        } else if (state is IncidentDetailActionError) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.message),
            backgroundColor: AppColors.error,
          ));
        }
      },
      builder: (context, state) {
        final incident = switch (state) {
          IncidentDetailLoaded(:final incident) => incident,
          IncidentDetailActionInProgress(:final incident) => incident,
          IncidentDetailActionSuccess(:final incident) => incident,
          IncidentDetailActionError(:final incident) => incident,
          _ => null,
        };
        final isActing = state is IncidentDetailActionInProgress;

        return Scaffold(
          appBar: AppBar(
            title: Text(incident?.type.label ?? 'Incident'),
          ),
          body: switch (state) {
            IncidentDetailInitial() ||
            IncidentDetailLoading() =>
              const LoadingView(message: 'Chargement…'),
            IncidentDetailError(:final message) => ErrorView(
                message: message,
                onRetry: () => context
                    .read<IncidentDetailCubit>()
                    .load(incidentId),
              ),
            _ when incident != null => _DetailContent(
                incident: incident,
                isActing: isActing,
                incidentId: incidentId,
              ),
            _ => const LoadingView(message: 'Chargement…'),
          },
        );
      },
    );
  }
}

// ── Detail content ────────────────────────────────────────────────────────────

class _DetailContent extends StatelessWidget {
  const _DetailContent({
    required this.incident,
    required this.isActing,
    required this.incidentId,
  });
  final Incident incident;
  final bool isActing;
  final String incidentId;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Chips header ─────────────────────────────────────────────
          Wrap(
            spacing: 8, runSpacing: 6,
            children: [
              _TypeChip(type: incident.type),
              _StatusChip(status: incident.status),
              _SeverityChip(severity: incident.severity),
            ],
          ),
          const SizedBox(height: 16),

          // ── Véhicule ─────────────────────────────────────────────────
          _Section(
            title: 'Véhicule',
            children: [
              _InfoRow('Immatriculation', incident.vehiclePlate ?? '—'),
              if (incident.vehicleBrand != null)
                _InfoRow(
                    'Véhicule', '${incident.vehicleBrand} ${incident.vehicleModel ?? ''}'),
            ],
          ),
          const SizedBox(height: 12),

          // ── Description ──────────────────────────────────────────────
          _Section(
            title: 'Description',
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(incident.description,
                    style: const TextStyle(
                        fontSize: 14, color: AppColors.textPrimary,
                        height: 1.5)),
              ),
            ],
          ),
          if (incident.notes != null && incident.notes!.isNotEmpty) ...[
            const SizedBox(height: 12),
            _Section(
              title: 'Notes',
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(incident.notes!,
                      style: const TextStyle(
                          fontSize: 14, color: AppColors.textSecondary,
                          height: 1.5)),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),

          // ── Historique / Timeline ─────────────────────────────────────
          _Section(
            title: 'Historique',
            children: [
              _TimelineRow(
                icon: Icons.report_outlined,
                color: AppColors.error,
                label: 'Incident survenu',
                date: incident.occurredAt,
              ),
              _TimelineRow(
                icon: Icons.add_circle_outline,
                color: AppColors.primary,
                label: 'Déclaré dans le système',
                date: incident.createdAt,
              ),
              if (incident.resolvedAt != null)
                _TimelineRow(
                  icon: Icons.check_circle_outline,
                  color: AppColors.success,
                  label: 'Résolu',
                  date: incident.resolvedAt!,
                ),
            ],
          ),

          if (incident.chargesCount > 0) ...[
            const SizedBox(height: 12),
            _Section(
              title: 'Données liées',
              children: [
                _InfoRow('Charges associées', '${incident.chargesCount}'),
                if (incident.hasAccidentCase)
                  const _InfoRow('Dossier accident', 'Ouvert'),
              ],
            ),
          ],

          const SizedBox(height: 20),

          // ── Actions ───────────────────────────────────────────────────
          _ActionButtons(
            incident: incident,
            isActing: isActing,
          ),
        ],
      ),
    );
  }
}

// ── Action buttons ────────────────────────────────────────────────────────────

class _ActionButtons extends StatefulWidget {
  const _ActionButtons({required this.incident, required this.isActing});
  final Incident incident;
  final bool isActing;

  @override
  State<_ActionButtons> createState() => _ActionButtonsState();
}

class _ActionButtonsState extends State<_ActionButtons> {
  final _notesCtrl = TextEditingController();

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<IncidentDetailCubit>();
    final s = widget.incident.status;
    final isActing = widget.isActing;

    if (s == IncidentStatus.closed) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.border),
        ),
        child: const Row(
          children: [
            Icon(Icons.lock_outline, color: AppColors.textDisabled, size: 18),
            SizedBox(width: 8),
            Text('Incident clôturé — aucune action disponible',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          ],
        ),
      );
    }

    return Column(
      children: [
        if (s == IncidentStatus.open)
          AppButton(
            label: 'Prendre en charge',
            icon: Icons.play_circle_outline,
            variant: AppButtonVariant.primary,
            isLoading: isActing,
            onPressed: isActing ? null : cubit.markInProgress,
          ),

        if (s == IncidentStatus.inProgress) ...[
          TextField(
            controller: _notesCtrl,
            decoration: const InputDecoration(
              labelText: 'Notes de résolution (optionnel)',
              hintText: 'Décrivez comment l\'incident a été résolu…',
            ),
            maxLines: 3,
          ),
          const SizedBox(height: 12),
          AppButton(
            label: 'Marquer comme résolu',
            icon: Icons.check_circle_outline,
            variant: AppButtonVariant.primary,
            isLoading: isActing,
            onPressed: isActing
                ? null
                : () => cubit.resolve(
                    notes: _notesCtrl.text.trim().isEmpty
                        ? null
                        : _notesCtrl.text.trim()),
          ),
        ],

        if (s == IncidentStatus.resolved) ...[
          AppButton(
            label: 'Clôturer définitivement',
            icon: Icons.lock_outline,
            variant: AppButtonVariant.secondary,
            isLoading: isActing,
            onPressed: isActing ? null : cubit.closeIncident,
          ),
        ],
      ],
    );
  }
}

// ── Shared sub-widgets ────────────────────────────────────────────────────────

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title.toUpperCase(),
          style: const TextStyle(
              fontSize: 11, fontWeight: FontWeight.w700,
              color: AppColors.textSecondary, letterSpacing: 0.8),
        ),
        const SizedBox(height: 6),
        Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Column(children: children),
          ),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(
              fontSize: 14, color: AppColors.textSecondary)),
          Text(value, style: const TextStyle(
              fontSize: 14, fontWeight: FontWeight.w600,
              color: AppColors.textPrimary)),
        ],
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.icon,
    required this.color,
    required this.label,
    required this.date,
  });
  final IconData icon;
  final Color color;
  final String label;
  final DateTime date;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label, style: const TextStyle(
                fontSize: 13, color: AppColors.textPrimary)),
          ),
          Text(
            '${date.day.toString().padLeft(2, '0')}/'
            '${date.month.toString().padLeft(2, '0')}/${date.year}',
            style: const TextStyle(
                fontSize: 12, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  const _TypeChip({required this.type});
  final IncidentType type;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: type.color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: type.color.withValues(alpha: 0.4)),
    ),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(type.icon, size: 13, color: type.color),
      const SizedBox(width: 4),
      Text(type.label, style: TextStyle(
          fontSize: 12, fontWeight: FontWeight.w600, color: type.color)),
    ]),
  );
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final IncidentStatus status;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: status.color.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: status.color.withValues(alpha: 0.4)),
    ),
    child: Text(status.label, style: TextStyle(
        fontSize: 12, fontWeight: FontWeight.w600, color: status.color)),
  );
}

class _SeverityChip extends StatelessWidget {
  const _SeverityChip({required this.severity});
  final IncidentSeverity severity;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: severity.color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: severity.color.withValues(alpha: 0.3)),
    ),
    child: Text(severity.label, style: TextStyle(
        fontSize: 12, fontWeight: FontWeight.w600, color: severity.color)),
  );
}
