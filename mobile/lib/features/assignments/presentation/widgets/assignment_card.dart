import 'package:flutter/material.dart';

import '../../../../shared/theme/app_theme.dart';
import '../../domain/entities/assignment.dart';

class AssignmentCard extends StatelessWidget {
  const AssignmentCard({
    super.key,
    required this.assignment,
    this.onEndAssignment,
    this.isActing = false,
  });

  final Assignment assignment;
  final VoidCallback? onEndAssignment;
  final bool isActing;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: assignment.isActive
              ? AppColors.primary.withValues(alpha: 0.25)
              : AppColors.border,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── En-tête : véhicule ↔ chauffeur + badge statut ─────────────
            Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      const Icon(
                        Icons.directions_car_outlined,
                        size: 14,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          assignment.vehicleLabel,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6),
                        child: Icon(
                          Icons.swap_horiz,
                          size: 14,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const Icon(
                        Icons.person_outline,
                        size: 14,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          assignment.driverLabel,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _StatusBadge(isActive: assignment.isActive),
              ],
            ),
            const SizedBox(height: 8),

            // ── Dates ─────────────────────────────────────────────────────
            DefaultTextStyle(
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.calendar_today_outlined,
                    size: 12,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text('Début : ${_fmtDate(assignment.startDate)}'),
                  if (assignment.endDate != null) ...[
                    const Text(' · '),
                    Text('Fin : ${_fmtDate(assignment.endDate!)}'),
                  ],
                ],
              ),
            ),

            // ── Source ────────────────────────────────────────────────────
            const SizedBox(height: 4),
            Text(
              'Source : ${assignment.sourceLabel}',
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textSecondary,
              ),
            ),

            // ── Notes ─────────────────────────────────────────────────────
            if (assignment.notes != null && assignment.notes!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                assignment.notes!,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.textSecondary,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],

            // ── Action : mettre fin ────────────────────────────────────────
            if (onEndAssignment != null) ...[
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: isActing ? null : onEndAssignment,
                  icon: const Icon(Icons.cancel_outlined, size: 15),
                  label: const Text(
                    'Mettre fin',
                    style: TextStyle(fontSize: 12),
                  ),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.error,
                    visualDensity: VisualDensity.compact,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/'
      '${d.month.toString().padLeft(2, '0')}/${d.year}';
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.isActive});
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final color = isActive ? AppColors.success : AppColors.textSecondary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        isActive ? 'Actif' : 'Terminé',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
