import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../domain/entities/contract.dart';
import '../cubit/contracts_cubit.dart';
import '../cubit/contracts_state.dart';
import '../widgets/contract_card.dart';

class ContractsPage extends StatefulWidget {
  const ContractsPage({super.key});

  @override
  State<ContractsPage> createState() => _ContractsPageState();
}

class _ContractsPageState extends State<ContractsPage> {
  ContractType? _selectedType;

  @override
  void initState() {
    super.initState();
    context.read<ContractsCubit>().load();
  }

  void _onFilterChanged(ContractType? type) {
    setState(() => _selectedType = type);
    context.read<ContractsCubit>().filterByType(
          type?.value,
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contrats'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/contracts/new'),
        tooltip: 'Nouveau contrat',
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          _FilterChipsRow(
            selected: _selectedType,
            onChanged: _onFilterChanged,
          ),
          const Divider(height: 1),
          Expanded(
            child: BlocBuilder<ContractsCubit, ContractsState>(
              builder: (context, state) {
                return switch (state) {
                  ContractsInitial() => const SizedBox.shrink(),
                  ContractsLoading() => const LoadingView(
                      message: 'Chargement des contrats…',
                    ),
                  ContractsError(:final message) => ErrorView(
                      message: message,
                      onRetry: () => context
                          .read<ContractsCubit>()
                          .load(type: _selectedType?.value),
                    ),
                  ContractsLoaded(:final contracts) when contracts.isEmpty =>
                    EmptyState(
                      title: 'Aucun contrat',
                      subtitle: _selectedType != null
                          ? 'Aucun contrat de type "${_selectedType!.label}"'
                          : 'Aucun contrat enregistré pour le moment.',
                      icon: Icons.description_outlined,
                    ),
                  ContractsLoaded(:final contracts) => RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: () =>
                          context.read<ContractsCubit>().refresh(),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: contracts.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          return ContractCard(
                            contract: contracts[index],
                            onTap: () => context.push('/contracts/${contracts[index].id}'),
                          );
                        },
                      ),
                    ),
                };
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChipsRow extends StatelessWidget {
  const _FilterChipsRow({
    required this.selected,
    required this.onChanged,
  });

  final ContractType? selected;
  final ValueChanged<ContractType?> onChanged;

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
            selected: selected == null,
            color: AppColors.primary,
            onTap: () => onChanged(null),
          ),
          const SizedBox(width: 8),
          ...ContractType.values.map((type) {
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _Chip(
                label: type.label,
                selected: selected == type,
                color: AppColors.primary,
                onTap: () => onChanged(selected == type ? null : type),
              ),
            );
          }),
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
            color: selected ? color : color.withValues(alpha: 0.3),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : color,
          ),
        ),
      ),
    );
  }
}
