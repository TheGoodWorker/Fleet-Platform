library;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../api/response_parser.dart';
import '../constants/api_constants.dart';
import '../utils/numeric_utils.dart';

// ── Types d'options (Dart 3 records) ─────────────────────────────────────────

typedef OwnerOption = ({
  String id,
  String name,
  String type, // INDIVIDUAL | COMPANY | INTERNAL
});

typedef VehicleOption = ({
  String id,
  String plateNumber,
  String brand,
  String model,
  String status,
});

typedef DriverOption = ({
  String id,
  String fullName,
  String? phone,
  String status,
});

typedef ContractOption = ({
  String id,
  String vehiclePlate,
  String vehicleBrand,
  String vehicleModel,
  String? driverName,
  String vehicleId,
  String? driverId,
  double dailyAmount,
});

typedef UserOption = ({
  String id,
  String fullName,
  String? email,
  String role,
});

// ── Datasource ────────────────────────────────────────────────────────────────

/// Charge les listes d'entités nécessaires aux formulaires (sélecteurs).
/// Utilise exclusivement les endpoints list existants — aucun endpoint nouveau.
class FormOptionsDatasource {
  const FormOptionsDatasource(this._dio);

  final Dio _dio;

  // ── Propriétaires — déduits du endpoint /vehicles ──────────────────────────
  Future<List<OwnerOption>> getOwners() async {
    try {
      final response = await _dio.get(
        ApiConstants.vehicles,
        queryParameters: {'page': 1, 'limit': 200},
      );
      final body = parseResponseBody(response.data, context: 'FormOptions.getOwners');
      final rawData = (body['data'] as List?) ?? const <dynamic>[];

      final seen = <String>{};
      final owners = <OwnerOption>[];

      for (final item in rawData) {
        final ownerMap = (item as Map?)?.cast<String, dynamic>()['owner']
            as Map?;
        if (ownerMap == null) continue;
        final id = ownerMap['id'] as String?;
        if (id == null || !seen.add(id)) continue;
        owners.add((
          id: id,
          name: ownerMap['name'] as String? ?? '',
          type: ownerMap['type'] as String? ?? '',
        ));
      }

      owners.sort((a, b) => a.name.compareTo(b.name));
      return owners;
    } catch (e, st) {
      debugPrint('[FormOptions.getOwners] $e\n$st');
      return [];
    }
  }

  // ── Véhicules ─────────────────────────────────────────────────────────────
  Future<List<VehicleOption>> getVehicles({String? status}) async {
    try {
      final response = await _dio.get(
        ApiConstants.vehicles,
        queryParameters: {
          'page': 1,
          'limit': 200,
          if (status != null) 'status': status,
        },
      );
      final body = parseResponseBody(response.data, context: 'FormOptions.getVehicles');
      final rawData = (body['data'] as List?) ?? const <dynamic>[];

      final options = rawData.map<VehicleOption>((dynamic raw) {
        final item = (raw as Map).cast<String, dynamic>();
        return (
          id: item['id'] as String? ?? '',
          plateNumber: item['plateNumber'] as String? ?? '',
          brand: item['brand'] as String? ?? '',
          model: item['model'] as String? ?? '',
          status: item['status'] as String? ?? '',
        );
      }).where((v) => v.id.isNotEmpty).toList();

      options.sort((a, b) => a.plateNumber.compareTo(b.plateNumber));
      return options;
    } catch (e, st) {
      debugPrint('[FormOptions.getVehicles] $e\n$st');
      return [];
    }
  }

  // ── Chauffeurs ────────────────────────────────────────────────────────────
  Future<List<DriverOption>> getDrivers({
    List<String> statuses = const ['ACTIVE', 'APPROVED'],
  }) async {
    try {
      // Charge plusieurs statuts en parallèle si nécessaire
      final futures = statuses.map((s) => _fetchDriversWithStatus(s));
      final results = await Future.wait(futures);
      final all = results.expand((r) => r).toList();

      // Déduplique par id
      final seen = <String>{};
      final deduped = all.where((d) => seen.add(d.id)).toList();
      deduped.sort((a, b) => a.fullName.compareTo(b.fullName));
      return deduped;
    } catch (e, st) {
      debugPrint('[FormOptions.getDrivers] $e\n$st');
      return [];
    }
  }

  Future<List<DriverOption>> _fetchDriversWithStatus(String status) async {
    final response = await _dio.get(
      ApiConstants.drivers,
      queryParameters: {'page': 1, 'limit': 200, 'status': status},
    );
    final body = parseResponseBody(response.data, context: 'FormOptions.drivers.$status');
    final rawData = (body['data'] as List?) ?? const <dynamic>[];

    return rawData.map<DriverOption>((dynamic raw) {
      final item = (raw as Map).cast<String, dynamic>();
      final user = (item['user'] as Map?)?.cast<String, dynamic>() ?? {};
      final firstName = user['firstName'] as String? ?? '';
      final lastName = user['lastName'] as String? ?? '';
      return (
        id: item['id'] as String? ?? '',
        fullName: '$firstName $lastName'.trim(),
        phone: user['phone'] as String?,
        status: item['status'] as String? ?? '',
      );
    }).where((d) => d.id.isNotEmpty).toList();
  }

