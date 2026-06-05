import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/theme/app_theme.dart';
import '../../domain/entities/payment.dart';
import '../cubit/payments_cubit.dart';
import '../cubit/payments_state.dart';

class PaymentDetailPage extends StatelessWidget {
  const PaymentDetailPage({super.key, required this.paymentId});

  final String paymentId;

  @override
  Widget build(BuildContext context) {
    final paymentsState = context.read<PaymentsCubit>().state;
    Payment? payment;
    if (paymentsState is PaymentsLoaded) {
      try {
        payment = paymentsState.payments.firstWhere((p) => p.id == paymentId);
      } catch (_) {
        payment = null;
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Détail paiement')),
      body: payment == null
          ? const Center(child: Text('Paiement introuvable'))
          : _PaymentDetailContent(payment: payment),
    );
  }
}

class _PaymentDetailContent extends StatelessWidget {
  const _PaymentDetailContent({required this.payment});

  final Payment payment;

  String _fmt(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  IconData _sourceIcon(PaymentSource source) => switch (source) {
        PaymentSource.wave => Icons.waves,
        PaymentSource.orangeMoney => Icons.phone_android,
        PaymentSource.manual => Icons.edit,
        PaymentSource.other => Icons.payment,
      };

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──────────────────────────────────────────────────────
          Center(
            child: Column(
              children: [
                Text(
                  '${payment.amount.toStringAsFixed(0)} FCFA',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Chip(
                  label: Text(
                    payment.status.label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  backgroundColor: payment.status.color,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _sourceIcon(payment.source),
                      size: 18,
                      color: AppColors.textSecondary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      payment.source.label,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),
          const Divider(color: AppColors.border),
          const SizedBox(height: 16),

          // ── Section Informations ────────────────────────────────────────
          const Text(
            'Informations',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          _InfoRow(label: 'Date', value: _fmt(payment.paidAt)),
          _InfoRow(label: 'Référence', value: payment.reference ?? '-'),
          _InfoRow(label: 'Notes', value: payment.notes ?? '-'),

          // ── Section Liés ────────────────────────────────────────────────
          if (payment.contractId != null || payment.vehicleId != null) ...[
            const SizedBox(height: 20),
            const Divider(color: AppColors.border),
            const SizedBox(height: 16),
            const Text(
              'Liés',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            if (payment.contractId != null)
              OutlinedButton.icon(
                onPressed: () =>
                    context.push('/contracts/${payment.contractId}'),
                icon: const Icon(Icons.description_outlined),
                label: const Text('Voir le contrat'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                ),
              ),
            if (payment.vehicleId != null) ...[
              const SizedBox(height: 8),
              Text(
                'Véhicule ID: ${payment.vehicleId}',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ],
        ],
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
