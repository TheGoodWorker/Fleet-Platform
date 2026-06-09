import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/datasources/form_options_datasource.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/entity_selector_field.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../cubit/assignments_cubit.dart';
import '../cubit/assignments_state.dart';
import '../widgets/assignment_card.dart';

class AssignmentsPage extends StatefulWidget {
  const AssignmentsPage({super.key});

  @override
  State<AssignmentsPage> createState() => _AssignmentsPageState();
}

class _AssignmentsPageState extends State<AssignmentsPage> {
  // Mode courant
  AssignmentContext _mode = AssignmentContext.vehicle;

  // Entités sélectionnées
  VehicleOption? _selectedVehicle;
  DriverOption? _selectedDriver;

  // Options chargées depuis l'API
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

  void _onModeChanged(AssignmentContext mode) {
    setState(() {
      _mode = mode;
      _selectedVehicle = null;
      _selectedDriver = null;
    });
    context.read<AssignmentsCubit>().reset();
  }

  void _onVehicleChanged(VehicleOption? v) {
    setState(() => _selectedVehicle = v);
    if (v != null) {
      context.read<AssignmentsCubit>().loadForVehicle(
            v.id,
            vehicleName: vehicleLabel(v),
          );
    }
  }

  void _onDriverChanged(DriverOption? d) {
    setState(() => _selectedDriver = d);
    if (d != null) {
      context.read<AssignmentsCubit>().loadForDriver(
            d.id,
            driverName: driverLabel(d),
          );
    }
  }

  void _showAssignSheet(AssignmentsLoaded loaded) {
    final cubit = context.read<AssignmentsCubit>();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AssignDriverSheet(
        drivers: _drivers,
        vehicleId: loaded.contextId,
        cubit: cubit,
      ),
    );
  }

  void _confirmUnassign(String vehicleId) {
    final cubit = context.read<AssignmentsCubit>();
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text("Mettre fin à l'affectation"),
        content: const Text(
          'Êtes-vous sûr de vouloir terminer cette affectation chauffeur ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              cubit.unassignDriver(vehicleId);
            },
            child: const Text(
              'Confirmer',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AssignmentsCubit, AssignmentsState>(
      listener: (context, state) {
        if (state is AssignmentsActionSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.message),
            backgroundColor: AppColors.success,
          ));
        } else if (state is AssignmentsActionError) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.message),
            backgroundColor: AppColors.error,
          ));
        }
      },
      builder: (context, state) {
        final loaded = switch (state) {
          AssignmentsLoaded() => state,
          AssignmentsActionInProgress(:final previous) => previous,
          AssignmentsActionSuccess(:final loaded) => loaded,
          AssignmentsActionError(:final previous) => previous,
          _ => null,
        };
        final isActing = state is AssignmentsActionInProgress;

        // FAB visible en mode véhicule si aucune affectation active
        final showFab = loaded != null &&
            loaded.context == AssignmentContext.vehicle &&
            !loaded.hasActive &&
            !isActing;

        return Scaffold(
          appBar: AppBar(title: const Text('Affectations')),
          floatingActionButton: showFab
              ? FloatingActionButton.extended(
                  onPressed: () => _showAssignSheet(loaded),
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  icon: const Icon(Icons.person_add_outlined),
                  label: const Text('Affecter'),
                )
              : null,
          body: Column(
            children: [
              // ── Sélecteur de mode ─────────────────────────────────────
              _ModeSelector(mode: _mode, onChanged: _onModeChanged),

              // ── Sélecteur d'entité ────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: _mode == AssignmentContext.vehicle
                    ? EntitySelectorField<VehicleOption>(
                        label: 'Sélectionner un véhicule',
                        items: _vehicles,
                        labelOf: vehicleLabel,
                        subtitleOf: vehicleSubtitle,
                        initialValue: _selectedVehicle,
                        isLoading: _loadingOptions,
                        prefixIcon: Icons.directions_car_outlined,
                        searchHint: 'Rechercher par plaque…',
                        emptyMessage: 'Aucun véhicule',
                        onChanged: _onVehicleChanged,
                      )
                    : EntitySelectorField<DriverOption>(
                        label: 'Sélectionner un chauffeur',
                        items: _drivers,
                        labelOf: driverLabel,
                        subtitleOf: driverSubtitle,
                        initialValue: _selectedDriver,
                        isLoading: _loadingOptions,
                        prefixIcon: Icons.person_outline,
                        searchHint: 'Rechercher par nom…',
                        emptyMessage: 'Aucun chauffeur',
                        onChanged: _onDriverChanged,
                      ),
              ),

              const Divider(height: 1),

              // ── Contenu ───────────────────────────────────────────────
              Expanded(child: _buildContent(context, state, loaded, isActing)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildContent(
    BuildContext context,
    AssignmentsState state,
    AssignmentsLoaded? loaded,
    bool isActing,
  ) {
    return switch (state) {
      AssignmentsInitial() => const Center(
          child: Padding(
            padding: EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.swap_horiz_outlined, size: 48, color: Colors.grey),
                SizedBox(height: 16),
                Text(
                  'Sélectionnez un véhicule ou un chauffeur\npour consulter les affectations',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 14),
                ),
              ],
            ),
          ),
        ),
      AssignmentsLoading() => const LoadingView(message: 'Chargement…'),
      AssignmentsError(:final message) => ErrorView(
          message: message,
          onRetry: () => context.read<AssignmentsCubit>().refresh(),
        ),
      _ when loaded != null => _buildList(context, loaded, isActing),
      _ => const SizedBox.shrink(),
    };
  }

  Widget _buildList(
    BuildContext context,
    AssignmentsLoaded loaded,
    bool isActing,
  ) {
    final assignments = loaded.assignments;

    if (assignments.isEmpty) {
      return EmptyState(
        title: 'Aucune affectation',
        subtitle: loaded.context == AssignmentContext.vehicle
            ? 'Aucune affectation enregistrée pour ce véhicule'
            : 'Aucune affectation enregistrée pour ce chauffeur',
        icon: Icons.swap_horiz_outlined,
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => context.read<AssignmentsCubit>().refresh(),
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        itemCount: assignments.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final a = assignments[i];
          return AssignmentCard(
            assignment: a,
            isActing: isActing,
            onEndAssignment: loaded.context == AssignmentContext.vehicle && a.isActive
                ? () => _confirmUnassign(a.vehicleId)
                : null,
          );
        },
      ),
    );
  }
}

