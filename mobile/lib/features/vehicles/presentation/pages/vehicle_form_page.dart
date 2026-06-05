import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../core/di/injection.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/app_button.dart';
import '../cubit/vehicle_detail_cubit.dart';
import '../cubit/vehicle_detail_state.dart';

class VehicleFormPage extends StatefulWidget {
  const VehicleFormPage({super.key, this.vehicleId});

  final String? vehicleId;

  @override
  State<VehicleFormPage> createState() => _VehicleFormPageState();
}

class _VehicleFormPageState extends State<VehicleFormPage> {
  late final VehicleDetailCubit _cubit;

  final _formKey = GlobalKey<FormState>();

  final _plateNumberController = TextEditingController();
  final _brandController = TextEditingController();
  final _modelController = TextEditingController();
  final _yearController = TextEditingController();
  final _colorController = TextEditingController();
  final _seatsController = TextEditingController();
  final _vinController = TextEditingController();

  String? _fuelType;
  String? _transmission;

  bool _prefilled = false;

  @override
  void initState() {
    super.initState();
    _cubit = sl<VehicleDetailCubit>();
    if (widget.vehicleId != null) {
      _cubit.load(widget.vehicleId!);
    }
  }

  @override
  void dispose() {
    _plateNumberController.dispose();
    _brandController.dispose();
    _modelController.dispose();
    _yearController.dispose();
    _colorController.dispose();
    _seatsController.dispose();
    _vinController.dispose();
    super.dispose();
  }

  void _prefillFromState(VehicleDetailLoaded state) {
    if (_prefilled) return;
    _prefilled = true;
    final v = state.vehicle;
    _plateNumberController.text = v.plateNumber;
    _brandController.text = v.brand;
    _modelController.text = v.model;
    _yearController.text = v.year != 0 ? '${v.year}' : '';
    _colorController.text = v.color;
    _seatsController.text = v.seats != null ? '${v.seats}' : '';
    _vinController.text = v.vin ?? '';
    _fuelType = v.fuelType.isNotEmpty ? v.fuelType : null;
    _transmission = v.transmission;
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final plateNumber = _plateNumberController.text.trim();
    final brand = _brandController.text.trim();
    final model = _modelController.text.trim();
    final yearText = _yearController.text.trim();
    final colorText = _colorController.text.trim();
    final seatsText = _seatsController.text.trim();
    final vinText = _vinController.text.trim();

    final year = yearText.isNotEmpty ? int.tryParse(yearText) : null;
    final seats = seatsText.isNotEmpty ? int.tryParse(seatsText) : null;

    if (widget.vehicleId == null) {
      _cubit.createVehicle(
        plateNumber: plateNumber,
        brand: brand,
        model: model,
        year: year,
        color: colorText.isNotEmpty ? colorText : null,
        fuelType: _fuelType,
        transmission: _transmission,
        seats: seats,
        vin: vinText.isNotEmpty ? vinText : null,
      );
    } else {
      _cubit.updateVehicle(widget.vehicleId!, {
        'brand': brand,
        'model': model,
        if (year != null) 'year': year,
        if (colorText.isNotEmpty) 'color': colorText,
        if (_fuelType != null) 'fuelType': _fuelType,
        if (_transmission != null) 'transmission': _transmission,
        if (seats != null) 'seats': seats,
        if (vinText.isNotEmpty) 'vin': vinText,
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _cubit,
      child: BlocConsumer<VehicleDetailCubit, VehicleDetailState>(
        listener: (context, state) {
          if (state is VehicleDetailActionSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.success,
              ),
            );
            Navigator.of(context).pop();
          } else if (state is VehicleDetailActionError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
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
              title: Text(
                widget.vehicleId == null
                    ? 'Nouveau véhicule'
                    : 'Modifier le véhicule',
              ),
            ),
            body: isLoadingExisting
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 1. Immatriculation
                          TextFormField(
                            controller: _plateNumberController,
                            enabled: widget.vehicleId == null,
                            decoration: const InputDecoration(
                              labelText: 'Immatriculation *',
                            ),
                            textCapitalization: TextCapitalization.characters,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return "L'immatriculation est obligatoire";
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          // 2. Marque
                          TextFormField(
                            controller: _brandController,
                            decoration: const InputDecoration(
                              labelText: 'Marque *',
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'La marque est obligatoire';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          // 3. Modèle
                          TextFormField(
                            controller: _modelController,
                            decoration: const InputDecoration(
                              labelText: 'Modèle *',
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Le modèle est obligatoire';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          // 4. Année
                          TextFormField(
                            controller: _yearController,
                            decoration: const InputDecoration(
                              labelText: 'Année',
                            ),
                            keyboardType: TextInputType.number,
                            validator: (value) {
                              if (value != null && value.trim().isNotEmpty) {
                                final parsed = int.tryParse(value.trim());
                                if (parsed == null) {
                                  return 'Année invalide';
                                }
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          // 5. Couleur
                          TextFormField(
                            controller: _colorController,
                            decoration: const InputDecoration(
                              labelText: 'Couleur',
                            ),
                          ),
                          const SizedBox(height: 16),
                          // 6. Carburant
                          DropdownButtonFormField<String>(
                            initialValue: _fuelType,
                            decoration: const InputDecoration(
                              labelText: 'Carburant',
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: null,
                                child: Text('Non spécifié'),
                              ),
                              DropdownMenuItem(
                                value: 'GASOLINE',
                                child: Text('Essence'),
                              ),
                              DropdownMenuItem(
                                value: 'DIESEL',
                                child: Text('Diesel'),
                              ),
                              DropdownMenuItem(
                                value: 'HYBRID',
                                child: Text('Hybride'),
                              ),
                              DropdownMenuItem(
                                value: 'ELECTRIC',
                                child: Text('Électrique'),
                              ),
                            ],
                            onChanged: (value) =>
                                setState(() => _fuelType = value),
                          ),
                          const SizedBox(height: 16),
                          // 7. Transmission
                          DropdownButtonFormField<String>(
                            initialValue: _transmission,
                            decoration: const InputDecoration(
                              labelText: 'Transmission',
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: null,
                                child: Text('Non spécifiée'),
                              ),
                              DropdownMenuItem(
                                value: 'MANUAL',
                                child: Text('Manuelle'),
                              ),
                              DropdownMenuItem(
                                value: 'AUTOMATIC',
                                child: Text('Automatique'),
                              ),
                            ],
                            onChanged: (value) =>
                                setState(() => _transmission = value),
                          ),
                          const SizedBox(height: 16),
                          // 8. Places
                          TextFormField(
                            controller: _seatsController,
                            decoration: const InputDecoration(
                              labelText: 'Nombre de places',
                            ),
                            keyboardType: TextInputType.number,
                            validator: (value) {
                              if (value != null && value.trim().isNotEmpty) {
                                final parsed = int.tryParse(value.trim());
                                if (parsed == null || parsed <= 0) {
                                  return 'Nombre de places invalide';
                                }
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          // 9. VIN
                          TextFormField(
                            controller: _vinController,
                            decoration: const InputDecoration(
                              labelText: 'VIN',
                            ),
                            textCapitalization: TextCapitalization.characters,
                          ),
                          const SizedBox(height: 32),
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
