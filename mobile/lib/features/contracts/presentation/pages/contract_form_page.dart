import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injection.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../domain/entities/contract.dart';
import '../cubit/contract_detail_cubit.dart';
import '../cubit/contract_detail_state.dart';

class ContractFormPage extends StatelessWidget {
  const ContractFormPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<ContractDetailCubit>(),
      child: const _ContractFormView(),
    );
  }
}

class _ContractFormView extends StatefulWidget {
  const _ContractFormView();

  @override
  State<_ContractFormView> createState() => _ContractFormViewState();
}

class _ContractFormViewState extends State<_ContractFormView> {
  final _formKey = GlobalKey<FormState>();

  ContractType _selectedType = ContractType.ownershipProgram;

  final _vehicleIdCtrl = TextEditingController();
  final _managerIdCtrl = TextEditingController();
  final _driverIdCtrl = TextEditingController();
  final _ownerIdCtrl = TextEditingController();
  final _dailyAmountCtrl = TextEditingController();
  final _targetDaysCtrl = TextEditingController();
  final _restDayCtrl = TextEditingController();
  final _simpleRentalMonthlyAmountCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  String? _ownerPaymentFrequency;

  static const _paymentFrequencies = [
    ('MONTHLY', 'Mensuel'),
    ('WEEKLY', 'Hebdomadaire'),
    ('BIWEEKLY', 'Bimensuel'),
  ];