// ── Mode selector ─────────────────────────────────────────────────────────────

class _ModeSelector extends StatelessWidget {
  const _ModeSelector({required this.mode, required this.onChanged});
  final AssignmentContext mode;
  final ValueChanged<AssignmentContext> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: Row(
        children: [
          Expanded(
            child: _ModeChip(
              label: 'Par véhicule',
              icon: Icons.directions_car_outlined,
              selected: mode == AssignmentContext.vehicle,
              onTap: () => onChanged(AssignmentContext.vehicle),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _ModeChip(
              label: 'Par chauffeur',
              icon: Icons.person_outline,
              selected: mode == AssignmentContext.driver,
              onTap: () => onChanged(AssignmentContext.driver),
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  const _ModeChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.primary : AppColors.textSecondary;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.08)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected
                ? AppColors.primary.withValues(alpha: 0.4)
                : AppColors.border,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Feuille d'affectation ─────────────────────────────────────────────────────

class _AssignDriverSheet extends StatefulWidget {
  const _AssignDriverSheet({
    required this.drivers,
    required this.vehicleId,
    required this.cubit,
  });
  final List<DriverOption> drivers;
  final String vehicleId;
  final AssignmentsCubit cubit;

  @override
  State<_AssignDriverSheet> createState() => _AssignDriverSheetState();
}

class _AssignDriverSheetState extends State<_AssignDriverSheet> {
  DriverOption? _selectedDriver;
  final _notesCtrl = TextEditingController();

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Poignée
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          const Text(
            'Affecter un chauffeur',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),

          // Sélecteur chauffeur
          EntitySelectorField<DriverOption>(
            label: 'Chauffeur *',
            items: widget.drivers,
            labelOf: driverLabel,
            subtitleOf: driverSubtitle,
            isLoading: false,
            prefixIcon: Icons.person_outline,
            searchHint: 'Rechercher par nom…',
            emptyMessage: 'Aucun chauffeur disponible',
            onChanged: (d) => setState(() => _selectedDriver = d),
            validator: (v) => v == null ? 'Sélectionnez un chauffeur' : null,
          ),
          const SizedBox(height: 12),

          // Notes
          TextField(
            controller: _notesCtrl,
            decoration: const InputDecoration(
              labelText: 'Notes (optionnel)',
              prefixIcon: Icon(Icons.notes_outlined, size: 20),
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 20),

          AppButton(
            label: 'Affecter',
            icon: Icons.person_add_outlined,
            isLoading: false,
            onPressed: _selectedDriver == null
                ? null
                : () {
                    Navigator.pop(context);
                    widget.cubit.assignDriver(
                      vehicleId: widget.vehicleId,
                      driverId: _selectedDriver!.id,
                      notes: _notesCtrl.text.trim().isEmpty
                          ? null
                          : _notesCtrl.text.trim(),
                    );
                  },
          ),
          const SizedBox(height: 4),
        ],
      ),
    );
  }
}
