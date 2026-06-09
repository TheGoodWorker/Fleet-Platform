import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, UserRole, VehicleStatus, AssignmentSource } from '@prisma/client';
import { CreateVehicleDto, UpdateVehicleDto, AssignManagerDto, VehicleFiltersDto, AssignDriverDto } from './dto/vehicle.dto';

const VEHICLE_INCLUDE = {
  owner: { select: { id: true, name: true, type: true } },
  currentManager: { select: { id: true, firstName: true, lastName: true, email: true } },
  currentDriver: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
  currentContract: { select: { id: true, type: true, status: true, dailyAmount: true } },
  _count: { select: { contracts: true, incidents: true, maintenanceRecords: true } },
};

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: VehicleFiltersDto, page = 1, limit = 20, requestingUser: User) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.ownerId) where.ownerId = filters.ownerId;

    // Ownership check — Manager ne voit que ses véhicules
    if (requestingUser.role === UserRole.MANAGER) {
      where.currentManagerId = requestingUser.id;
    } else if (filters.managerId) {
      where.currentManagerId = filters.managerId;
    }

    // Owner ne voit que ses véhicules
    if (requestingUser.role === UserRole.OWNER) {
      const owner = await this.prisma.owner.findFirst({ where: { userId: requestingUser.id } });
      if (owner) where.ownerId = owner.id;
    }

    if (filters.search) {
      where.OR = [
        { plateNumber: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({ where, skip, take: limit, include: VEHICLE_INCLUDE, orderBy: { createdAt: 'desc' } }),
      this.prisma.vehicle.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id }, include: VEHICLE_INCLUDE });
    if (!vehicle) throw new NotFoundException(`Véhicule ${id} introuvable`);
    return vehicle;
  }

  async create(dto: CreateVehicleDto) {
    const exists = await this.prisma.vehicle.findFirst({ where: { plateNumber: dto.plateNumber } });
    if (exists) throw new ConflictException(`Plaque ${dto.plateNumber} déjà enregistrée`);

    return this.prisma.vehicle.create({
      data: {
        plateNumber: dto.plateNumber,
        brand: dto.brand,
        model: dto.model,
        vin: dto.vin,
        year: dto.year,
        color: dto.color,
        fuelType: dto.fuelType,
        transmission: dto.transmission,
        seats: dto.seats,
        ownerId: dto.ownerId,
        carculVehicleId: dto.carculVehicleId,
      },
      include: VEHICLE_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findById(id);
    return this.prisma.vehicle.update({ where: { id }, data: dto, include: VEHICLE_INCLUDE });
  }

  async assignManager(vehicleId: string, dto: AssignManagerDto) {
    const vehicle = await this.findById(vehicleId);
    const manager = await this.prisma.user.findFirst({ where: { id: dto.managerId, role: UserRole.MANAGER } });
    if (!manager) throw new NotFoundException('Manager introuvable');

    // Désactiver l'ancienne affectation si elle existe
    if (vehicle.currentManagerId) {
      await this.prisma.vehicleManagerAssignment.updateMany({
        where: { vehicleId, isActive: true },
        data: { isActive: false, endDate: new Date() },
      });
    }

    // Créer la nouvelle affectation
    await this.prisma.vehicleManagerAssignment.create({
      data: { vehicleId, managerId: dto.managerId, startDate: new Date(), isActive: true, reason: dto.reason },
    });

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { currentManagerId: dto.managerId },
      include: VEHICLE_INCLUDE,
    });
  }

  // ─── Affectations chauffeur ────────────────────────────────────────────────

  async getDriverAssignments(vehicleId: string, page = 1, limit = 20) {
    await this.findById(vehicleId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.vehicleDriverAssignment.findMany({
        where: { vehicleId },
        include: {
          driver: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true, phone: true } },
            },
          },
          vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vehicleDriverAssignment.count({ where: { vehicleId } }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async assignDriver(vehicleId: string, dto: AssignDriverDto) {
    const vehicle = await this.findById(vehicleId);

    const driver = await this.prisma.driver.findFirst({ where: { id: dto.driverId } });
    if (!driver) throw new NotFoundException('Chauffeur introuvable');

    // Clore l'affectation active si elle existe
    if (vehicle.currentDriverId) {
      await this.prisma.vehicleDriverAssignment.updateMany({
        where: { vehicleId, isActive: true },
        data: { isActive: false, endDate: new Date() },
      });
    }

    // Créer la nouvelle affectation
    const assignment = await this.prisma.vehicleDriverAssignment.create({
      data: {
        vehicleId,
        driverId: dto.driverId,
        startDate: new Date(),
        isActive: true,
        source: AssignmentSource.MANAGER,
        notes: dto.notes,
      },
      include: {
        driver: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
      },
    });

    // Mettre à jour le champ dénormalisé
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { currentDriverId: dto.driverId },
    });

    return assignment;
  }

  async unassignDriver(vehicleId: string) {
    const vehicle = await this.findById(vehicleId);
    if (!vehicle.currentDriverId) {
      throw new NotFoundException('Aucune affectation chauffeur active pour ce véhicule');
    }

    await this.prisma.vehicleDriverAssignment.updateMany({
      where: { vehicleId, isActive: true },
      data: { isActive: false, endDate: new Date() },
    });

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { currentDriverId: null },
      include: VEHICLE_INCLUDE,
    });
  }

  async updateStatus(id: string, status: VehicleStatus) {
    await this.findById(id);
    return this.prisma.vehicle.update({ where: { id }, data: { status }, include: VEHICLE_INCLUDE });
  }

  async softDelete(id: string) {
    await this.findById(id);
    return this.prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date(), status: VehicleStatus.OUT_OF_SERVICE }, select: { id: true, deletedAt: true } });
  }
}
