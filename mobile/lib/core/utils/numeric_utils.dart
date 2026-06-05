/// Utilitaires de conversion numérique — robustes face aux formats
/// hétérogènes renvoyés par NestJS + Prisma 7.
///
/// Prisma sérialise les champs `Decimal` (decimal.js-light) sous la forme d'un
/// objet JSON : `{"s":1,"e":3,"d":[7500]}` au lieu d'un nombre ou d'une chaîne.
/// `double.parse(value.toString())` lancerait alors :
///   FormatException: Invalid double
///   {s: 1, e: 3, d: [7500]}
///
/// [parseDouble] gère tous les cas rencontrés en production :
///   • null        → 0.0
///   • num         → toDouble()
///   • String      → double.tryParse ?? 0.0
///   • Map {s,e,d} → reconstruction Decimal.js-light → double
library;

/// Convertit n'importe quelle valeur numérique Prisma/NestJS en [double].
double parseDouble(dynamic value) {
  if (value == null) return 0.0;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0.0;

  // ── Objet Decimal.js-light : {s: signe, e: exposant, d: [chiffres…]} ──────
  // Exemples fournis par Prisma 7 via NestJS :
  //   {s:1, e:3, d:[7500]}     → 7500.0
  //   {s:1, e:4, d:[15000]}    → 15000.0
  //   {s:-1, e:1, d:[85]}      → -85.0
  //   {s:1, e:3, d:[7500,500]} → 7500.05 (cas multi-groupe)
  if (value is Map) {
    try {
      final sign = ((value['s'] as num?) ?? 1).toInt(); // 1 ou -1
      final exp = ((value['e'] as num?) ?? 0).toInt();  // exposant base-10
      final d = value['d'] as List?;

      if (d != null && d.isNotEmpty) {
        // d[0] est le groupe de chiffres le plus significatif.
        // Formule : valeur = sign × d[0] × 10^(exp+1 − len(d[0]))
        final d0 = (d[0] as num).toInt();
        final shift = exp + 1 - d0.toString().length;

        double result = d0.toDouble();
        if (shift > 0) {
          for (int i = 0; i < shift; i++) {
            result *= 10.0;
          }
        } else if (shift < 0) {
          for (int i = 0; i < -shift; i++) {
            result /= 10.0;
          }
        }

        // Groupes supplémentaires (fractions) : chaque d[i>0] vaut 7 digits
        if (d.length > 1) {
          double fraction = 0.0;
          double base = 1e7; // chaque groupe = 7 digits
          for (int i = 1; i < d.length; i++) {
            fraction += (d[i] as num).toInt() / base;
            base *= 1e7;
          }
          result += fraction;
        }

        return sign.toDouble() * result;
      }
    } catch (_) {
      // Silently fall through — retourne 0.0
    }
  }

  return 0.0;
}
