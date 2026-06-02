import '../../domain/entities/payment.dart';

class PaymentModel extends Payment {
  const PaymentModel({
    required super.id,
    required super.amount,
    required super.source,
    required super.paidAt,
    required super.status,
    super.reference,
    super.notes,
    super.vehiclePlate,
    super.driverName,
    super.contractType,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    final vehicle = json['vehicle'] as Map<String, dynamic>?;
    final driver = json['driver'] as Map<String, dynamic>?;
    final contract = json['contract'] as Map<String, dynamic>?;

    String? driverName;
    if (driver != null) {
      final user = driver['user'] as Map<String, dynamic>?;
      if (user != null) {
        final firstName = user['firstName'] as String? ?? '';
        final lastName = user['lastName'] as String? ?? '';
        final full = '$firstName $lastName'.trim();
        if (full.isNotEmpty) driverName = full;
      }
    }

    return PaymentModel(
      id: json['id'] as String,
      // Prisma Decimal est sérialisé en String par NestJS → double.parse est requis
      amount: double.parse(json['amount'].toString()),
      source: PaymentSource.fromString(json['source'] as String),
      paidAt: DateTime.parse(json['paidAt'] as String),
      status: PaymentStatus.fromString(json['status'] as String),
      reference: json['reference'] as String?,
      notes: json['notes'] as String?,
      vehiclePlate: vehicle?['plateNumber'] as String?,
      driverName: driverName,
      contractType: contract?['type'] as String?,
    );
  }
}
