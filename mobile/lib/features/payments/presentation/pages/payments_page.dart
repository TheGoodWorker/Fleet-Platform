import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/permissions/permission_helper.dart';
import '../../../../shared/theme/app_theme.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_state.dart';
import '../../domain/entities/payment.dart';
import '../cubit/payments_cubit.dart';
import '../cubit/payments_state.dart';
import '../widgets/create_payment_form.dart';
import '../widgets/payment_card.dart';

class PaymentsPage extends StatefulWidget {
  const PaymentsPage({super.key});

  @override
  State<PaymentsPage> createState() => _PaymentsPageState();
}

class _PaymentsPageState extends State<PaymentsPage> {
  @override
  void initState() {
    super.initState();
    context.read<PaymentsCubit>().load();
  }

  void _showCreateForm() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return BlocProvider.value(
          value: context.read<PaymentsCubit>(),
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.92,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            builder: (_, scrollController) {
              return SingleChildScrollView(
                controller: scrollController,
                padding: EdgeInsets.fromLTRB(
                  24,
                  20,
                  24,
                  MediaQuery.of(ctx).viewInsets.bottom + 24,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.border,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Nouveau paiement',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 20),
                    const CreatePaymentForm(),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    final user =
        authState is AuthAuthenticated ? authState.user : null;
    final canCreate = PermissionHelper.canCreate(user);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Paiements'),
      ),
      floatingActionButton: canCreate
          ? FloatingActionButton(
              onPressed: _showCreateForm,
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              child: const Icon(Icons.add),
            )
          : null,
      body: BlocBuilder<PaymentsCubit, PaymentsState>(
        builder: (context, state) {
          return switch (state) {
            PaymentsInitial() => const SizedBox.shrink(),
            PaymentsLoading() => const LoadingView(
                message: 'Chargement des paiements…',
              ),
            PaymentsError(:final message) => ErrorView(
                message: message,
                onRetry: () => context.read<PaymentsCubit>().load(),
              ),
            PaymentsLoaded(:final payments) when payments.isEmpty =>
              const EmptyState(
                title: 'Aucun paiement',
                subtitle: 'Aucun paiement enregistré pour le moment.',
                icon: Icons.payments_outlined,
              ),
            PaymentsLoaded(:final payments) => _PaymentsList(
                payments: payments,
                onRefresh: () => context.read<PaymentsCubit>().refresh(),
              ),
            PaymentsCreating(:final payments) => _PaymentsList(
                payments: payments,
                onRefresh: () => context.read<PaymentsCubit>().refresh(),
                loading: true,
              ),
            PaymentsCreated(:final payments) => _PaymentsList(
                payments: payments,
                onRefresh: () => context.read<PaymentsCubit>().refresh(),
              ),
            PaymentsCreateError(:final payments) => _PaymentsList(
                payments: payments,
                onRefresh: () => context.read<PaymentsCubit>().refresh(),
              ),
          };
        },
      ),
    );
  }
}

class _PaymentsList extends StatelessWidget {
  const _PaymentsList({
    required this.payments,
    required this.onRefresh,
    this.loading = false,
  });

  final List<Payment> payments;
  final Future<void> Function() onRefresh;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        RefreshIndicator(
          color: AppColors.primary,
          onRefresh: onRefresh,
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: payments.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              return PaymentCard(
                payment: payments[index],
                onTap: () => context.push('/payments/${payments[index].id}'),
              );
            },
          ),
        ),
        if (loading)
          const Positioned.fill(
            child: ColoredBox(
              color: Color(0x66FFFFFF),
              child: Center(
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
