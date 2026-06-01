import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ─── Primaire ──────────────────────────────────────────────────────────────
  static const Color primary = Color(0xFF1A56DB);
  static const Color primaryDark = Color(0xFF1E429F);
  static const Color primaryLight = Color(0xFFE8EEFF);

  // ─── Sémantiques ───────────────────────────────────────────────────────────
  static const Color success = Color(0xFF057A55);
  static const Color successLight = Color(0xFFDEF7EC);
  static const Color warning = Color(0xFFC27803);
  static const Color warningLight = Color(0xFFFDF6B2);
  static const Color error = Color(0xFFE02424);
  static const Color errorLight = Color(0xFFFDE8E8);
  static const Color info = Color(0xFF1A56DB);

  // ─── Neutres ───────────────────────────────────────────────────────────────
  static const Color textPrimary = Color(0xFF111827);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color textDisabled = Color(0xFF9CA3AF);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFF9FAFB);
  static const Color border = Color(0xFFE5E7EB);
  static const Color borderFocus = Color(0xFF1A56DB);

  // ─── Rôles ─────────────────────────────────────────────────────────────────
  static const Color roleAdmin = Color(0xFF7E3AF2);
  static const Color roleSuperManager = Color(0xFF0694A2);
  static const Color roleManager = Color(0xFF057A55);
  static const Color roleDriver = Color(0xFFC27803);
  static const Color roleOwner = Color(0xFFE02424);
}

class AppTheme {
  AppTheme._();

  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.light,
        primary: AppColors.primary,
        onPrimary: Colors.white,
        surface: AppColors.surface,
        onSurface: AppColors.textPrimary,
        error: AppColors.error,
      ),
      scaffoldBackgroundColor: AppColors.background,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: AppColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: CardTheme(
        color: AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.border),
        ),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(
            color: AppColors.borderFocus,
            width: 2,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        hintStyle: const TextStyle(color: AppColors.textDisabled),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.border,
        space: 1,
        thickness: 1,
      ),
    );
  }
}
