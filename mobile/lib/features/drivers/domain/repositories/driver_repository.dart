import '../entities/driver.dart';

/// Contrat du repository Chauffeurs — couche domain
abstract class DriverRepository {
  /// Récupère la liste des chauffeurs avec filtrage optionnel par statut
  Future<List<Driver>> getDrivers({
    String? status,
    int page = 1,
    int limit = 20,
  });
}
