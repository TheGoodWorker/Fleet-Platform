import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/app_button.dart';
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

  final _contractIdController = TextEditingController();
  final _vehicleIdController = TextEditingController();
  final _driverIdController = TextEditingController();
  final _amountController = TextEditingController();
  final _referenceController = TextEditingController();

  PaymentSource _selectedSource = PaymentSource.manual;
  DateTime _paidAt = DateTime.now();

  @override
  void dispose() {
    _contractIdController.dispose();
    _vehicleIdController.dispose();
    _driverIdController.dispose();
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
    if (picked != null) {
      setState(() => _paidAt = picked);
    }
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final amountText = _amountController.text.trim().replaceAll(',', '.');
    final amount = double.tryParse(amountText);
    if (amount == null || amount <= 0) return;

    context.read<PaymentsCubit>().createPayment(
          contractId: _contractIdController.text.trim(),
          vehicleId: _vehicleIdController.text.trim(),
          driverId: _driverIdController.text.trim(),
          amount: amount,
          source: _selectedSource.value,
          paidAt: _paidAt.toIso8601String(),
          reference: _referenceController.text.trim().isEmpty
              ? null
              : _referenceController.text.trim(),
        );
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }

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
              const _SectionLabel('Identifiants'),
              const SizedBox(height: 8),
              _Field(
                controller: _contractIdController,
                label: 'ID Contrat',
                hint: 'ex: clx8abc...',
                validator: _requiredValidator,
              ),
              const SizedBox(height: 12),
              _Field(
                controller: _vehicleIdController,
                label: 'ID Véhicule',
                hint: 'ex: clx8xyz...',
                validator: _requiredValidator,
              ),
              const SizedBox(height: 12),
              _Field(
                controller: _driverIdController,
                label: 'ID Chauffeur',
                hint: 'ex: clx8def...',
                validator: _requiredValidator,
              ),
              const SizedBox(height: 16),
              const _SectionLabel('Montant & Source'),
              const SizedBox(height: 8),
              _Field(
                controller: _amountController,
                label: 'Montant (FCFA)',
                hint: 'ex: 15000',
                keyboardType: const TextInputType.numberWithOptions(
                    decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(
                      RegExp(r'[\d,.]')),
                ],
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Champ obligatoire';
                  }
                  final parsed =
                      double.tryParse(v.trim().replaceAll(',', '.'));
                  if (parsed == null || parsed <= 0) {
                    return 'Montant invalide';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              _SourceDropdown(
                value: _selectedSource,
                onChanged: (v) {
                  if (v != null) setState(() => _selectedSource = v);
                },
              ),
              const SizedBox(height: 16),
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
                    border:
                        Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.calendar_today_outlined,
                        size: 18,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        _formatDate(_paidAt),
                        style: const TextStyle(
                          fontSize: 15,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const _SectionLabel('Référence (optionnel)'),
              const SizedBox(height: 8),
              _Field(
                controller: _referenceController,
                label: 'Référence',
                hint: 'ex: TXN-20240601-001',
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

  String? _requiredValidator(String? value) {
    if (value == null || value.trim().isEmpty) return 'Champ obligatoire';
    return null;
  }
}

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

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    this.hint,
    this.validator,
    this.keyboardType,
    this.inputFormatters,
  });

  final TextEditingController controller;
  final String label;
  final String? hint;
  final FormFieldValidator<String>? validator;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
      ),
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      validator: validator,
      autovalidateMode: AutovalidateMode.onUserInteraction,
    );
  }
}

class _SourceDropdown extends StatelessWidget {
  const _SourceDropdown({
    required this.value,
    required this.onChanged,
  });

  final PaymentSource value;
  final ValueChanged<PaymentSource?> onChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<PaymentSource>(
      initialValue: value,
      decoration: const InputDecoration(
        labelText: 'Source du paiement',
      ),
      items: PaymentSource.values.map((source) {
        return DropdownMenuItem(
          value: source,
          child: Text(source.label),
        );
      }).toList(),
      onChanged: onChanged,
    );
  }
}
