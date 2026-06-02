import '../entities/vehicle.dart';

/// Contrat du repository Véhicules — couche domain
abstract class VehicleRepository {
  /// Récupère la liste des véhicules avec filtrage optionnel par statut
  Future<List<Vehicle>> getVehicles({
    String? status,
    int page = 1,
    int limit = 20,
  });
}
