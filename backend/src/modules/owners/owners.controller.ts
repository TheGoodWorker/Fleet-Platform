import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { OwnersService } from './owners.service';
import { CreateOwnerDto, UpdateOwnerDto } from './dto/owner.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('owners')
@ApiBearerAuth('JWT')
@Controller('owners')
export class OwnersController {
  constructor(private readonly service: OwnersService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Liste des propriétaires' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(page, limit, search, user);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail propriétaire' })
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Créer un propriétaire' })
  create(@Body() dto: CreateOwnerDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Modifier un propriétaire' })
  update(@Param('id') id: string, @Body() dto: UpdateOwnerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermission(Perm.MANAGE_USERS)
  @ApiOperation({ summary: 'Supprimer (soft delete) un propriétaire' })
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}
