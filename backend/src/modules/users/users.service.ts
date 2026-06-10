import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, UserFiltersDto } from './dto/create-user.dto';
import { ConfigService } from '@nestjs/config';

const USER_SELECT = {
  id: true, email: true, phone: true, firstName: true, lastName: true,
  role: true, status: true, avatarUrl: true, lastLoginAt: true, createdAt: true, updatedAt: true,
  driver: { select: { id: true, status: true } },
  owner: { select: { id: true, type: true } },
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async findAll(filters: UserFiltersDto, page = 1, limit = 20, requestingUser: User) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.role) where.role = filters.role;
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // H-05 : MANAGER ne voit que les chauffeurs liés à ses contrats.
    // La requête précédente filtre uniquement role=DRIVER sans restriction manager,
    // exposant les chauffeurs d'autres managers — corrigé ici.
    if (requestingUser.role === UserRole.MANAGER) {
      where.role = UserRole.DRIVER;
      where.driver = {
        contracts: {
          some: { managerId: requestingUser.id },
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take: limit, select: USER_SELECT, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const user = await this.prisma.user.findFirst({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException(`Utilisateur ${id} introuvable`);

    // H-05 / IDOR — MANAGER : lui-même ou les chauffeurs liés à ses contrats
    if (requestingUser?.role === UserRole.MANAGER && id !== requestingUser.id) {
      const inScope = await this.prisma.user.findFirst({
        where: {
          id,
          role: UserRole.DRIVER,
          driver: { contracts: { some: { managerId: requestingUser.id } } },
        },
        select: { id: true },
      });
      if (!inScope) {
        throw new ForbiddenException('Accès refusé — cet utilisateur est hors de votre périmètre');
      }
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email } });
  }

  async create(dto: CreateUserDto, creatorRole: UserRole) {
    // Seul Admin peut créer un Admin ou Super Manager
    if (
      ([UserRole.ADMIN, UserRole.SUPER_MANAGER] as UserRole[]).includes(dto.role) &&
      creatorRole !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Seul un Admin peut créer un compte Admin ou Super Manager');
    }

    if (dto.email) {
      const exists = await this.prisma.user.findFirst({ where: { email: dto.email } });
      if (exists) throw new ConflictException('Email déjà utilisé');
    }
    if (dto.phone) {
      const exists = await this.prisma.user.findFirst({ where: { phone: dto.phone } });
      if (exists) throw new ConflictException('Téléphone déjà utilisé');
    }

    const rounds = this.configService.get<number>('app.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    return this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        passwordHash,
      },
      select: USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto, requestingUser?: User) {
    // Le scoping MANAGER (lui-même ou ses chauffeurs H-05) est appliqué par findById
    await this.findById(id, requestingUser);
    return this.prisma.user.update({ where: { id }, data: dto, select: USER_SELECT });
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { id } });
    if (!user) throw new NotFoundException(`Utilisateur ${id} introuvable`);

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new ForbiddenException('Mot de passe actuel incorrect');

    const rounds = this.configService.get<number>('app.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.newPassword, rounds);

    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: 'Mot de passe mis à jour' };
  }

  async softDelete(id: string, requesterId: string) {
    if (id === requesterId) throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte');
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DELETED' },
      select: { id: true, deletedAt: true },
    });
  }

  async suspend(id: string) {
    await this.findById(id);
    return this.prisma.user.update({ where: { id }, data: { status: 'SUSPENDED' }, select: USER_SELECT });
  }

  async activate(id: string) {
    await this.findById(id);
    return this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' }, select: USER_SELECT });
  }
}
