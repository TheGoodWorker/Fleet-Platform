import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/datasources/form_options_datasource.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/entity_selector_field.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_state.dart';
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

  // ── Type contrat ───────────────────────────────────────────────────────────
  ContractType _selectedType = ContractType.ownershipProgram;

  // ── Sélections ─────────────────────────────────────────────────────────────
  VehicleOption? _selectedVehicle;
  DriverOption? _selectedDriver;
  OwnerOption? _selectedOwner;

  // ── Champs financiers ──────────────────────────────────────────────────────
  final _dailyAmountCtrl = TextEditingController();
  final _targetDaysCtrl = TextEditingController();
  final _restDayCtrl = TextEditingController();
  final _simpleRentalMonthlyAmountCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String? _ownerPaymentFrequency;

  // ── Listes pour les sélecteurs ─────────────────────────────────────────────
  List<VehicleOption> _vehicles = [];
  List<DriverOption> _drivers = [];
  List<OwnerOption> _owners = [];

  bool _loadingOptions = true;
  String? _optionsError;

  static const _paymentFrequencies = [
    ('MONTHLY', 'Mensuel'),
    ('WEEKLY', 'Hebdomadaire'),
    ('BIWEEKLY', 'Bimensuel'),
  ];

  @override
  void initState() {
    super.initState();
    _loadOptions();
  }

  Future<void> _loadOptions() async {
    setState(() {
      _loadingOptions = true;
      _optionsError = null;
    });
    try {
      final ds = sl<FormOptionsDatasource>();
      final results = await Future.wait([
        ds.getVehicles(status: 'AVAILABLE'),
        ds.getDrivers(statuses: const ['ACTIVE', 'APPROVED']),
        ds.getOwners(),
      ]);
      if (!mounted) return;
      setState(() {
        _vehicles = results[0] as List<VehicleOption>;
        _drivers = results[1] as List<DriverOption>;
        _owners = results[2] as List<OwnerOption>;
        _loadingOptions = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _optionsError = e.toString();
        _loadingOptions = false;
      });
    }
  }

  @override
  void dispose() {
    _dailyAmountCtrl.dispose();
    _targetDaysCtrl.dispose();
    _restDayCtrl.dispose();
    _simpleRentalMonthlyAmountCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  /// managerId = ID de l'utilisateur connecté (le manager qui crée le contrat)
  String _getManagerId(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated) return authState.user.id;
    return '';
  }

  void _submit(BuildContext context) {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedVehicle == null) return;

    final managerId = _getManagerId(context);
    if (managerId.isEmpty) return;

    final cubit = context.read<ContractDetailCubit>();
    cubit.createContract(
      type: _selectedType.value,
      vehicleId: _selectedVehicle!.id,
      managerId: managerId,
      driverId: _selectedDriver?.id,
      ownerId: _selectedOwner?.id,
      dailyAmount: double.parse(_dailyAmountCtrl.text.trim()),
      targetDays: _selectedType == ContractType.ownershipProgram &&
              _targetDaysCtrl.text.trim().isNotEmpty
          ? int.tryParse(_targetDaysCtrl.text.trim())
          : null,
      restDay: _restDayCtrl.text.trim().isNotEmpty
          ? int.tryParse(_restDayCtrl.text.trim())
          : null,
      simpleRentalMonthlyAmount: _selectedType == ContractType.simpleRental &&
              _simpleRentalMonthlyAmountCtrl.text.trim().isNotEmpty
          ? double.tryParse(_simpleRentalMonthlyAmountCtrl.text.trim())
          : null,
      ownerPaymentFrequency:
          _selectedType == ContractType.simpleRental ? _ownerPaymentFrequency : null,
      notes: _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null,
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
        final isSaving = state is ContractDetailActionInProgress;

        return Scaffold(
          appBar: AppBar(title: const Text('Nouveau contrat')),
          body: Form(
            key: _formKey,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Erreur de chargement des options ─────────────────────
                  if (_optionsError != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.errorLight,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.error),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline,
                              color: AppColors.error, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Impossible de charger les options. $_optionsError',
                              style:
                                  const TextStyle(color: AppColors.error, fontSize: 13),
                            ),
                          ),
                          TextButton(
                            onPressed: _loadOptions,
                            child: const Text('Réessayer'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // ── 1. Type ───────────────────────────────────────────────
                  const _SectionHeader(title: 'Type de contrat'),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<ContractType>(
                    initialValue: _selectedType,
                    decoration: const InputDecoration(labelText: 'Type *'),
                    items: ContractType.values
                        .map((t) => DropdownMenuItem(
                            value: t, child: Text(t.label)))
                        .toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _selectedType = v);
                    },
                    validator: (v) => v == null ? 'Champ requis' : null,
                  ),
                  const SizedBox(height: 20),

                  // ── 2. Véhicule ───────────────────────────────────────────
                  const _SectionHeader(title: 'Véhicule *'),
                  const SizedBox(height: 8),
                  EntitySelectorField<VehicleOption>(
                    label: 'Sélectionner un véhicule',
                    items: _vehicles,
                    labelOf: vehicleLabel,
                    subtitleOf: vehicleSubtitle,
                    initialValue: _selectedVehicle,
                    isLoading: _loadingOptions,
                    prefixIcon: Icons.directions_car_outlined,
                    searchHint: 'Rechercher par plaque, marque…',
                    emptyMessage: 'Aucun véhicule disponible',
                    onChanged: (v) => setState(() => _selectedVehicle = v),
                    validator: (v) => v == null ? 'Sélectionnez un véhicule' : null,
                  ),
                  const SizedBox(height: 20),

                  // ── 3. Chauffeur ──────────────────────────────────────────
                  const _SectionHeader(
                    title: 'Chauffeur',
                    subtitle: 'Optionnel pour PARTNER_FLEET multi-conducteur',
                  ),
                  const SizedBox(height: 8),
                  EntitySelectorField<DriverOption>(
                    label: 'Sélectionner un chauffeur (optionnel)',
                    items: _drivers,
                    labelOf: driverLabel,
                    subtitleOf: driverSubtitle,
                    initialValue: _selectedDriver,
                    isLoading: _loadingOptions,
                    prefixIcon: Icons.person_outline,
                    searchHint: 'Rechercher par nom, téléphone…',
                    emptyMessage: 'Aucun chauffeur actif/approuvé',
                  ),
                  const SizedBox(height: 20),

                  // ── 4. Propriétaire ───────────────────────────────────────
                  const _SectionHeader(title: 'Propriétaire'),
                  const SizedBox(height: 8),
                  EntitySelectorField<OwnerOption>(
                    label: 'Sélectionner un propriétaire (optionnel)',
                    items: _owners,
                    labelOf: ownerLabel,
                    initialValue: _selectedOwner,
                    isLoading: _loadingOptions,
                    prefixIcon: Icons.business_outlined,
                    searchHint: 'Rechercher par nom…',
                    emptyMessage: 'Aucun propriétaire trouvé',
                    onChanged: (o) => setState(() => _selectedOwner = o),
                  ),
                  const SizedBox(height: 20),

                  // ── 5. Manager (auto-rempli) ──────────────────────────────
                  const _SectionHeader(title: 'Manager responsable'),
                  const SizedBox(height: 8),
                  _ManagerInfoTile(managerId: _getManagerId(context)),
                  const SizedBox(height: 20),

                  // ── 6. Montant journalier ─────────────────────────────────
                  const _SectionHeader(title: 'Financier'),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _dailyAmountCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Montant journalier * (FCFA)',
                      prefixIcon: Icon(Icons.payments_outlined, size: 20),
                    ),
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Champ requis';
                      if (double.tryParse(v.trim()) == null) return 'Montant invalide';
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),

                  // ── 7. Jours cible (OWNERSHIP_PROGRAM) ────────────────────
                  if (_selectedType == ContractType.ownershipProgram) ...[
                    TextFormField(
                      controller: _targetDaysCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Jours cible (Programme propriété)',
                        prefixIcon: Icon(Icons.calendar_month_outlined, size: 20),
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

                  // ── 8. Jour de repos ──────────────────────────────────────
                  TextFormField(
                    controller: _restDayCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Jour de repos (0=Dim … 6=Sam — optionnel)',
                      prefixIcon: Icon(Icons.weekend_outlined, size: 20),
                    ),
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      if (v != null && v.trim().isNotEmpty) {
                        final n = int.tryParse(v.trim());
                        if (n == null || n < 0 || n > 6) return 'Valeur entre 0 et 6';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),

                  // ── 9-10. SIMPLE_RENTAL extra ─────────────────────────────
                  if (_selectedType == ContractType.simpleRental) ...[
                    const _SectionHeader(title: 'Location simple'),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _simpleRentalMonthlyAmountCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Montant mensuel propriétaire * (FCFA)',
                        prefixIcon: Icon(Icons.account_balance_outlined, size: 20),
                      ),
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      validator: (v) {
                        if (_selectedType != ContractType.simpleRental) return null;
                        if (v == null || v.trim().isEmpty) {
                          return 'Champ requis pour Location simple';
                        }
                        if (double.tryParse(v.trim()) == null) return 'Montant invalide';
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _ownerPaymentFrequency,
                      decoration: const InputDecoration(
                        labelText: 'Fréquence de versement',
                      ),
                      items: _paymentFrequencies
                          .map((f) => DropdownMenuItem(
                              value: f.$1, child: Text(f.$2)))
                          .toList(),
                      onChanged: (v) =>
                          setState(() => _ownerPaymentFrequency = v),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // ── 11. Notes ─────────────────────────────────────────────
                  const _SectionHeader(title: 'Notes'),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _notesCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Notes (optionnel)',
                    ),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 28),

                  AppButton(
                    label: 'Créer le contrat',
                    isLoading: isSaving,
                    icon: Icons.add_circle_outline,
                    onPressed: isSaving ? null : () => _submit(context),
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
}

// ── Sous-widgets ──────────────────────────────────────────────────────────────

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
            style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
          ),
        ],
      ],
    );
  }
}

/// Affiche le manager courant en lecture seule (pas un champ à remplir).
class _ManagerInfoTile extends StatelessWidget {
  const _ManagerInfoTile({required this.managerId});

  final String managerId;

  @override
  Widget build(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    final user = authState is AuthAuthenticated ? authState.user : null;
    final name =
        user != null ? '${user.firstName} ${user.lastName}'.trim() : '—';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.manage_accounts_outlined,
              color: AppColors.primary, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name.isNotEmpty ? name : 'Manager',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
                const Text(
                  'Utilisateur connecté — attribué automatiquement',
                  style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          const Icon(Icons.lock_outline, size: 14, color: AppColors.textSecondary),
        ],
      ),
    );
  }
}
