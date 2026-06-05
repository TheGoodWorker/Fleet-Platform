import '../../../../../core/utils/numeric_utils.dart';
import '../../domain/entities/contract.dart';

class ContractModel extends Contract {
  const ContractModel({
    required super.id,
    required super.type,
    required super.status,
    required super.dailyAmount,
    super.targetDays,
    required super.vehicleId,
    required super.vehiclePlate,
    required super.vehicleBrand,
    required super.vehicleModel,
    super.driverName,
    super.ownerName,
    super.startDate,
    super.endDate,
    super.progressDays,
    super.contractNumber,
    super.validatedDays,
    super.activatedAt,
    super.kycValidated,
    super.fieldValidated,
    super.depositPaid,
    super.contractSigned,
    super.managerApproved,
    super.adminApproved,
  });

  factory ContractModel.fromJson(Map<String, dynamic> json) {
    final vehicle = json['vehicle'] as Map<String, dynamic>?;
    final driver = json['driver'] as Map<String, dynamic>?;
    final owner = json['owner'] as Map<String, dynamic>?;

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

    final startDateRaw = json['startDate'] as String?;
    final endDateRaw = json['endDate'] as String?;
    final startDate =
        startDateRaw != null ? DateTime.tryParse(startDateRaw) : null;
    final endDate = endDateRaw != null ? DateTime.tryParse(endDateRaw) : null;

    // Calcul du progressDays depuis startDate si non fourni en meta
    int? progressDays;
    if (startDate != null) {
      progressDays = DateTime.now().difference(startDate).inDays;
      if (progressDays < 0) progressDays = 0;
    }

    return ContractModel(
      id: json['id'] as String,
      type: ContractType.fromString(json['type'] as String),
      status: ContractStatus.fromString(json['status'] as String),
      // Prisma Decimal peut être sérialisé en String, num ou objet {s,e,d}
      dailyAmount: parseDouble(json['dailyAmount']),
      targetDays: json['targetDays'] as int?,
      vehicleId: vehicle?['id'] as String? ?? '',
      vehiclePlate: vehicle?['plateNumber'] as String? ?? '',
      vehicleBrand: vehicle?['brand'] as String? ?? '',
      vehicleModel: vehicle?['model'] as String? ?? '',
      driverName: driverName,
      ownerName: owner?['name'] as String?,
      startDate: startDate,
      endDate: endDate,
      progressDays: progressDays,
      contractNumber: json['contractNumber'] as String?,
      validatedDays: json['validatedDays'] as int?,
      activatedAt: json['activatedAt'] != null
          ? DateTime.tryParse(json['activatedAt'] as String)
          : null,
      kycValidated: json['kycValidated'] as bool?,
      fieldValidated: json['fieldValidated'] as bool?,
      depositPaid: json['depositPaid'] as bool?,
      contractSigned: json['contractSigned'] as bool?,
      managerApproved: json['managerApproved'] as bool?,
      adminApproved: json['adminApproved'] as bool?,
    );
  }
}
