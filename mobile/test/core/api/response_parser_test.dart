import 'package:flutter_test/flutter_test.dart';

import 'package:fleet_mobile/core/api/response_parser.dart';

void main() {
  group('parseResponseBody', () {
    test('retourne le Map directement quand data est déjà un Map', () {
      final data = {
        'success': true,
        'data': <dynamic>[],
        'meta': {'page': 1, 'limit': 50, 'total': 0},
      };
      expect(parseResponseBody(data), same(data));
    });

    test('décode une String JSON valide', () {
      const json =
          '{"success":true,"data":[],"meta":{"page":1,"limit":50,"total":0}}';
      final result = parseResponseBody(json);
      expect(result['success'], isTrue);
      expect(result['data'], isEmpty);
    });

    test('retourne {} pour une String JSON invalide (pas d\'exception)', () {
      expect(parseResponseBody('not-valid-json'), isEmpty);
    });

    test('retourne {} pour null', () {
      expect(parseResponseBody(null), isEmpty);
    });

    test('retourne {} pour une String vide', () {
      expect(parseResponseBody(''), isEmpty);
    });

    test('retourne {} si la JSON root n\'est pas un objet (ex: tableau)', () {
      expect(parseResponseBody('[1,2,3]'), isEmpty);
    });

    test('data: [] dans la String JSON → rawData vide après cast', () {
      const json = '{"success":true,"data":[]}';
      final body = parseResponseBody(json);
      final rawData = (body['data'] as List?) ?? const <dynamic>[];
      expect(rawData, isEmpty);
    });
  });
}
