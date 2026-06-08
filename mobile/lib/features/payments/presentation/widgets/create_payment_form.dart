import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/datasources/form_options_datasource.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/entity_selector_field.dart';
import '../../domain/entities/payment.dart';
import '../cubit/payments_cubit.dart';
import '../cubit/payments_state.dart';

class CreatePaymentForm extends StatefulWidget {
  const CreatePaymentForm({super.key});

  @override
  State<CreatePaymentForm> createState() => _CreatePaymentFormState();
}

class _CreatePaymentFormState extends State<CreatePaymentForm> {
  final _formKey = GlobalKey<FormState>();

  // ── Sélecteur contrat (remplace contractId + vehicleId + driverId manuels) ─
  ContractOption? _selectedContract;
  List<ContractOption> _contracts = [];
  bool _loadingContracts = true;

  // ── Autres champs ──────────────────────────────────────────────────────────
  final _amountController = TextEditingController();
  final _referenceController = TextEditingController();

  PaymentSource _selectedSource = PaymentSource.manual;
  DateTime _paidAt = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadContracts();
  }

  Future<void> _loadContracts() async {
    try {
      final contracts =
          await sl<FormOptionsDatasource>().getContracts(status: 'ACTIVE');
      if (mounted) {
        setState(() {
          _contracts = contracts;
          _loadingContracts = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingContracts = false);
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _paidAt,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      helpText: 'Date du paiement',
    );
    if (picked != null) setState(() => _paidAt = picked);
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedContract == null) return;

    final amountText = _amountController.text.trim().replaceAll(',', '.');
    final amount = double.tryParse(amountText);
    if (amount == null || amount <= 0) return;

    // vehicleId et driverId sont déduits du contrat sélectionné
    final contract = _selectedContract!;
    if (contract.vehicleId.isEmpty) return;
    if (contract.driverId == null || contract.driverId!.isEmpty) return;

    context.read<PaymentsCubit>().createPayment(
          contractId: contract.id,
          vehicleId: contract.vehicleId,
          driverId: contract.driverId!,
          amount: amount,
          source: _selectedSource.value,
          paidAt: _paidAt.toIso8601String(),
          reference: _referenceController.text.trim().isEmpty
              ? null
              : _referenceController.text.trim(),
        );
  }

  String _formatDate(DateTime date) =>
      '${date.day.toString().padLeft(2, '0')}/'
      '${date.month.toString().padLeft(2, '0')}/'
      '${date.year}';

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<PaymentsCubit, PaymentsState>(
      listener: (context, state) {
        if (state is PaymentsCreated) {
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Paiement enregistré avec succès'),
              backgroundColor: AppColors.success,
            ),
          );
        } else if (state is PaymentsCreateError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.error,
            ),
          );
        }
      },
      builder: (context, state) {
        final isCreating = state is PaymentsCreating;

        return Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── Sélecteur Contrat ────────────────────────────────────────
              const _SectionLabel('Contrat *'),
              const SizedBox(height: 8),
              EntitySelectorField<ContractOption>(
                label: 'Sélectionner un contrat actif',
                items: _contracts,
                labelOf: contractLabel,
                subtitleOf: contractSubtitle,
                initialValue: _selectedContract,
                isLoading: _loadingContracts,
                prefixIcon: Icons.description_outlined,
                searchHint: 'Rechercher par plaque, chauffeur…',
                emptyMessage: 'Aucun contrat actif trouvé',
                onChanged: (c) => setState(() => _selectedContract = c),
                validator: (v) =>
                    v == null ? 'Sélectionnez un contrat' : null,
              ),

              // ── Récapitulatif du contrat sélectionné ─────────────────────
              if (_selectedContract != null) ...[
                const SizedBox(height: 8),
                _ContractSummaryTile(contract: _selectedContract!),
              ],

              const SizedBox(height: 16),

              // ── Montant ──────────────────────────────────────────────────
              const _SectionLabel('Montant & Source'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _amountController,
                decoration: const InputDecoration(
                  labelText: 'Montant (FCFA)',
                  hintText: 'ex: 15000',
                  prefixIcon: Icon(Icons.payments_outlined, size: 20),
                ),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[\d,.]')),
                ],
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Champ obligatoire';
                  final parsed =
                      double.tryParse(v.trim().replaceAll(',', '.'));
                  if (parsed == null || parsed <= 0) return 'Montant invalide';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<PaymentSource>(
                initialValue: _selectedSource,
                decoration: const InputDecoration(
                  labelText: 'Source du paiement',
                  prefixIcon: Icon(Icons.account_balance_wallet_outlined,
                      size: 20),
                ),
                items: PaymentSource.values
                    .map((s) => DropdownMenuItem(
                        value: s, child: Text(s.label)))
                    .toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _selectedSource = v);
                },
              ),

              const SizedBox(height: 16),

              // ── Date ─────────────────────────────────────────────────────
              const _SectionLabel('Date du paiement'),
              const SizedBox(height: 8),
              InkWell(
                onTap: isCreating ? null : _pickDate,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined,
                          size: 18, color: AppColors.textSecondary),
                      const SizedBox(width: 10),
                      Text(
                        _formatDate(_paidAt),
                        style: const TextStyle(
                            fontSize: 15, color: AppColors.textPrimary),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // ── Référence ────────────────────────────────────────────────
              const _SectionLabel('Référence (optionnel)'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _referenceController,
                decoration: const InputDecoration(
                  labelText: 'Référence',
                  hintText: 'ex: TXN-20240601-001',
                ),
              ),

              const SizedBox(height: 24),
              AppButton(
                label: 'Enregistrer le paiement',
                isLoading: isCreating,
                onPressed: isCreating ? null : _submit,
                icon: Icons.save_outlined,
              ),
            ],
          ),
        );
      },
    );
  }
}

// ── Récapitulatif du contrat sélectionné ─────────────────────────────────────

class _ContractSummaryTile extends StatelessWidget {
  const _ContractSummaryTile({required this.contract});

  final ContractOption contract;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline,
              color: AppColors.primary, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${contract.vehiclePlate} — ${contract.vehicleBrand} ${contract.vehicleModel}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
                if (contract.driverName != null)
                  Text(
                    contract.driverName!,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary),
                  ),
                if (contract.driverId == null)
                  const Text(
                    '⚠ Aucun chauffeur assigné — paiement impossible',
                    style:
                        TextStyle(fontSize: 11, color: AppColors.warning),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Sous-widgets ──────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: AppColors.textSecondary,
        letterSpacing: 0.5,
      ),
    );
  }
}
