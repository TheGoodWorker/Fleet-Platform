import '../../domain/entities/driver.dart';

/// Modèle DriverDto — correspondance directe avec la réponse API
class DriverModel extends Driver {
  const DriverModel({
    required super.id,
    required super.status,
    required super.firstName,
    required super.lastName,
    required super.idCardNumber,
    required super.licenseNumber,
    super.address,
    super.scoreValue,
    super.phone,
    super.email,
  });

  factory DriverModel.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>? ?? {};

    return DriverModel(
      id: json['id'] as String,
      status: DriverStatus.fromString(json['status'] as String),
      firstName: user['firstName'] as String? ?? '',
      lastName: user['lastName'] as String? ?? '',
      idCardNumber: json['idCardNumber'] as String? ?? '',
      licenseNumber: json['licenseNumber'] as String? ?? '',
      address: json['address'] as String?,
      scoreValue: json['scoreValue'] != null ? (json['scoreValue'] as num).toDouble() : null,
      phone: user['phone'] as String?,
      email: user['email'] as String?,
    );
  }
}
