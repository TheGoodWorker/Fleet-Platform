import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOwnerDto, UpdateOwnerDto } from './dto/owner.dto';

const OWNER_INCLUDE = {
  vehicles: { select: { id: true, plateNumber: true, brand: true, model: true, status: true }, where: { deletedAt: null } },
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
  _count: { select: { vehicles: true, contracts: true, monthlySettlements: true } },
};

@Injectable()
export class OwnersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, search?: string, requestingUser?: User) {
    const skip = (page - 1) * limit;
    const where: any = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
      : {};

    // IDOR — MANAGER ne voit que les propriétaires des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      where.vehicles = { some: { currentManagerId: requestingUser.id } };
    }

    const [data, total] = await Promise.all([
      this.prisma.owner.findMany({ where, skip, take: limit, include: OWNER_INCLUDE, orderBy: { createdAt: 'desc' } }),
      this.prisma.owner.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const owner = await this.prisma.owner.findFirst({ where: { id }, include: OWNER_INCLUDE });
    if (!owner) throw new NotFoundException(`Propriétaire ${id} introuvable`);

    // IDOR — MANAGER ne voit que les propriétaires des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      const inScope = await this.prisma.owner.findFirst({
        where: { id, vehicles: { some: { currentManagerId: requestingUser.id } } },
        select: { id: true },
      });
      if (!inScope) {
        throw new ForbiddenException('Accès refusé — ce propriétaire est hors de votre périmètre');
      }
    }
    return owner;
  }

  async create(dto: CreateOwnerDto) {
    return this.prisma.owner.create({
      data: {
        type: dto.type, name: dto.name, email: dto.email, phone: dto.phone,
        address: dto.address, notes: dto.notes,
        ...(dto.userId && { userId: dto.userId }),
      },
      include: OWNER_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateOwnerDto) {
    await this.findById(id);
    return this.prisma.owner.update({ where: { id }, data: dto, include: OWNER_INCLUDE });
  }

  async softDelete(id: string) {
    await this.findById(id);
    return this.prisma.owner.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true, deletedAt: true } });
  }
}
