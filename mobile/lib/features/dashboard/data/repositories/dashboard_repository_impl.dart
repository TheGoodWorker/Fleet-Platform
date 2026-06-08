import '../../domain/repositories/dashboard_repository.dart';
import '../../presentation/cubit/dashboard_state.dart';
import '../datasources/dashboard_datasource.dart';

/// Calcule les KPI côté Flutter à partir des listes brutes.
class DashboardRepositoryImpl implements DashboardRepository {
  const DashboardRepositoryImpl(this._datasource);

  final DashboardDatasource _datasource;

  @override
  Future<DashboardData> load() async {
    final raw = await _datasource.fetchAll();
    return _compute(raw);
  }

  DashboardData _compute(DashboardRawData raw) {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final monthStart = DateTime(now.year, now.month);

    // ── Véhicules ─────────────────────────────────────────────────────────────
    final vehicles = raw.vehicles;
    int vAvailable = 0, vAssigned = 0, vImmob = 0;
    int vNoDriver = 0, vNoContract = 0;

    for (final v in vehicles) {
      final status = v['status'] as String? ?? '';
      switch (status) {
        case 'AVAILABLE':
          vAvailable++;
          vNoContract++;
        case 'ASSIGNED':
        case 'IN_SERVICE':
          vAssigned++;
          // Véhicule sans chauffeur : ASSIGNED mais currentDriver absent
          final driver = v['currentDriver'];
          if (driver == null) vNoDriver++;
        case 'IMMOBILIZED':
        case 'IN_REPAIR':
        case 'ACCIDENTED':
        case 'PENDING_INSPECTION':
          vImmob++;
      }
    }

    // ── Chauffeurs ────────────────────────────────────────────────────────────
    final drivers = raw.drivers;
    int dActive = 0, dKyc = 0, dAtRisk = 0;

    for (final d in drivers) {
      final status = d['status'] as String? ?? '';
      switch (status) {
        case 'ACTIVE':
          dActive++;
        case 'PENDING_KYC':
        case 'PENDING_FIELD_VALIDATION':
          dKyc++;
        case 'SUSPENDED':
        case 'AT_RISK':
          dAtRisk++;
      }
    }

    // ── Contrats ──────────────────────────────────────────────────────────────
    final contracts = raw.contracts;
    int cActive = 0, cPending = 0, cClosed = 0;

    for (final c in contracts) {
      final status = c['status'] as String? ?? '';
      switch (status) {
        case 'ACTIVE':
          cActive++;
        case 'DRAFT':
        case 'PENDING_APPROVAL':
          cPending++;
        case 'TERMINATED':
        case 'COMPLETED':
        case 'SUSPENDED':
          cClosed++;
      }
    }

    // ── Paiements ─────────────────────────────────────────────────────────────
    final payments = raw.payments;
    double pToday = 0, pMonth = 0;
    int pCountToday = 0, pValidated = 0, pPending = 0;
    final weeklyTotals = <double>[0, 0, 0, 0, 0];

    for (final p in payments) {
      final status = p['status'] as String? ?? '';
      if (status == 'VALIDATED' || status == 'CONFIRMED') pValidated++;
      if (status == 'PENDING') pPending++;

      final paidAtRaw = p['paidAt'] as String?;
      if (paidAtRaw == null) continue;
      final paidAt = DateTime.tryParse(paidAtRaw);
      if (paidAt == null) continue;

      final amount = _toDouble(p['amount']);

      if (!paidAt.isBefore(monthStart)) {
        pMonth += amount;
        // Bucket semaine du mois (0=S1 … 4=S5)
        final week = ((paidAt.day - 1) ~/ 7).clamp(0, 4);
        weeklyTotals[week] += amount;
        if (!paidAt.isBefore(todayStart)) {
          pToday += amount;
          pCountToday++;
        }
      }
    }

    // ── Documents ─────────────────────────────────────────────────────────────
    final documents = raw.documents;
    int docExpired = 0, docExpiringSoon = 0;

    for (final d in documents) {
      final status = d['status'] as String? ?? '';
      switch (status) {
        case 'EXPIRED':
          docExpired++;
        case 'EXPIRING_SOON':
          docExpiringSoon++;
      }
    }

    return DashboardData(
      vehiclesTotal: vehicles.length,
      vehiclesAvailable: vAvailable,
      vehiclesAssignedOrInService: vAssigned,
      vehiclesImmobilized: vImmob,
      driversTotal: drivers.length,
      driversActive: dActive,
      driversPendingKyc: dKyc,
      driversAtRiskOrSuspended: dAtRisk,
      contractsTotal: contracts.length,
      contractsActive: cActive,
      contractsPending: cPending,
      contractsClosed: cClosed,
      paymentsToday: pToday,
      paymentsThisMonth: pMonth,
      paymentCountToday: pCountToday,
      paymentsValidated: pValidated,
      paymentsPending: pPending,
      documentsExpired: docExpired,
      documentsExpiringSoon: docExpiringSoon,
      vehiclesWithoutDriver: vNoDriver,
      vehiclesWithoutActiveContract: vNoContract,
      weeklyPayments: weeklyTotals,
    );
  }

  /// Convertit une valeur Prisma Decimal (String | num | Map) en double.
  double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    if (value is Map) {
      // Decimal.js-light : {s, e, d}
      try {
        final s = ((value['s'] as num?) ?? 1).toInt();
        final e = ((value['e'] as num?) ?? 0).toInt();
        final d = value['d'] as List?;
        if (d != null && d.isNotEmpty) {
          final d0 = (d[0] as num).toInt();
          final shift = e + 1 - d0.toString().length;
          double result = d0.toDouble();
          if (shift > 0) {
            for (int i = 0; i < shift; i++) { result *= 10; }
          } else if (shift < 0) {
            for (int i = 0; i < -shift; i++) { result /= 10; }
          }
          return s * result;
        }
      } catch (_) {}
    }
    return 0.0;
  }
}
