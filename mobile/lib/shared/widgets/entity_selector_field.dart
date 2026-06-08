library;

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Champ de formulaire qui ouvre un bottom sheet de recherche pour sélectionner
/// une entité métier. Jamais d'UUID visible — seul le libellé humain est affiché.
///
/// Utilisation :
/// ```dart
/// EntitySelectorField<Vehicle>(
///   label: 'Véhicule *',
///   items: _vehicles,
///   labelOf: (v) => '${v.plateNumber} — ${v.brand} ${v.model}',
///   subtitleOf: (v) => v.status,
///   validator: (v) => v == null ? 'Sélection requise' : null,
///   onChanged: (v) => setState(() => _selectedVehicle = v),
/// )
/// ```
class EntitySelectorField<T> extends FormField<T> {
  EntitySelectorField({
    super.key,
    required String label,
    required List<T> items,
    required String Function(T) labelOf,
    String? Function(T)? subtitleOf,
    super.initialValue,
    void Function(T)? onChanged,
    super.validator,
    bool isLoading = false,
    String emptyMessage = 'Aucun élément disponible',
    String searchHint = 'Rechercher…',
    IconData? prefixIcon,
  }) : super(
          autovalidateMode: AutovalidateMode.onUserInteraction,
          builder: (FormFieldState<T> field) {
            return _SelectorTile<T>(
              field: field,
              label: label,
              items: items,
              labelOf: labelOf,
              subtitleOf: subtitleOf,
              onChanged: onChanged,
              isLoading: isLoading,
              emptyMessage: emptyMessage,
              searchHint: searchHint,
              prefixIcon: prefixIcon,
            );
          },
        );
}

// ── Tile ─────────────────────────────────────────────────────────────────────

class _SelectorTile<T> extends StatelessWidget {
  const _SelectorTile({
    required this.field,
    required this.label,
    required this.items,
    required this.labelOf,
    this.subtitleOf,
    this.onChanged,
    required this.isLoading,
    required this.emptyMessage,
    required this.searchHint,
    this.prefixIcon,
  });

  final FormFieldState<T> field;
  final String label;
  final List<T> items;
  final String Function(T) labelOf;
  final String? Function(T)? subtitleOf;
  final void Function(T)? onChanged;
  final bool isLoading;
  final String emptyMessage;
  final String searchHint;
  final IconData? prefixIcon;

  @override
  Widget build(BuildContext context) {
    final selected = field.value;
    final hasError = field.hasError;

    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(
        color: hasError ? AppColors.error : AppColors.border,
      ),
    );
    final focusedBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.borderFocus, width: 2),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        InkWell(
          onTap: isLoading ? null : () => _openSheet(context),
          borderRadius: BorderRadius.circular(8),
          child: InputDecorator(
            decoration: InputDecoration(
              labelText: label,
              prefixIcon: prefixIcon != null
                  ? Icon(prefixIcon, size: 20, color: AppColors.textSecondary)
                  : null,
              suffixIcon: isLoading
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      ),
                    )
                  : Icon(
                      selected != null
                          ? Icons.check_circle_outline
                          : Icons.unfold_more,
                      size: 20,
                      color: selected != null
                          ? AppColors.success
                          : AppColors.textSecondary,
                    ),
              border: border,
              enabledBorder: border,
              focusedBorder: focusedBorder,
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.error),
              ),
              filled: true,
              fillColor: isLoading
                  ? AppColors.background
                  : AppColors.surface,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
            isEmpty: selected == null,
            child: Text(
              selected != null ? labelOf(selected) : '',
              style: TextStyle(
                fontSize: 15,
                color: selected != null
                    ? AppColors.textPrimary
                    : AppColors.textDisabled,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ),
        if (field.hasError) ...[
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.only(left: 14),
            child: Text(
              field.errorText!,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.error,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _openSheet(BuildContext context) async {
    final result = await showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _SearchSheet<T>(
        title: label,
        items: items,
        labelOf: labelOf,
        subtitleOf: subtitleOf,
        searchHint: searchHint,
        emptyMessage: emptyMessage,
      ),
    );
    if (result != null) {
      field.didChange(result);
      onChanged?.call(result);
    }
  }
}

// ── Bottom sheet de recherche ─────────────────────────────────────────────────

class _SearchSheet<T> extends StatefulWidget {
  const _SearchSheet({
    required this.title,
    required this.items,
    required this.labelOf,
    this.subtitleOf,
    required this.searchHint,
    required this.emptyMessage,
  });

  final String title;
  final List<T> items;
  final String Function(T) labelOf;
  final String? Function(T)? subtitleOf;
  final String searchHint;
  final String emptyMessage;

  @override
  State<_SearchSheet<T>> createState() => _SearchSheetState<T>();
}

class _SearchSheetState<T> extends State<_SearchSheet<T>> {
  final _searchController = TextEditingController();
  String _query = '';

  List<T> get _filtered {
    if (_query.isEmpty) return widget.items;
    final q = _query.toLowerCase();
    return widget.items.where((item) {
      final label = widget.labelOf(item).toLowerCase();
      final sub = widget.subtitleOf?.call(item)?.toLowerCase() ?? '';
      return label.contains(q) || sub.contains(q);
    }).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (_, scrollController) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Column(
            children: [
              // ── Drag handle ─────────────────────────────────────────────
              const SizedBox(height: 10),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 12),

              // ── Title ───────────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        widget.title,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                      color: AppColors.textSecondary,
                    ),
                  ],
                ),
              ),

              // ── Search field ─────────────────────────────────────────────
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: TextField(
                  controller: _searchController,
                  autofocus: true,
                  decoration: InputDecoration(
                    hintText: widget.searchHint,
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _query.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _query = '');
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    isDense: true,
                  ),
                  onChanged: (v) => setState(() => _query = v),
                ),
              ),

              const Divider(height: 1),

              // ── Results list ─────────────────────────────────────────────
              Expanded(
                child: filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.search_off_rounded,
                              size: 48,
                              color: AppColors.textDisabled,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              _query.isEmpty
                                  ? widget.emptyMessage
                                  : 'Aucun résultat pour "$_query"',
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        controller: scrollController,
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) =>
                            const Divider(height: 1, indent: 16),
                        itemBuilder: (ctx, i) {
                          final item = filtered[i];
                          final subtitle = widget.subtitleOf?.call(item);
                          return ListTile(
                            title: Text(
                              widget.labelOf(item),
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            subtitle: subtitle != null
                                ? Text(
                                    subtitle,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  )
                                : null,
                            trailing: const Icon(
                              Icons.chevron_right,
                              size: 18,
                              color: AppColors.textDisabled,
                            ),
                            onTap: () => Navigator.of(ctx).pop(item),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
