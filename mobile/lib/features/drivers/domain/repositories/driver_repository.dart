import '../entities/driver.dart';

/// Contrat du repository Chauffeurs — couche domain
abstract class DriverRepository {
  /// Récupère la liste des chauffeurs avec filtrage optionnel par statut
  Future<List<Driver>> getDrivers({
    String? status,
    int page = 1,
    int limit = 20,
  });
  Future<Driver> getDriverById(String id);
  Future<Driver> createDriver({
    required String userId,
    String? idCardNumber,
    String? licenseNumber,
    String? address,
    String? emergencyContact,
  });
  Future<Driver> updateDriver(String id, Map<String, dynamic> data);
  Future<void> validateKyc(String id);
  Future<void> validateField(String id);
}
