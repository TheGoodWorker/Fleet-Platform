import {
  Controller, Get, Post, Delete, Body, Param, Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';
import { User } from '@prisma/client';

@ApiTags('permissions')
@ApiBearerAuth('JWT')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get()
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Liste toutes les permissions' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.service.findAll(page, limit);
  }

  @Get('module/:module')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Permissions par module' })
  findByModule(@Param('module') module: string) {
    return this.service.findByModule(module);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @RequirePermission(Perm.MANAGE_PERMISSIONS)
  @ApiOperation({ summary: 'Créer une permission (Admin)' })
  create(@Body() dto: CreatePermissionDto) {
    return this.service.create(dto);
  }

  @Get('roles/:role')
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Permissions d\'un rôle' })
  getRolePermissions(@Param('role') role: UserRole) {
    return this.service.getRolePermissions(role);
  }

  @Get('users/:userId/overrides')
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Overrides de permission d\'un utilisateur' })
  getUserOverrides(@Param('userId') userId: string) {
    return this.service.getUserOverrides(userId);
  }

  @Post('users/:userId/grant')
  @Roles(UserRole.ADMIN)
  @RequirePermission(Perm.GRANT_PERMISSION)
  @ApiOperation({ summary: 'Accorder ou révoquer une permission à un utilisateur (Admin)' })
  grantToUser(
    @Param('userId') targetUserId: string,
    @Body() dto: GrantPermissionDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.grantToUser(actor.id, targetUserId, dto);
  }

  @Delete('users/:userId/overrides/:permissionCode')
  @Roles(UserRole.ADMIN)
  @RequirePermission(Perm.REVOKE_PERMISSION)
  @ApiOperation({ summary: 'Supprimer un override de permission (Admin)' })
  removeOverride(
    @Param('userId') userId: string,
    @Param('permissionCode') permissionCode: string,
  ) {
    return this.service.removeOverride(userId, permissionCode);
  }
}
