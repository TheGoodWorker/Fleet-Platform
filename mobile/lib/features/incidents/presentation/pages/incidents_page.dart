import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../domain/entities/incident.dart';
import '../cubit/incidents_cubit.dart';
import '../cubit/incidents_state.dart';
import '../widgets/incident_card.dart';

class IncidentsPage extends StatefulWidget {
  const IncidentsPage({super.key});

  @override
  State<IncidentsPage> createState() => _IncidentsPageState();
}

class _IncidentsPageState extends State<IncidentsPage> {
  IncidentStatus? _status;
  IncidentType? _type;

  @override
  void initState() {
    super.initState();
    context.read<IncidentsCubit>().load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Incidents')),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          final cubit = context.read<IncidentsCubit>();
          context.push('/incidents/new').then((_) { if (mounted) cubit.refresh(); });
        },
        backgroundColor: AppColors.error,
        foregroundColor: Colors.white,
        tooltip: 'Déclarer un incident',
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          _Filters(
            status: _status,
            type: _type,
            onStatusChanged: (s) {
              setState(() => _status = s);
              context.read<IncidentsCubit>().filterByStatus(s?.value);
            },
            onTypeChanged: (t) {
              setState(() => _type = t);
              context.read<IncidentsCubit>().filterByType(t?.value);
            },
            onResetFilters: () {
              setState(() { _status = null; _type = null; });
              context.read<IncidentsCubit>().resetFilters();
            },
          ),
          const Divider(height: 1),
          Expanded(
            child: BlocBuilder<IncidentsCubit, IncidentsState>(
              builder: (context, state) => switch (state) {
                IncidentsInitial() => const SizedBox.shrink(),
                IncidentsLoading() =>
                  const LoadingView(message: 'Chargement des incidents…'),
                IncidentsError(:final message) => ErrorView(
                    message: message,
                    onRetry: () => context.read<IncidentsCubit>().load(
                        status: _status?.value, type: _type?.value),
                  ),
                IncidentsLoaded(:final incidents) when incidents.isEmpty =>
                  EmptyState(
                    title: 'Aucun incident',
                    subtitle: _status != null || _type != null
                        ? 'Aucun incident avec ces filtres'
                        : 'Aucun incident déclaré pour le moment.',
                    icon: Icons.car_crash_outlined,
                  ),
                IncidentsLoaded(:final incidents) => RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: () =>
                        context.read<IncidentsCubit>().refresh(),
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: incidents.length,
                      separatorBuilder: (_, __) =>
                          const SizedBox(height: 8),
                      itemBuilder: (context, i) => IncidentCard(
                        incident: incidents[i],
                        onTap: () {
                          final cubit = context.read<IncidentsCubit>();
                          context.push('/incidents/${incidents[i].id}')
                              .then((_) { if (mounted) cubit.refresh(); });
                        },
                      ),
                    ),
                  ),
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Filtres ───────────────────────────────────────────────────────────────────

class _Filters extends StatelessWidget {
  const _Filters({
    required this.status,
    required this.type,
    required this.onStatusChanged,
    required this.onTypeChanged,
    required this.onResetFilters,
  });

  final IncidentStatus? status;
  final IncidentType? type;
  final ValueChanged<IncidentStatus?> onStatusChanged;
  final ValueChanged<IncidentType?> onTypeChanged;
  final VoidCallback onResetFilters;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        scrollDirection: Axis.horizontal,
        children: [
          _Chip(
            label: 'Tous',
            selected: status == null && type == null,
            color: AppColors.primary,
            onTap: onResetFilters,
          ),
          const SizedBox(width: 6),
          ...IncidentStatus.values.map((s) => Padding(
                padding: const EdgeInsets.only(right: 6),
                child: _Chip(
                  label: s.label,
                  selected: status == s,
                  color: s.color,
                  onTap: () => onStatusChanged(status == s ? null : s),
                ),
              )),
          const SizedBox(width: 4),
          ...IncidentType.values.map((t) => Padding(
                padding: const EdgeInsets.only(right: 6),
                child: _Chip(
                  label: t.label,
                  selected: type == t,
                  color: t.color,
                  onTap: () => onTypeChanged(type == t ? null : t),
                ),
              )),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? color : color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: selected ? color : color.withValues(alpha: 0.3)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12, fontWeight: FontWeight.w600,
            color: selected ? Colors.white : color,
          ),
        ),
      ),
    );
  }
}
