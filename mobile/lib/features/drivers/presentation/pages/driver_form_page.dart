import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/datasources/form_options_datasource.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../../../shared/widgets/entity_selector_field.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../cubit/driver_detail_cubit.dart';
import '../cubit/driver_detail_state.dart';

class DriverFormPage extends StatelessWidget {
  const DriverFormPage({super.key, this.driverId});

  final String? driverId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) {
        final cubit = sl<DriverDetailCubit>();
        if (driverId != null) cubit.load(driverId!);
        return cubit;
      },
      child: _DriverFormView(driverId: driverId),
    );
  }
}

class _DriverFormView extends StatefulWidget {
  const _DriverFormView({this.driverId});

  final String? driverId;

  @override
  State<_DriverFormView> createState() => _DriverFormViewState();
}

class _DriverFormViewState extends State<_DriverFormView> {
  final _formKey = GlobalKey<FormState>();

  // Sélecteur utilisateur (create only) — remplace le champ userId manuel
  UserOption? _selectedUser;
  List<UserOption> _userOptions = [];
  bool _loadingUsers = true;

  // Shared editable fields
  final _idCardNumberController = TextEditingController();
  final _licenseNumberController = TextEditingController();
  final _addressController = TextEditingController();
  final _emergencyContactController = TextEditingController();

  bool get _isCreating => widget.driverId == null;

  @override
  void initState() {
    super.initState();
    if (_isCreating) _loadUserOptions();
  }

  Future<void> _loadUserOptions() async {
    try {
      final users = await sl<FormOptionsDatasource>().getDriverUsers();
      if (mounted) {
        setState(() {
          _userOptions = users;
          _loadingUsers = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingUsers = false);
    }
  }

  @override
  void dispose() {
    _idCardNumberController.dispose();
    _licenseNumberController.dispose();
    _addressController.dispose();
    _emergencyContactController.dispose();
    super.dispose();
  }

  void _prefillFromState(DriverDetailState state) {
    if (state is DriverDetailLoaded) {
      final driver = state.driver;
      _idCardNumberController.text = driver.idCardNumber;
      _licenseNumberController.text = driver.licenseNumber;
      _addressController.text = driver.address ?? '';
    }
  }

  void _submit(BuildContext context) {
    if (!_formKey.currentState!.validate()) return;
    if (_isCreating && _selectedUser == null) return;

    final cubit = context.read<DriverDetailCubit>();

    if (_isCreating) {
      cubit.createDriver(
        userId: _selectedUser!.id,
        idCardNumber: _idCardNumberController.text.trim().isEmpty
            ? null
            : _idCardNumberController.text.trim(),
        licenseNumber: _licenseNumberController.text.trim().isEmpty
            ? null
            : _licenseNumberController.text.trim(),
        address: _addressController.text.trim().isEmpty
            ? null
            : _addressController.text.trim(),
        emergencyContact: _emergencyContactController.text.trim().isEmpty
            ? null
            : _emergencyContactController.text.trim(),
      );
    } else {
      cubit.updateDriver(widget.driverId!, {
        'idCardNumber': _idCardNumberController.text.trim(),
        'licenseNumber': _licenseNumberController.text.trim(),
        'address': _addressController.text.trim(),
        'emergencyContact': _emergencyContactController.text.trim(),
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isCreating ? 'Nouveau chauffeur' : 'Modifier le chauffeur'),
      ),
      body: BlocConsumer<DriverDetailCubit, DriverDetailState>(
        listener: (context, state) {
          if (state is DriverDetailLoaded && !_isCreating) {
            _prefillFromState(state);
          }
          if (state is DriverDetailActionSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.success,
              ),
            );
            context.pop();
          } else if (state is DriverDetailActionError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        builder: (context, state) {
          final isLoading = state is DriverDetailLoading ||
              state is DriverDetailActionInProgress;

          if (!_isCreating && state is DriverDetailLoading) {
            return const LoadingView(message: 'Chargement…');
          }

          final driver = switch (state) {
            DriverDetailLoaded(:final driver) => driver,
            DriverDetailActionInProgress(:final driver) => driver,
            DriverDetailActionSuccess(:final driver) => driver,
            DriverDetailActionError(:final driver) => driver,
            _ => null,
          };

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ─── Read-only header in edit mode ──────────────────────
                  if (!_isCreating && driver != null) ...[
                    _ReadOnlyHeader(
                      name: driver.fullName,
                      status: driver.status.label,
                      statusColor: driver.status.color,
                    ),
                    const SizedBox(height: 20),
                  ],

                  // ─── Sélecteur utilisateur (create only) ───────────────
                  if (_isCreating) ...[
                    EntitySelectorField<UserOption>(
                      label: 'Compte utilisateur *',
                      items: _userOptions,
                      labelOf: userLabel,
                      subtitleOf: userSubtitle,
                      initialValue: _selectedUser,
                      isLoading: _loadingUsers,
                      prefixIcon: Icons.person_outline,
                      searchHint: 'Rechercher par nom ou email…',
                      emptyMessage: _loadingUsers
                          ? 'Chargement…'
                          : 'Aucun compte utilisateur trouvé.\n'
                              'Créez d\'abord un compte depuis '
                              'Administration > Utilisateurs.',
                      onChanged: (u) => setState(() => _selectedUser = u),
                      validator: (v) =>
                          v == null ? 'Sélectionnez un compte utilisateur' : null,
                    ),
                    const SizedBox(height: 16),
                  ],

                  // ─── Shared editable fields ─────────────────────────────
                  AppTextField(
                    label: 'N° CIN',
                    hint: 'Numéro de carte d\'identité',
                    controller: _idCardNumberController,
                    prefixIcon: Icons.badge_outlined,
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 16),

                  AppTextField(
                    label: 'N° Permis de conduire',
                    hint: 'Numéro du permis',
                    controller: _licenseNumberController,
                    prefixIcon: Icons.credit_card_outlined,
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 16),

                  AppTextField(
                    label: 'Adresse',
                    hint: 'Adresse du chauffeur',
                    controller: _addressController,
                    prefixIcon: Icons.location_on_outlined,
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 16),

                  AppTextField(
                    label: 'Contact d\'urgence',
                    hint: 'Nom et téléphone',
                    controller: _emergencyContactController,
                    prefixIcon: Icons.emergency_outlined,
                    textInputAction: TextInputAction.done,
                  ),
                  const SizedBox(height: 32),

                  AppButton(
                    label: _isCreating ? 'Créer le chauffeur' : 'Enregistrer',
                    isLoading: isLoading,
                    icon: _isCreating ? Icons.person_add_outlined : Icons.save_outlined,
                    onPressed: () => _submit(context),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ReadOnlyHeader extends StatelessWidget {
  const _ReadOnlyHeader({
    required this.name,
    required this.status,
    required this.statusColor,
  });

  final String name;
  final String status;
  final Color statusColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.person_outline, color: AppColors.primary, size: 32),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                    border:
                        Border.all(color: statusColor.withValues(alpha: 0.4)),
                  ),
                  child: Text(
                    status,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
