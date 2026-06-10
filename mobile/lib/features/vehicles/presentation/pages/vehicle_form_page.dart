import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../core/datasources/form_options_datasource.dart';
import '../../../../../core/di/injection.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/entity_selector_field.dart';
import '../cubit/vehicle_detail_cubit.dart';
import '../cubit/vehicle_detail_state.dart';

// ── Catalogue marques / modèles ───────────────────────────────────────────────

const Map<String, List<String>> _kBrands = {
  'Suzuki':   ['Dzire', 'S-Presso', 'Swift', 'Alto'],
  'Toyota':   ['Corolla', 'Yaris', 'Rush'],
  'Hyundai':  ['Accent', 'Elantra', 'Tucson'],
  'Kia':      ['Rio', 'Pegas', 'Sportage'],
  'Nissan':   ['Sunny', 'Sentra', 'Patrol'],
  'Renault':  ['Logan', 'Duster'],
  'Changan':  ['Alsvin', 'CS35', 'CS55'],
  'BYD':      ['Dolphin', 'Atto 3'],
  'Wuling':   ['Bingo'],
  'Dongfeng': ['Nano Box'],
  'MG':       ['ZS'],
  'Kaiyi':    ['E5', 'X3', 'X3 Pro'],
};
const _kAutre = 'Autre';

// ── Page ─────────────────────────────────────────────────────────────────────

class VehicleFormPage extends StatefulWidget {
  const VehicleFormPage({super.key, this.vehicleId});
  final String? vehicleId;

  @override
  State<VehicleFormPage> createState() => _VehicleFormPageState();
}

class _VehicleFormPageState extends State<VehicleFormPage> {
  late final VehicleDetailCubit _cubit;

  final _formKey = GlobalKey<FormState>();

  // Champs texte conservés
  final _plateNumberController = TextEditingController();
  final _yearController        = TextEditingController();
  final _colorController       = TextEditingController();
  final _vinController         = TextEditingController();

  // Saisie libre pour marque / modèle « Autre »
  final _brandOtherController  = TextEditingController();
  final _modelOtherController  = TextEditingController();

  // Sélections dropdown
  String? _selectedBrand;
  String? _selectedModel;
  String? _fuelType;
  String? _transmission;
  OwnerOption? _selectedOwner;

  bool _prefilled    = false;
  List<OwnerOption> _owners = [];
  bool _loadingOwners = true;

  @override
  void initState() {
    super.initState();
    _cubit = sl<VehicleDetailCubit>();
    if (widget.vehicleId != null) _cubit.load(widget.vehicleId!);
    _loadOwners();
  }

