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
import '../../domain/entities/incident.dart';
import '../cubit/incident_detail_cubit.dart';
import '../cubit/incident_detail_state.dart';

class IncidentFormPage extends StatelessWidget {
  const IncidentFormPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<IncidentDetailCubit>(),
      child: const _IncidentFormView(),
    );
  }
}

class _IncidentFormView extends StatefulWidget {
  const _IncidentFormView();

  @override
  State<_IncidentFormView> createState() => _IncidentFormViewState();
}

class _IncidentFormViewState extends State<_IncidentFormView> {
  final _formKey = GlobalKey<FormState>();

  // Form values
  IncidentType _type = IncidentType.breakdown;
  IncidentSeverity _severity = IncidentSeverity.medium;
  VehicleOption? _selectedVehicle;
  DriverOption? _selectedDriver;
  final _descCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  DateTime _occurredAt = DateTime.now();

  // Options
  List<VehicleOption> _vehicles = [];
  List<DriverOption> _drivers = [];
  bool _loadingOptions = true;

  @override
  void initState() {
    super.initState();
    _loadOptions();
  }

  Future<void> _loadOptions() async {
    try {
      final ds = sl<FormOptionsDatasource>();
      final results = await Future.wait([
        ds.getVehicles(),
        ds.getDrivers(statuses: const ['ACTIVE', 'APPROVED']),
      ]);
      if (mounted) {
        setState(() {
          _vehicles = results[0] as List<VehicleOption>;
          _drivers = results[1] as List<DriverOption>;
          _loadingOptions = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingOptions = false);
    }
  }

  @override
  void dispose() {
    _descCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  String _getManagerId() {
    final s = context.read<AuthBloc>().state;
    return s is AuthAuthenticated ? s.user.id : '';
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedVehicle == null) return;

    context.read<IncidentDetailCubit>().createIncident(
          type: _type.value,
          vehicleId: _selectedVehicle!.id,
          description: _descCtrl.text.trim(),
          occurredAt: _occurredAt.toIso8601String(),
          driverId: _selectedDriver?.id,
          managerId: _getManagerId().isEmpty ? null : _getManagerId(),
          severity: _severity.value,
          notes: _notesCtrl.text.trim().isEmpty
              ? null
              : _notesCtrl.text.trim(),
        );
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _occurredAt,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      helpText: "Date de l'incident",
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_occurredAt),
    );
    if (!mounted) return;
    setState(() {
      _occurredAt = DateTime(
        date.year, date.month, date.day,
        time?.hour ?? _occurredAt.hour,
        time?.minute ?? _occurredAt.minute,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<IncidentDetailCubit, IncidentDetailState>(
      listener: (context, state) {
        if (state is IncidentDetailActionSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.message),
            backgroundColor: AppColors.success,
          ));
          context.pop();
        } else if (state is IncidentDetailActionError) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.message),
            backgroundColor: AppColors.error,
          ));
        }
      },
      builder: (context, state) {
        final isSaving = state is IncidentDetailActionInProgress;

        return Scaffold(
          appBar: AppBar(title: const Text('Déclarer un incident')),
          body: Form(
            key: _formKey,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Type ────────────────────────────────────────────
                  DropdownButtonFormField<IncidentType>(
                    key: ValueKey(_type),
                    initialValue: _type,
                    decoration: const InputDecoration(
                      labelText: 'Type d\'incident *',
                      prefixIcon: Icon(Icons.category_outlined, size: 20),
                    ),
                    items: IncidentType.values
                        .map((t) => DropdownMenuItem(
                            value: t,
                            child: Row(children: [
                              Icon(t.icon, size: 16, color: t.color),
                              const SizedBox(width: 8),
                              Text(t.label),
                            ])))
                        .toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _type = v);
                    },
                  ),
                  const SizedBox(height: 14),

                  // ── Severity ─────────────────────────────────────────
                  DropdownButtonFormField<IncidentSeverity>(
                    key: ValueKey(_severity),
                    initialValue: _severity,
                    decoration: const InputDecoration(
                      labelText: 'Sévérité',
                      prefixIcon: Icon(Icons.warning_outlined, size: 20),
                    ),
                    items: IncidentSeverity.values
                        .map((s) => DropdownMenuItem(
                            value: s, child: Text(s.label)))
                        .toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _severity = v);
                    },
                  ),
                  const SizedBox(height: 14),

                  // ── Véhicule ─────────────────────────────────────────
                  EntitySelectorField<VehicleOption>(
                    label: 'Véhicule concerné *',
                    items: _vehicles,
                    labelOf: vehicleLabel,
                    subtitleOf: vehicleSubtitle,
                    initialValue: _selectedVehicle,
                    isLoading: _loadingOptions,
                    prefixIcon: Icons.directions_car_outlined,
                    searchHint: 'Rechercher par plaque…',
                    emptyMessage: 'Aucun véhicule disponible',
                    onChanged: (v) => setState(() => _selectedVehicle = v),
                    validator: (v) =>
                        v == null ? 'Sélectionnez un véhicule' : null,
                  ),
                  const SizedBox(height: 14),

                  // ── Chauffeur ─────────────────────────────────────────
                  EntitySelectorField<DriverOption>(
                    label: 'Chauffeur impliqué (optionnel)',
                    items: _drivers,
                    labelOf: driverLabel,
                    subtitleOf: driverSubtitle,
                    initialValue: _selectedDriver,
                    isLoading: _loadingOptions,
                    prefixIcon: Icons.person_outline,
                    searchHint: 'Rechercher par nom…',
                    emptyMessage: 'Aucun chauffeur actif',
                    onChanged: (d) => setState(() => _selectedDriver = d),
                  ),
                  const SizedBox(height: 14),

                  // ── Date/heure ────────────────────────────────────────
                  InkWell(
                    onTap: _pickDateTime,
                    borderRadius: BorderRadius.circular(8),
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: "Date et heure de l'incident *",
                        prefixIcon: Icon(Icons.access_time_outlined, size: 20),
                      ),
                      child: Text(
                        _formatDateTime(_occurredAt),
                        style: const TextStyle(
                            fontSize: 15, color: AppColors.textPrimary),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // ── Description ───────────────────────────────────────
                  TextFormField(
                    controller: _descCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Description *',
                      hintText: 'Décrivez l\'incident en détail…',
                      prefixIcon: Icon(Icons.notes_outlined, size: 20),
                      alignLabelWithHint: true,
                    ),
                    maxLines: 4,
                    validator: (v) {
                      if (v == null || v.trim().length < 10) {
                        return 'Description trop courte (min. 10 caractères)';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 14),

                  // ── Notes internes ────────────────────────────────────
                  TextFormField(
                    controller: _notesCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Notes internes (optionnel)',
                      prefixIcon: Icon(Icons.sticky_note_2_outlined, size: 20),
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 24),

                  AppButton(
                    label: 'Déclarer l\'incident',
                    icon: Icons.report_outlined,
                    isLoading: isSaving,
                    onPressed: isSaving ? null : _submit,
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  String _formatDateTime(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/'
      '${d.month.toString().padLeft(2, '0')}/${d.year} '
      '${d.hour.toString().padLeft(2, '0')}:'
      '${d.minute.toString().padLeft(2, '0')}';
}