  @override
  void dispose() {
    _vehicleIdCtrl.dispose();
    _managerIdCtrl.dispose();
    _driverIdCtrl.dispose();
    _ownerIdCtrl.dispose();
    _dailyAmountCtrl.dispose();
    _targetDaysCtrl.dispose();
    _restDayCtrl.dispose();
    _simpleRentalMonthlyAmountCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final cubit = context.read<ContractDetailCubit>();
    cubit.createContract(
      type: _selectedType.value,
      vehicleId: _vehicleIdCtrl.text.trim(),
      managerId: _managerIdCtrl.text.trim(),
      driverId:
          _driverIdCtrl.text.trim().isNotEmpty ? _driverIdCtrl.text.trim() : null,
      ownerId:
          _ownerIdCtrl.text.trim().isNotEmpty ? _ownerIdCtrl.text.trim() : null,
      dailyAmount: double.parse(_dailyAmountCtrl.text.trim()),
      targetDays: _selectedType == ContractType.ownershipProgram &&
              _targetDaysCtrl.text.trim().isNotEmpty
          ? int.tryParse(_targetDaysCtrl.text.trim())
          : null,
      restDay: _restDayCtrl.text.trim().isNotEmpty
          ? int.tryParse(_restDayCtrl.text.trim())
          : null,
      simpleRentalMonthlyAmount:
          _selectedType == ContractType.simpleRental &&
                  _simpleRentalMonthlyAmountCtrl.text.trim().isNotEmpty
              ? double.tryParse(_simpleRentalMonthlyAmountCtrl.text.trim())
              : null,
      ownerPaymentFrequency: _selectedType == ContractType.simpleRental
          ? _ownerPaymentFrequency
          : null,
      notes:
          _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null,
    );
  }

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
          context.pop();
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
        final isLoading = state is ContractDetailActionInProgress;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Nouveau contrat'),
          ),
          body: Form(
            key: _formKey,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── 1. Type ──────────────────────────────────────────────
                  const _SectionHeader(title: 'Type de contrat'),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<ContractType>(
                    initialValue: _selectedType,
                    decoration: _inputDecoration('Type *'),
                    items: ContractType.values
                        .map(
                          (t) => DropdownMenuItem(
                            value: t,
                            child: Text(t.label),
                          ),
                        )
                        .toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _selectedType = v);
                    },
                    validator: (v) => v == null ? 'Champ requis' : null,
                  ),
                  const SizedBox(height: 20),

                  // ── 2. vehicleId ─────────────────────────────────────────
                  const _SectionHeader(title: 'Véhicule'),
                  const SizedBox(height: 8),
                  _UuidField(
                    label: 'ID Véhicule *',
                    controller: _vehicleIdCtrl,
                    required: true,
                  ),
                  const SizedBox(height: 20),

                  // ── 3. managerId ─────────────────────────────────────────
                  const _SectionHeader(title: 'Manager'),
                  const SizedBox(height: 8),
                  _UuidField(
                    label: 'ID Manager *',
                    controller: _managerIdCtrl,
                    required: true,
                  ),
                  const SizedBox(height: 20),

                  // ── 4. driverId ──────────────────────────────────────────
                  const _SectionHeader(
                    title: 'Chauffeur',
                    subtitle: 'Optionnel pour PARTNER_FLEET',
                  ),
                  const SizedBox(height: 8),
                  _UuidField(
                    label: 'ID Chauffeur (optionnel)',
                    controller: _driverIdCtrl,
                    required: false,
                  ),
                  const SizedBox(height: 20),

                  // ── 5. ownerId ───────────────────────────────────────────
                  const _SectionHeader(title: 'Propriétaire'),
                  const SizedBox(height: 8),
                  _UuidField(
                    label: 'ID Propriétaire (optionnel)',
                    controller: _ownerIdCtrl,
                    required: false,
                  ),
                  const SizedBox(height: 20),

                  // ── 6. dailyAmount ───────────────────────────────────────
                  const _SectionHeader(title: 'Financier'),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _dailyAmountCtrl,
                    decoration: _inputDecoration('Montant journalier * (FCFA)'),
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'Champ requis';
                      }
                      if (double.tryParse(v.trim()) == null) {
                        return 'Montant invalide';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),

                  // ── 7. targetDays (OWNERSHIP_PROGRAM only) ───────────────
                  if (_selectedType == ContractType.ownershipProgram) ...[
                    TextFormField(
                      controller: _targetDaysCtrl,
                      decoration: _inputDecoration(
                        'Jours cible (Programme propriété)',
                      ),
                      keyboardType: TextInputType.number,
                      validator: (v) {
                        if (v != null &&
                            v.trim().isNotEmpty &&
                            int.tryParse(v.trim()) == null) {
                          return 'Nombre entier requis';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                  ],

                  // ── 8. restDay ───────────────────────────────────────────
                  TextFormField(
                    controller: _restDayCtrl,
                    decoration: _inputDecoration(
                      'Jour de repos (0=Dim, 6=Sam) — optionnel',
                    ),
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      if (v != null && v.trim().isNotEmpty) {
                        final n = int.tryParse(v.trim());
                        if (n == null || n < 0 || n > 6) {
                          return 'Valeur entre 0 et 6';
                        }
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),

                  // ── 9-10. SIMPLE_RENTAL extra fields ─────────────────────
                  if (_selectedType == ContractType.simpleRental) ...[
                    const _SectionHeader(title: 'Location simple'),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _simpleRentalMonthlyAmountCtrl,
                      decoration: _inputDecoration(
                        'Montant mensuel propriétaire * (FCFA)',
                      ),
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      validator: (v) {
                        if (_selectedType != ContractType.simpleRental) {
                          return null;
                        }
                        if (v == null || v.trim().isEmpty) {
                          return 'Champ requis pour Location simple';
                        }
                        if (double.tryParse(v.trim()) == null) {
                          return 'Montant invalide';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _ownerPaymentFrequency,
                      decoration: _inputDecoration('Fréquence paiement propriétaire'),
                      items: _paymentFrequencies
                          .map(
                            (f) => DropdownMenuItem(
                              value: f.$1,
                              child: Text(f.$2),
                            ),
                          )
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _ownerPaymentFrequency = v),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // ── 11. Notes ────────────────────────────────────────────
                  const _SectionHeader(title: 'Notes'),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _notesCtrl,
                    decoration: _inputDecoration('Notes (optionnel)'),
                    maxLines: 3,
                    keyboardType: TextInputType.multiline,
                    textInputAction: TextInputAction.newline,
                  ),
                  const SizedBox(height: 28),

                  // ── Submit ───────────────────────────────────────────────
                  AppButton(
                    label: 'Créer le contrat',
                    isLoading: isLoading,
                    icon: Icons.add_circle_outline,
                    onPressed: isLoading ? null : _submit,
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.borderFocus, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.error, width: 2),
      ),
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    );
  }
}

// ── Reusable sub-widgets ───────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle!,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ],
    );
  }
}

class _UuidField extends StatelessWidget {
  const _UuidField({
    required this.label,
    required this.controller,
    required this.required,
  });

  final String label;
  final TextEditingController controller;
  final bool required;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.borderFocus, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.error, width: 2),
        ),
        filled: true,
        fillColor: AppColors.surface,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        hintText: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        hintStyle: const TextStyle(
          fontSize: 12,
          color: AppColors.textDisabled,
        ),
      ),
      keyboardType: TextInputType.text,
      autocorrect: false,
      validator: (v) {
        if (required && (v == null || v.trim().isEmpty)) {
          return 'Champ requis';
        }
        return null;
      },
    );
  }
}
