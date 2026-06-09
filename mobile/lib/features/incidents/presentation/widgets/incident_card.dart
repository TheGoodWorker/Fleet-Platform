import 'package:flutter/material.dart';

import '../../../../shared/theme/app_theme.dart';
import '../../domain/entities/incident.dart';

class IncidentCard extends StatelessWidget {
  const IncidentCard({super.key, required this.incident, this.onTap});
  final Incident incident;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header row ───────────────────────────────────────────
              Row(
                children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      color: incident.type.color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(incident.type.icon,
                        color: incident.type.color, size: 18),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          incident.type.label,
                          style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary),
                        ),
                        Text(
                          incident.vehicleLabel,
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  _StatusChip(status: incident.status),
                ],
              ),
              const SizedBox(height: 10),

              // ── Description ──────────────────────────────────────────
              Text(
                incident.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.textSecondary),
              ),

              const SizedBox(height: 8),

              // ── Footer row ───────────────────────────────────────────
              Row(
                children: [
                  _SeverityChip(severity: incident.severity),
                  const Spacer(),
                  const Icon(Icons.access_time_outlined,
                      size: 12, color: AppColors.textDisabled),
                  const SizedBox(width: 4),
                  Text(
                    _formatDate(incident.occurredAt),
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textDisabled),
                  ),
                  if (incident.hasAccidentCase) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.folder_outlined,
                        size: 12, color: AppColors.primary),
                    const SizedBox(width: 2),
                    const Text('Dossier',
                        style: TextStyle(
                            fontSize: 11, color: AppColors.primary)),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/'
      '${d.month.toString().padLeft(2, '0')}/${d.year}';
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final IncidentStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: status.color.withValues(alpha: 0.4)),
      ),
      child: Text(status.label,
          style: TextStyle(
              fontSize: 11, fontWeight: FontWeight.w600, color: status.color)),
    );
  }
}

class _SeverityChip extends StatelessWidget {
  const _SeverityChip({required this.severity});
  final IncidentSeverity severity;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: severity.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(severity.label,
          style: TextStyle(
              fontSize: 10, fontWeight: FontWeight.w600,
              color: severity.color)),
    );
  }
}