  Future<void> _loadOwners() async {
    try {
      final owners = await sl<FormOptionsDatasource>().getOwners();
      if (mounted) setState(() { _owners = owners; _loadingOwners = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingOwners = false);
    }
  }

  @override
  void dispose() {
    _plateNumberController.dispose();
    _yearController.dispose();
    _colorController.dispose();
    _vinController.dispose();
    _brandOtherController.dispose();
    _modelOtherController.dispose();
    super.dispose();
  }

  // ── Pré-remplissage (mode édition) ────────────────────────────────────────

  void _prefillFromState(VehicleDetailLoaded state) {
    if (_prefilled) return;
    _prefilled = true;
    final v = state.vehicle;

    _plateNumberController.text = v.plateNumber;
    _yearController.text  = v.year != 0 ? '${v.year}' : '';
    _colorController.text = v.color;
    _vinController.text   = v.vin ?? '';
    _fuelType    = v.fuelType.isNotEmpty ? v.fuelType : null;
    _transmission = v.transmission;

    // Marque : catalogue ou "Autre"
    if (_kBrands.containsKey(v.brand)) {
      _selectedBrand = v.brand;
      final models = _kBrands[v.brand]!;
      if (models.contains(v.model)) {
        _selectedModel = v.model;
      } else {
        _selectedModel = _kAutre;
        _modelOtherController.text = v.model;
      }
    } else {
      _selectedBrand = _kAutre;
      _brandOtherController.text = v.brand;
      _modelOtherController.text = v.model;
    }
  }

  // ── Soumission ────────────────────────────────────────────────────────────

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    // Résoudre marque effective
    final String brand;
    final String model;

    if (_selectedBrand == _kAutre) {
      brand = _brandOtherController.text.trim();
      model = _modelOtherController.text.trim();
    } else {
      brand = _selectedBrand!;
      model = _selectedModel == _kAutre
          ? _modelOtherController.text.trim()
          : _selectedModel!;
    }

    final yearText  = _yearController.text.trim();
    final colorText = _colorController.text.trim();
    final vinText   = _vinController.text.trim();
    final year      = yearText.isNotEmpty ? int.tryParse(yearText) : null;

    if (widget.vehicleId == null) {
      _cubit.createVehicle(
        plateNumber: _plateNumberController.text.trim(),
        brand:       brand,
        model:       model,
        year:        year,
        color:       colorText.isNotEmpty ? colorText : null,
        fuelType:    _fuelType,
        transmission: _transmission,
        ownerId:     _selectedOwner?.id,
        // seats intentionnellement omis
      );
    } else {
      _cubit.updateVehicle(widget.vehicleId!, {
        'brand': brand,
        'model': model,
        if (year != null)              'year':         year,
        if (colorText.isNotEmpty)      'color':        colorText,
        if (_fuelType != null)         'fuelType':     _fuelType,
        if (_transmission != null)     'transmission': _transmission,
        if (vinText.isNotEmpty)        'vin':          vinText,
      });
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _cubit,
      child: BlocConsumer<VehicleDetailCubit, VehicleDetailState>(
        listener: (context, state) {
          if (state is VehicleDetailActionSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.success,
            ));
            Navigator.of(context).pop();
          } else if (state is VehicleDetailActionError) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.error,
            ));
          } else if (state is VehicleDetailLoaded && widget.vehicleId != null) {
            setState(() => _prefillFromState(state));
          }
        },
        builder: (context, state) {
          final isLoading = state is VehicleDetailActionInProgress;
          final isLoadingExisting =
              widget.vehicleId != null && state is VehicleDetailLoading;

          return Scaffold(
            appBar: AppBar(
              title: Text(widget.vehicleId == null
                  ? 'Nouveau véhicule'
                  : 'Modifier le véhicule'),
            ),
            body: isLoadingExisting
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.primary))
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // ── 1. Immatriculation ────────────────────────
                          TextFormField(
                            controller: _plateNumberController,
                            enabled: widget.vehicleId == null,
                            decoration: const InputDecoration(
                                labelText: 'Immatriculation *'),
                            textCapitalization: TextCapitalization.characters,
                            validator: (v) => (v == null || v.trim().isEmpty)
                                ? "L'immatriculation est obligatoire"
                                : null,
                          ),
                          const SizedBox(height: 16),

                          // ── 2. Marque (sélecteur) ─────────────────────
                          DropdownButtonFormField<String>(
                            key: ValueKey('brand-$_selectedBrand'),
                            initialValue: _selectedBrand,
                            decoration:
                                const InputDecoration(labelText: 'Marque *'),
                            hint: const Text('Sélectionner une marque'),
                            items: [
                              ..._kBrands.keys.map(
                                (b) => DropdownMenuItem(
                                    value: b, child: Text(b)),
                              ),
                              const DropdownMenuItem(
                                value: _kAutre,
                                child: Text('Autre (saisie libre)'),
                              ),
                            ],
                            validator: (v) => v == null
                                ? 'La marque est obligatoire'
                                : null,
                            onChanged: (v) => setState(() {
                              _selectedBrand = v;
                              _selectedModel = null;
                              _brandOtherController.clear();
                              _modelOtherController.clear();
                            }),
                          ),

                          // Marque libre si "Autre"
                          if (_selectedBrand == _kAutre) ...[
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _brandOtherController,
                              decoration: const InputDecoration(
                                  labelText: 'Marque (préciser) *'),
                              textCapitalization: TextCapitalization.words,
                              validator: (v) =>
                                  (v == null || v.trim().isEmpty)
                                      ? 'Précisez la marque'
                                      : null,
                            ),
                          ],
                          const SizedBox(height: 16),

                          // ── 3. Modèle (sélecteur dépendant) ───────────
                          if (_selectedBrand != null) ...[
                            // Marque connue → dropdown des modèles
                            if (_selectedBrand != _kAutre)
                              DropdownButtonFormField<String>(
                                key: ValueKey('model-$_selectedBrand-$_selectedModel'),
                                initialValue: _selectedModel,
                                decoration: const InputDecoration(
                                    labelText: 'Modèle *'),
                                hint: const Text('Sélectionner un modèle'),
                                items: [
                                  ..._kBrands[_selectedBrand]!.map(
                                    (m) => DropdownMenuItem(
                                        value: m, child: Text(m)),
                                  ),
                                  const DropdownMenuItem(
                                    value: _kAutre,
                                    child: Text('Autre (saisie libre)'),
                                  ),
                                ],
                                validator: (v) => v == null
                                    ? 'Le modèle est obligatoire'
                                    : null,
                                onChanged: (v) => setState(() {
                                  _selectedModel = v;
                                  _modelOtherController.clear();
                                }),
                              )
                            // Marque "Autre" → saisie libre du modèle
                            else
                              TextFormField(
                                controller: _modelOtherController,
                                decoration: const InputDecoration(
                                    labelText: 'Modèle *'),
                                textCapitalization: TextCapitalization.words,
                                validator: (v) =>
                                    (v == null || v.trim().isEmpty)
                                        ? 'Le modèle est obligatoire'
                                        : null,
                              ),

                            // Modèle libre si modèle "Autre" pour marque connue
                            if (_selectedBrand != _kAutre &&
                                _selectedModel == _kAutre) ...[
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: _modelOtherController,
                                decoration: const InputDecoration(
                                    labelText: 'Modèle (préciser) *'),
                                textCapitalization: TextCapitalization.words,
                                validator: (v) =>
                                    (v == null || v.trim().isEmpty)
                                        ? 'Précisez le modèle'
                                        : null,
                              ),
                            ],
                            const SizedBox(height: 16),
                          ] else
                            const SizedBox(height: 16),

                          // ── 4. Année ──────────────────────────────────
                          TextFormField(
                            controller: _yearController,
                            decoration:
                                const InputDecoration(labelText: 'Année'),
                            keyboardType: TextInputType.number,
                            validator: (v) {
                              if (v != null && v.trim().isNotEmpty) {
                                final p = int.tryParse(v.trim());
                                if (p == null) return 'Année invalide';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // ── 5. Couleur ────────────────────────────────
                          TextFormField(
                            controller: _colorController,
                            decoration:
                                const InputDecoration(labelText: 'Couleur'),
                          ),
                          const SizedBox(height: 16),

                          // ── 6. Carburant ──────────────────────────────
                          DropdownButtonFormField<String>(
                            key: ValueKey('fuel-${_fuelType ?? 'none'}'),
                            initialValue: _fuelType,
                            decoration: const InputDecoration(
                                labelText: 'Carburant'),
                            items: const [
                              DropdownMenuItem(
                                  value: null,
                                  child: Text('Non spécifié')),
                              DropdownMenuItem(
                                  value: 'GASOLINE',
                                  child: Text('Essence')),
                              DropdownMenuItem(
                                  value: 'DIESEL',
                                  child: Text('Diesel')),
                              DropdownMenuItem(
                                  value: 'HYBRID',
                                  child: Text('Hybride')),
                              DropdownMenuItem(
                                  value: 'ELECTRIC',
                                  child: Text('Électrique')),
                            ],
                            onChanged: (v) =>
                                setState(() => _fuelType = v),
                          ),
                          const SizedBox(height: 16),

                          // ── 7. Transmission ───────────────────────────
                          DropdownButtonFormField<String>(
                            key: ValueKey('transmission-${_transmission ?? 'none'}'),
                            initialValue: _transmission,
                            decoration: const InputDecoration(
                                labelText: 'Transmission'),
                            items: const [
                              DropdownMenuItem(
                                  value: null,
                                  child: Text('Non spécifiée')),
                              DropdownMenuItem(
                                  value: 'MANUAL',
                                  child: Text('Manuelle')),
                              DropdownMenuItem(
                                  value: 'AUTOMATIC',
                                  child: Text('Automatique')),
                            ],
                            onChanged: (v) =>
                                setState(() => _transmission = v),
                          ),
                          const SizedBox(height: 16),

                          // ── 8. VIN (optionnel) ────────────────────────
                          TextFormField(
                            controller: _vinController,
                            decoration:
                                const InputDecoration(labelText: 'VIN (optionnel)'),
                            textCapitalization: TextCapitalization.characters,
                            // Pas de validator : champ libre non obligatoire
                          ),
                          const SizedBox(height: 16),

                          // ── 9. Propriétaire (création uniquement) ─────
                          if (widget.vehicleId == null) ...[
                            EntitySelectorField<OwnerOption>(
                              label: 'Propriétaire (optionnel)',
                              items: _owners,
                              labelOf: ownerLabel,
                              initialValue: _selectedOwner,
                              isLoading: _loadingOwners,
                              prefixIcon: Icons.business_outlined,
                              searchHint: 'Rechercher un propriétaire…',
                              emptyMessage: 'Aucun propriétaire trouvé',
                              onChanged: (o) =>
                                  setState(() => _selectedOwner = o),
                            ),
                            const SizedBox(height: 16),
                          ],

                          const SizedBox(height: 8),
                          AppButton(
                            label: widget.vehicleId == null
                                ? 'Créer le véhicule'
                                : 'Enregistrer les modifications',
                            onPressed: isLoading ? null : _submit,
                            isLoading: isLoading,
                          ),
                          const SizedBox(height: 16),
                        ],
                      ),
                    ),
                  ),
          );
        },
      ),
    );
  }
}
