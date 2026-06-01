import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../../../shared/theme/app_theme.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _usePhone = false;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final identifier = _identifierController.text.trim();
    final password = _passwordController.text;
    final isPhone = _usePhone || identifier.startsWith('+');

    context.read<AuthBloc>().add(
          AuthLoginRequested(
            email: isPhone ? null : identifier,
            phone: isPhone ? identifier : null,
            password: password,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          // GoRouter gère la navigation via le refresh listenable
          // Ici on affiche uniquement les messages d'erreur
          if (state is AuthError) {
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.error,
                ),
              );
          }
        },
        builder: (context, state) {
          final isLoading = state is AuthLoading;
          return SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 32,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // ─── Logo + titre ─────────────────────────────────
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(
                            Icons.local_shipping_outlined,
                            size: 36,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Fleet Platform',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Connectez-vous à votre compte',
                          style: TextStyle(
                            fontSize: 16,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 40),

                        // ─── Identifiant ──────────────────────────────────
                        Row(
                          children: [
                            const Text(
                              'Se connecter avec',
                              style: TextStyle(color: AppColors.textSecondary),
                            ),
                            const SizedBox(width: 8),
                            ChoiceChip(
                              label: const Text('Email'),
                              selected: !_usePhone,
                              onSelected: (_) =>
                                  setState(() => _usePhone = false),
                            ),
                            const SizedBox(width: 6),
                            ChoiceChip(
                              label: const Text('Téléphone'),
                              selected: _usePhone,
                              onSelected: (_) =>
                                  setState(() => _usePhone = true),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        AppTextField(
                          label: _usePhone ? 'Téléphone' : 'Email',
                          hint: _usePhone
                              ? '+221 70 123 45 67'
                              : 'votre@email.com',
                          controller: _identifierController,
                          keyboardType: _usePhone
                              ? TextInputType.phone
                              : TextInputType.emailAddress,
                          prefixIcon: _usePhone
                              ? Icons.phone_outlined
                              : Icons.email_outlined,
                          textInputAction: TextInputAction.next,
                          enabled: !isLoading,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return _usePhone
                                  ? 'Téléphone obligatoire'
                                  : 'Email obligatoire';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),

                        // ─── Mot de passe ─────────────────────────────────
                        AppTextField(
                          label: 'Mot de passe',
                          controller: _passwordController,
                          obscureText: true,
                          prefixIcon: Icons.lock_outline,
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => _submit(),
                          enabled: !isLoading,
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Mot de passe obligatoire';
                            }
                            if (value.length < 6) {
                              return 'Minimum 6 caractères';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 32),

                        // ─── Bouton login ─────────────────────────────────
                        AppButton(
                          label: 'Se connecter',
                          onPressed: isLoading ? null : _submit,
                          isLoading: isLoading,
                          icon: Icons.login,
                        ),

                        const SizedBox(height: 24),
                        const Center(
                          child: Text(
                            'Fleet Platform V2.0 — Usage interne',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textDisabled,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
