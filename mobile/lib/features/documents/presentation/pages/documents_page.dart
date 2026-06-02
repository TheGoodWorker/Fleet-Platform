import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../domain/entities/document.dart';
import '../cubit/documents_cubit.dart';
import '../cubit/documents_state.dart';
import '../widgets/document_card.dart';

class DocumentsPage extends StatefulWidget {
  const DocumentsPage({super.key});

  @override
  State<DocumentsPage> createState() => _DocumentsPageState();
}

class _DocumentsPageState extends State<DocumentsPage> {
  DocumentStatus? _selectedStatus;

  @override
  void initState() {
    super.initState();
    context.read<DocumentsCubit>().load();
  }

  void _onFilterChanged(DocumentStatus? status) {
    setState(() => _selectedStatus = status);
    context.read<DocumentsCubit>().filterByStatus(status?.value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Documents'),
      ),
      body: Column(
        children: [
          _FilterChipsRow(
            selected: _selectedStatus,
            onChanged: _onFilterChanged,
          ),
          const Divider(height: 1),
          Expanded(
            child: BlocBuilder<DocumentsCubit, DocumentsState>(
              builder: (context, state) {
                return switch (state) {
                  DocumentsInitial() => const SizedBox.shrink(),
                  DocumentsLoading() => const LoadingView(
                      message: 'Chargement des documents…',
                    ),
                  DocumentsError(:final message) => ErrorView(
                      message: message,
                      onRetry: () => context
                          .read<DocumentsCubit>()
                          .load(status: _selectedStatus?.value),
                    ),
                  DocumentsLoaded(:final documents) when documents.isEmpty =>
                    EmptyState(
                      title: 'Aucun document',
                      subtitle: _selectedStatus != null
                          ? 'Aucun document avec le statut "${_selectedStatus!.label}"'
                          : 'Aucun document enregistré pour le moment.',
                      icon: Icons.folder_open_outlined,
                    ),
                  DocumentsLoaded(:final documents) => RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: () =>
                          context.read<DocumentsCubit>().refresh(),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: documents.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          return DocumentCard(
                            document: documents[index],
                            onTap: () {},
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

  final DocumentStatus? selected;
  final ValueChanged<DocumentStatus?> onChanged;

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
          ...DocumentStatus.values.map((status) {
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _Chip(
                label: status.label,
                selected: selected == status,
                color: status.color,
                onTap: () => onChanged(selected == status ? null : status),
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
