import 'package:flutter/material.dart';

import '../../../../shared/widgets/empty_state.dart';

/// Placeholder — Sera remplacé par la vraie liste chauffeurs en Phase 8
class DriversPlaceholderPage extends StatelessWidget {
  const DriversPlaceholderPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chauffeurs'),
      ),
      body: const EmptyState(
        title: 'Module Chauffeurs',
        subtitle:
            'Ce module sera intégré en Phase 8.\nEndpoints API prêts : GET /drivers, POST /drivers/:id/validate-kyc',
        icon: Icons.people_outlined,
        actionLabel: 'Voir la liste (bientôt)',
      ),
    );
  }
}