  // ── Contrats (pour sélecteur dans le formulaire de paiement) ──────────────
  Future<List<ContractOption>> getContracts({String status = 'ACTIVE'}) async {
    try {
      final response = await _dio.get(
        ApiConstants.contracts,
        queryParameters: {'page': 1, 'limit': 100, 'status': status},
      );
      final body = parseResponseBody(response.data, context: 'FormOptions.getContracts');
      final rawData = (body['data'] as List?) ?? const <dynamic>[];

      final options = rawData.map<ContractOption>((dynamic raw) {
        final item = (raw as Map).cast<String, dynamic>();
        final vehicle =
            (item['vehicle'] as Map?)?.cast<String, dynamic>() ?? {};
        final driver = (item['driver'] as Map?)?.cast<String, dynamic>();
        String? driverName;
        if (driver != null) {
          final user = (driver['user'] as Map?)?.cast<String, dynamic>() ?? {};
          final fn = user['firstName'] as String? ?? '';
          final ln = user['lastName'] as String? ?? '';
          final full = '$fn $ln'.trim();
          if (full.isNotEmpty) driverName = full;
        }
        return (
          id: item['id'] as String? ?? '',
          vehiclePlate: vehicle['plateNumber'] as String? ?? '',
          vehicleBrand: vehicle['brand'] as String? ?? '',
          vehicleModel: vehicle['model'] as String? ?? '',
          driverName: driverName,
          vehicleId: item['vehicleId'] as String? ?? '',
          driverId: item['driverId'] as String?,
          dailyAmount: parseDouble(item['dailyAmount']),
        );
      }).where((c) => c.id.isNotEmpty).toList();

      options.sort((a, b) => a.vehiclePlate.compareTo(b.vehiclePlate));
      return options;
    } catch (e, st) {
      debugPrint('[FormOptions.getContracts] $e\n$st');
      return [];
    }
  }

  // ── Utilisateurs avec rôle DRIVER (pour création profil chauffeur) ─────────
  Future<List<UserOption>> getDriverUsers() async {
    try {
      final response = await _dio.get(
        ApiConstants.users,
        queryParameters: {'page': 1, 'limit': 100, 'role': 'DRIVER'},
      );
      final body = parseResponseBody(response.data, context: 'FormOptions.getDriverUsers');
      final rawData = (body['data'] as List?) ?? const <dynamic>[];

      if (rawData.isEmpty) {
        // Certains backends retournent les users sans filtrage → fallback
        return [];
      }

      final options = rawData.map<UserOption>((dynamic raw) {
        final item = (raw as Map).cast<String, dynamic>();
        final fn = item['firstName'] as String? ?? '';
        final ln = item['lastName'] as String? ?? '';
        return (
          id: item['id'] as String? ?? '',
          fullName: '$fn $ln'.trim(),
          email: item['email'] as String?,
          role: item['role'] as String? ?? 'DRIVER',
        );
      }).where((u) => u.id.isNotEmpty).toList();

      options.sort((a, b) => a.fullName.compareTo(b.fullName));
      return options;
    } catch (e, st) {
      debugPrint('[FormOptions.getDriverUsers] $e\n$st');
      return [];
    }
  }
}

// ── Helpers d'affichage ───────────────────────────────────────────────────────

/// Libellé d'un propriétaire : "Papa Diop (Particulier)"
String ownerLabel(OwnerOption o) {
  final typeLabel = switch (o.type) {
    'INDIVIDUAL' => 'Particulier',
    'COMPANY' => 'Société',
    'INTERNAL' => 'Interne',
    _ => o.type,
  };
  return '${o.name} ($typeLabel)';
}

/// Libellé d'un véhicule : "DK 4004 DD — Nissan Patrol"
String vehicleLabel(VehicleOption v) =>
    '${v.plateNumber} — ${v.brand} ${v.model}'.trim();

/// Sous-titre d'un véhicule : statut en français
String vehicleSubtitle(VehicleOption v) => switch (v.status) {
      'AVAILABLE' => 'Disponible',
      'ASSIGNED' => 'Assigné',
      'IN_SERVICE' => 'En service',
      'IMMOBILIZED' => 'Immobilisé',
      _ => v.status,
    };

/// Libellé d'un chauffeur : "Abdou Seck"
String driverLabel(DriverOption d) => d.fullName;

/// Sous-titre d'un chauffeur : téléphone + statut
String? driverSubtitle(DriverOption d) {
  final parts = <String>[
    if (d.phone != null) d.phone!,
    _driverStatusFr(d.status),
  ];
  return parts.isEmpty ? null : parts.join(' · ');
}

String _driverStatusFr(String s) => switch (s) {
      'ACTIVE' => 'Actif',
      'APPROVED' => 'Approuvé',
      'SUSPENDED' => 'Suspendu',
      _ => s,
    };

/// Libellé d'un contrat : "DK 1001 AA — Abdou Seck · 15 000 F/j"
String contractLabel(ContractOption c) {
  final driver = c.driverName != null ? ' — ${c.driverName}' : '';
  return '${c.vehiclePlate} — ${c.vehicleBrand} ${c.vehicleModel}$driver';
}

String contractSubtitle(ContractOption c) =>
    '${_fmtAmount(c.dailyAmount)} FCFA/jour';

String _fmtAmount(double amount) {
  final str = amount.toInt().toString();
  final buf = StringBuffer();
  for (int i = 0; i < str.length; i++) {
    if (i > 0 && (str.length - i) % 3 == 0) buf.write(' ');
    buf.write(str[i]);
  }
  return buf.toString();
}

/// Libellé d'un utilisateur : "Abdou Seck"
String userLabel(UserOption u) =>
    u.fullName.isNotEmpty ? u.fullName : u.email ?? u.id;

/// Sous-titre d'un utilisateur : email
String? userSubtitle(UserOption u) => u.email;
