import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole, VehicleStatus } from '@prisma/client';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto, AssignManagerDto, VehicleFiltersDto } from './dto/vehicle.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';
import { User } from '@prisma/client';

@ApiTags('vehicles')
@ApiBearerAuth('JWT')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly service: VehiclesService) {}

  @Get()
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Liste des véhicules (filtrée selon le rôle)' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: VehicleStatus })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query() filters: VehicleFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findAll(filters, page, limit, user);
  }

  @Get(':id')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Détail véhicule' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.CREATE_VEHICLE)
  @ApiOperation({ summary: 'Créer un véhicule' })
  create(@Body() dto: CreateVehicleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.EDIT_VEHICLE)
  @ApiOperation({ summary: 'Modifier un véhicule' })
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/assign-manager')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.ASSIGN_VEHICLE)
  @ApiOperation({ summary: 'Affecter un manager au véhicule' })
  assignManager(@Param('id') id: string, @Body() dto: AssignManagerDto) {
    return this.service.assignManager(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Changer le statut du véhicule' })
  updateStatus(@Param('id') id: string, @Query('status') status: VehicleStatus) {
    return this.service.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermission(Perm.DELETE_VEHICLE)
  @ApiOperation({ summary: 'Supprimer (soft delete) un véhicule' })
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}
