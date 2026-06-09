import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

import '../../../../shared/theme/app_theme.dart';

// ── Enums ─────────────────────────────────────────────────────────────────────

enum IncidentType {
  breakdown,
  accident,
  other;

  static IncidentType fromString(String v) => switch (v) {
        'BREAKDOWN' => IncidentType.breakdown,
        'ACCIDENT' => IncidentType.accident,
        _ => IncidentType.other,
      };

  String get value => switch (this) {
        IncidentType.breakdown => 'BREAKDOWN',
        IncidentType.accident => 'ACCIDENT',
        IncidentType.other => 'OTHER',
      };

  String get label => switch (this) {
        IncidentType.breakdown => 'Panne',
        IncidentType.accident => 'Accident',
        IncidentType.other => 'Autre incident',
      };

  IconData get icon => switch (this) {
        IncidentType.breakdown => Icons.build_outlined,
        IncidentType.accident => Icons.car_crash_outlined,
        IncidentType.other => Icons.warning_amber_outlined,
      };

  Color get color => switch (this) {
        IncidentType.breakdown => AppColors.warning,
        IncidentType.accident => AppColors.error,
        IncidentType.other => AppColors.textSecondary,
      };
}

enum IncidentStatus {
  open,
  inProgress,
  resolved,
  closed;

  static IncidentStatus fromString(String v) => switch (v) {
        'OPEN' => IncidentStatus.open,
        'IN_PROGRESS' => IncidentStatus.inProgress,
        'RESOLVED' => IncidentStatus.resolved,
        'CLOSED' => IncidentStatus.closed,
        _ => IncidentStatus.open,
      };

  String get value => switch (this) {
        IncidentStatus.open => 'OPEN',
        IncidentStatus.inProgress => 'IN_PROGRESS',
        IncidentStatus.resolved => 'RESOLVED',
        IncidentStatus.closed => 'CLOSED',
      };

  String get label => switch (this) {
        IncidentStatus.open => 'Ouvert',
        IncidentStatus.inProgress => 'En cours',
        IncidentStatus.resolved => 'Résolu',
        IncidentStatus.closed => 'Clôturé',
      };

  Color get color => switch (this) {
        IncidentStatus.open => AppColors.error,
        IncidentStatus.inProgress => AppColors.warning,
        IncidentStatus.resolved => AppColors.success,
        IncidentStatus.closed => AppColors.textSecondary,
      };
}

enum IncidentSeverity {
  low,
  medium,
  high,
  critical;

  static IncidentSeverity fromString(String v) => switch (v) {
        'LOW' => IncidentSeverity.low,
        'MEDIUM' => IncidentSeverity.medium,
        'HIGH' => IncidentSeverity.high,
        'CRITICAL' => IncidentSeverity.critical,
        _ => IncidentSeverity.medium,
      };

  String get value => switch (this) {
        IncidentSeverity.low => 'LOW',
        IncidentSeverity.medium => 'MEDIUM',
        IncidentSeverity.high => 'HIGH',
        IncidentSeverity.critical => 'CRITICAL',
      };

  String get label => switch (this) {
        IncidentSeverity.low => 'Faible',
        IncidentSeverity.medium => 'Moyen',
        IncidentSeverity.high => 'Élevé',
        IncidentSeverity.critical => 'Critique',
      };

  Color get color => switch (this) {
        IncidentSeverity.low => AppColors.textSecondary,
        IncidentSeverity.medium => AppColors.warning,
        IncidentSeverity.high => AppColors.error,
        IncidentSeverity.critical => const Color(0xFF7C0000),
      };
}

// ── Entité ────────────────────────────────────────────────────────────────────

class Incident extends Equatable {
  const Incident({
    required this.id,
    required this.type,
    required this.status,
    required this.severity,
    required this.vehicleId,
    required this.description,
    required this.occurredAt,
    required this.createdAt,
    this.vehiclePlate,
    this.vehicleBrand,
    this.vehicleModel,
    this.driverId,
    this.notes,
    this.locationLat,
    this.locationLng,
    this.resolvedAt,
    this.hasAccidentCase = false,
    this.chargesCount = 0,
  });

  final String id;
  final IncidentType type;
  final IncidentStatus status;
  final IncidentSeverity severity;
  final String vehicleId;
  final String? vehiclePlate;
  final String? vehicleBrand;
  final String? vehicleModel;
  final String? driverId;
  final String description;
  final String? notes;
  final double? locationLat;
  final double? locationLng;
  final DateTime occurredAt;
  final DateTime? resolvedAt;
  final DateTime createdAt;
  final bool hasAccidentCase;
  final int chargesCount;

  String get vehicleLabel =>
      vehiclePlate != null && vehicleBrand != null
          ? '$vehiclePlate — $vehicleBrand ${vehicleModel ?? ''}'.trim()
          : vehiclePlate ?? vehicleId;

  @override
  List<Object?> get props => [
        id, type, status, severity, vehicleId, vehiclePlate, vehicleBrand,
        vehicleModel, driverId, description, notes, locationLat, locationLng,
        occurredAt, resolvedAt, createdAt, hasAccidentCase, chargesCount,
      ];
}
