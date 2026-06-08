import 'package:equatable/equatable.dart';

// ── Modèle de données KPI ─────────────────────────────────────────────────────

class DashboardData extends Equatable {
  const DashboardData({
    // Véhicules
    required this.vehiclesTotal,
    required this.vehiclesAvailable,
    required this.vehiclesAssignedOrInService,
    required this.vehiclesImmobilized,
    // Chauffeurs
    required this.driversTotal,
    required this.driversActive,
    required this.driversPendingKyc,
    required this.driversAtRiskOrSuspended,
    // Contrats
    required this.contractsTotal,
    required this.contractsActive,
    required this.contractsPending,
    required this.contractsClosed,
    // Paiements
    required this.paymentsToday,
    required this.paymentsThisMonth,
    required this.paymentCountToday,
    required this.paymentsValidated,
    required this.paymentsPending,
    // Alertes
    required this.documentsExpired,
    required this.documentsExpiringSoon,
    required this.vehiclesWithoutDriver,
    required this.vehiclesWithoutActiveContract,
    // Tendance hebdomadaire des paiements (S1..S5 du mois en cours)
    this.weeklyPayments = const [0, 0, 0, 0, 0],
  });

  // Véhicules
  final int vehiclesTotal;
  final int vehiclesAvailable;
  final int vehiclesAssignedOrInService;
  final int vehiclesImmobilized;

  // Chauffeurs
  final int driversTotal;
  final int driversActive;
  final int driversPendingKyc;
  final int driversAtRiskOrSuspended;

  // Contrats
  final int contractsTotal;
  final int contractsActive;
  final int contractsPending;
  final int contractsClosed;

  // Paiements
  final double paymentsToday;
  final double paymentsThisMonth;
  final int paymentCountToday;
  final int paymentsValidated;
  final int paymentsPending;

  // Alertes
  final int documentsExpired;
  final int documentsExpiringSoon;
  final int vehiclesWithoutDriver;
  final int vehiclesWithoutActiveContract;

  /// Montants par semaine du mois courant (5 buckets, S1→S5)
  final List<double> weeklyPayments;

  int get alertCount =>
      documentsExpired +
      documentsExpiringSoon +
      vehiclesWithoutDriver +
      vehiclesWithoutActiveContract;

  static const empty = DashboardData(
    vehiclesTotal: 0, vehiclesAvailable: 0,
    vehiclesAssignedOrInService: 0, vehiclesImmobilized: 0,
    driversTotal: 0, driversActive: 0,
    driversPendingKyc: 0, driversAtRiskOrSuspended: 0,
    contractsTotal: 0, contractsActive: 0,
    contractsPending: 0, contractsClosed: 0,
    paymentsToday: 0, paymentsThisMonth: 0,
    paymentCountToday: 0, paymentsValidated: 0, paymentsPending: 0,
    documentsExpired: 0, documentsExpiringSoon: 0,
    vehiclesWithoutDriver: 0, vehiclesWithoutActiveContract: 0,
    weeklyPayments: [0, 0, 0, 0, 0],
  );

  @override
  List<Object?> get props => [
        vehiclesTotal, vehiclesAvailable, vehiclesAssignedOrInService,
        vehiclesImmobilized, driversTotal, driversActive, driversPendingKyc,
        driversAtRiskOrSuspended, contractsTotal, contractsActive,
        contractsPending, contractsClosed, paymentsToday, paymentsThisMonth,
        paymentCountToday, paymentsValidated, paymentsPending,
        documentsExpired, documentsExpiringSoon,
        vehiclesWithoutDriver, vehiclesWithoutActiveContract,
        weeklyPayments,
      ];
}

// ── États du cubit ────────────────────────────────────────────────────────────

sealed class DashboardState extends Equatable {
  const DashboardState();
}

class DashboardInitial extends DashboardState {
  const DashboardInitial();
  @override List<Object?> get props => [];
}

class DashboardLoading extends DashboardState {
  const DashboardLoading();
  @override List<Object?> get props => [];
}

class DashboardLoaded extends DashboardState {
  const DashboardLoaded(this.data);
  final DashboardData data;
  @override List<Object?> get props => [data];
}

class DashboardError extends DashboardState {
  const DashboardError(this.message);
  final String message;
  @override List<Object?> get props => [message];
}
