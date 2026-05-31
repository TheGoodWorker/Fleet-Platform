import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { GrantPermissionDto } from './dto/grant-permission.dto';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Algorithme de résolution de permission ────────────────────────────────
  // Règle : UserPermissionOverride valide > RolePermission
  async checkPermission(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return false;

    // 1. Override individuel (prend toujours la priorité)
    const permission = await this.prisma.permission.findUnique({ where: { code } });
    if (!permission) {
      this.logger.warn(`Permission inconnue: ${code}`);
      return false;
    }

    const override = await this.prisma.userPermissionOverride.findUnique({
      where: { userId_permissionId: { userId, permissionId: permission.id } },
    });

    if (override) {
      if (override.expiresAt && override.expiresAt < new Date()) {
        // Override expiré — ignoré
      } else {
        return override.isGranted;
      }
    }

    // 2. Permission par défaut du rôle
    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: { role_permissionId: { role: user.role, permissionId: permission.id } },
    });

    return rolePermission?.isGranted ?? false;
  }

  // ─── CRUD Permissions ──────────────────────────────────────────────────────
  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.permission.findMany({
        skip,
        take: limit,
        orderBy: [{ module: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.permission.count(),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findByModule(module: string) {
    return this.prisma.permission.findMany({
      where: { module: module as any, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async create(dto: CreatePermissionDto) {
    const exists = await this.prisma.permission.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`Permission '${dto.code}' existe déjà`);

    return this.prisma.permission.create({ data: dto });
  }

  // ─── RolePermission ────────────────────────────────────────────────────────
  async getRolePermissions(role: UserRole) {
    return this.prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
      orderBy: { permission: { code: 'asc' } },
    });
  }

  async setRolePermission(role: UserRole, permissionId: string, isGranted: boolean) {
    return this.prisma.rolePermission.upsert({
      where: { role_permissionId: { role, permissionId } },
      update: { isGranted },
      create: { role, permissionId, isGranted },
    });
  }

  // ─── UserPermissionOverride ────────────────────────────────────────────────
  async grantToUser(actorId: string, targetUserId: string, dto: GrantPermissionDto) {
    const permission = await this.prisma.permission.findUnique({
      where: { code: dto.permissionCode },
    });
    if (!permission) throw new NotFoundException(`Permission '${dto.permissionCode}' introuvable`);

    this.logger.log(
      `Permission override: ${dto.isGranted ? 'GRANT' : 'REVOKE'} '${dto.permissionCode}' → user ${targetUserId} par ${actorId}`,
    );

    return this.prisma.userPermissionOverride.upsert({
      where: { userId_permissionId: { userId: targetUserId, permissionId: permission.id } },
      update: {
        isGranted: dto.isGranted,
        reason: dto.reason,
        grantedById: actorId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      create: {
        userId: targetUserId,
        permissionId: permission.id,
        isGranted: dto.isGranted,
        reason: dto.reason,
        grantedById: actorId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: { permission: true },
    });
  }

  async getUserOverrides(userId: string) {
    return this.prisma.userPermissionOverride.findMany({
      where: { userId },
      include: { permission: true },
    });
  }

  async removeOverride(userId: string, permissionCode: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode },
    });
    if (!permission) throw new NotFoundException(`Permission '${permissionCode}' introuvable`);

    return this.prisma.userPermissionOverride.delete({
      where: { userId_permissionId: { userId, permissionId: permission.id } },
    });
  }
}
