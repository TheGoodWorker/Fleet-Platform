import '../entities/vehicle.dart';

/// Contrat du repository Véhicules — couche domain
abstract class VehicleRepository {
  /// Récupère la liste des véhicules avec filtrage optionnel par statut
  Future<List<Vehicle>> getVehicles({
    String? status,
    int page = 1,
    int limit = 20,
  });

  Future<Vehicle> getVehicleById(String id);

  Future<Vehicle> createVehicle({
    required String plateNumber,
    required String brand,
    required String model,
    String? vin,
    int? year,
    String? color,
    String? fuelType,
    String? transmission,
    int? seats,
    String? ownerId,
  });

  Future<Vehicle> updateVehicle(String id, Map<String, dynamic> data);
}
