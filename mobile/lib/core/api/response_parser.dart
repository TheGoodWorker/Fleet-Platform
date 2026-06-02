import 'dart:convert' show jsonDecode;

import 'package:flutter/foundation.dart' show debugPrint;

/// Parse l'enveloppe API `{ success, data, meta }` depuis un body Dio.
///
/// Gère deux cas :
/// - `response.data` déjà décodé en `Map<String, dynamic>` (cas normal)
/// - `response.data` comme `String` JSON brut (Flutter Web : Content-Type absent,
///   ou Dio qui n'a pas activé le décodeur automatique)
///
/// Retourne `{}` si le body est null, vide ou illisible — le site d'appel
/// applique ensuite `(body['data'] as List?) ?? const []` pour un accès sûr.
Map<String, dynamic> parseResponseBody(dynamic data, {String? context}) {
  if (data is Map<String, dynamic>) return data;

  if (data is String && data.isNotEmpty) {
    try {
      final decoded = jsonDecode(data);
      if (decoded is Map<String, dynamic>) return decoded;
      debugPrint(
        '[${context ?? "ResponseParser"}] '
        'JSON root n\'est pas un objet : ${decoded.runtimeType}',
      );
    } catch (e) {
      debugPrint(
        '[${context ?? "ResponseParser"}] '
        'Échec parse JSON : $e\nBody (tronqué) : ${data.substring(0, data.length.clamp(0, 200))}',
      );
    }
  }

  return {};
}
