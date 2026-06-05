/// Tests pour parseDouble() — robustesse face aux formats Prisma Decimal.js-light
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:fleet_mobile/core/utils/numeric_utils.dart';

void main() {
  group('parseDouble', () {
    // ── Cas simples ───────────────────────────────────────────────────────────
    test('null → 0.0', () {
      expect(parseDouble(null), 0.0);
    });

    test('int → double', () {
      expect(parseDouble(15000), 15000.0);
    });

    test('double → double', () {
      expect(parseDouble(15000.5), 15000.5);
    });

    test('String entier → double', () {
      expect(parseDouble('7500'), 7500.0);
    });

    test('String décimal → double', () {
      expect(parseDouble('8500.00'), 8500.0);
    });

    test('String invalide → 0.0 (pas d\'exception)', () {
      expect(parseDouble('not-a-number'), 0.0);
    });

    test('String vide → 0.0', () {
      expect(parseDouble(''), 0.0);
    });

    // ── Objet Decimal.js-light {s, e, d} ─────────────────────────────────────
    // Ces cas correspondent exactement aux objets JSON envoyés par NestJS+Prisma 7
    test('{s:1, e:3, d:[7500]} → 7500.0', () {
      expect(parseDouble({'s': 1, 'e': 3, 'd': [7500]}), 7500.0);
    });

    test('{s:1, e:4, d:[15000]} → 15000.0', () {
      expect(parseDouble({'s': 1, 'e': 4, 'd': [15000]}), 15000.0);
    });

    test('{s:1, e:4, d:[18000]} → 18000.0', () {
      expect(parseDouble({'s': 1, 'e': 4, 'd': [18000]}), 18000.0);
    });

    test('{s:1, e:3, d:[8500]} → 8500.0', () {
      expect(parseDouble({'s': 1, 'e': 3, 'd': [8500]}), 8500.0);
    });

    test('{s:1, e:5, d:[240000]} → 240000.0', () {
      expect(parseDouble({'s': 1, 'e': 5, 'd': [240000]}), 240000.0);
    });

    test('{s:-1, e:3, d:[7500]} → -7500.0 (montant négatif)', () {
      expect(parseDouble({'s': -1, 'e': 3, 'd': [7500]}), -7500.0);
    });

    test('{s:1, e:1, d:[10]} → 10.0 (petite valeur)', () {
      expect(parseDouble({'s': 1, 'e': 1, 'd': [10]}), 10.0);
    });

    test('Map sans clés attendues → 0.0 (pas d\'exception)', () {
      expect(parseDouble({'foo': 'bar'}), 0.0);
    });

    test('Map vide → 0.0', () {
      expect(parseDouble(<String, dynamic>{}), 0.0);
    });
  });
}
