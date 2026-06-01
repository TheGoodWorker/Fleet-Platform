import 'package:flutter/material.dart';

import '../../../../shared/widgets/empty_state.dart';

/// Placeholder — Sera remplacé par la vraie liste véhicules en Phase 8
class VehiclesPlaceholderPage extends StatelessWidget {
  const VehiclesPlaceholderPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Véhicules'),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.filter_list),
          ),
        ],
      ),
      body: const EmptyState(
        title: 'Module Véhicules',
        subtitle:
            'Ce module sera intégré en Phase 8.\nEndpoints API prêts : GET /vehicles, PATCH /vehicles/:id/status',
        icon: Icons.directions_car_outlined,
        actionLabel: 'Voir la liste (bientôt)',
      ),
    );
  }
}
