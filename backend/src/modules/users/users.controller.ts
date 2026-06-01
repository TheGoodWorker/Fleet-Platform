import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, UserFiltersDto } from './dto/create-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';
import { User } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth('JWT')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Liste des utilisateurs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query() filters: UserFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findAll(filters, page, limit, user);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail utilisateur' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.MANAGE_USERS)
  @ApiOperation({ summary: 'Créer un utilisateur' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.role);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Modifier un utilisateur' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Changer son mot de passe' })
  changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: User,
  ) {
    if (id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Non autorisé');
    }
    return this.service.changePassword(id, dto);
  }

  @Patch(':id/suspend')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.MANAGE_USERS)
  @ApiOperation({ summary: 'Suspendre un utilisateur' })
  suspend(@Param('id') id: string) {
    return this.service.suspend(id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.MANAGE_USERS)
  @ApiOperation({ summary: 'Réactiver un utilisateur' })
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermission(Perm.MANAGE_USERS)
  @ApiOperation({ summary: 'Supprimer (soft delete) un utilisateur' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.softDelete(id, user.id);
  }
}
