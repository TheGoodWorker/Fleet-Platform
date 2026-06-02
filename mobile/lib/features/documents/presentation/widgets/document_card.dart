import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../shared/theme/app_theme.dart';
import '../../domain/entities/document.dart';

class DocumentCard extends StatelessWidget {
  const DocumentCard({
    super.key,
    required this.document,
    this.onTap,
  });

  final Document document;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: document.status.color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _iconForType(document.type),
                      size: 20,
                      color: document.status.color,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          document.type.label,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        if (document.title != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            document.title!,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  _StatusChip(status: document.status),
                ],
              ),
              if (document.validUntil != null || document.validFrom != null)
                ...[
                const SizedBox(height: 10),
                const Divider(height: 1),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(
                      Icons.event_outlined,
                      size: 15,
                      color: AppColors.textSecondary,
                    ),
                    const SizedBox(width: 6),
                    if (document.validFrom != null && document.validUntil != null)
                      Text(
                        '${_formatDate(document.validFrom!)} → ${_formatDate(document.validUntil!)}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      )
                    else if (document.validUntil != null)
                      Text(
                        'Expire le ${_formatDate(document.validUntil!)}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: document.status == DocumentStatus.expired ||
                                  document.status ==
                                      DocumentStatus.expiringSoon
                              ? document.status.color
                              : AppColors.textSecondary,
                        ),
                      ),
                  ],
                ),
              ],
              if (document.fileUrl != null) ...[
                const SizedBox(height: 10),
                _FileUrlRow(fileUrl: document.fileUrl!),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }

  IconData _iconForType(DocumentType type) => switch (type) {
        DocumentType.insurance => Icons.shield_outlined,
        DocumentType.technicalVisit => Icons.build_circle_outlined,
        DocumentType.grayCard => Icons.credit_card_outlined,
        DocumentType.parkingCard => Icons.local_parking_outlined,
        DocumentType.sticker => Icons.label_outlined,
        DocumentType.patent => Icons.verified_outlined,
        DocumentType.adminAuthorization => Icons.admin_panel_settings_outlined,
        DocumentType.driverLicense => Icons.badge_outlined,
        DocumentType.nationalId => Icons.perm_identity_outlined,
        DocumentType.kycDocument => Icons.how_to_reg_outlined,
        DocumentType.contractDocument => Icons.description_outlined,
        DocumentType.accidentReport => Icons.report_outlined,
        DocumentType.insuranceClaim => Icons.policy_outlined,
        DocumentType.repairQuote => Icons.request_quote_outlined,
        DocumentType.repairExitPermit => Icons.exit_to_app_outlined,
        DocumentType.franchiseProof => Icons.receipt_long_outlined,
        DocumentType.towingProof => Icons.minor_crash_outlined,
        DocumentType.contraventionNotice => Icons.gavel_outlined,
        DocumentType.other => Icons.attach_file_outlined,
      };
}

class _FileUrlRow extends StatelessWidget {
  const _FileUrlRow({required this.fileUrl});

  final String fileUrl;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Clipboard.setData(ClipboardData(text: fileUrl));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lien copié dans le presse-papiers'),
            duration: Duration(seconds: 2),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.primaryLight,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.2),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.link,
              size: 14,
              color: AppColors.primary,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                fileUrl,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.primary,
                  decoration: TextDecoration.underline,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 6),
            const Icon(
              Icons.copy,
              size: 13,
              color: AppColors.primary,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final DocumentStatus status;

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
