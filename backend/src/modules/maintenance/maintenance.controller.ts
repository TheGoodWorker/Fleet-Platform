import {
  Controller, Get, Post, Patch, Param, Query, Body,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { MaintenanceService } from './maintenance.service';
import {
  CreateMaintenanceDto, UpdateMaintenanceDto, CompleteMaintenanceDto,
  CreateMileageRecordDto, MaintenanceFiltersDto, MileageFiltersDto,
} from './dto/maintenance.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('maintenance')
@ApiBearerAuth('JWT')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  // ─── Maintenance — Lecture ─────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les maintenances (filtrées par véhicule, type, statut)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query() filters: MaintenanceFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findAll(filters, page, limit, user);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail d\'une maintenance' })
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user);
  }

  // ─── Maintenance — Création & cycle de vie ─────────────────────────────────

  @Post()
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_MAINTENANCE)
  @ApiOperation({ summary: 'Planifier une maintenance (préventive ou corrective)' })
  create(@Body() dto: CreateMaintenanceDto, @CurrentUser() actor: User) {
    return this.service.create(dto, actor);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_MAINTENANCE)
  @ApiOperation({ summary: 'Mettre à jour une maintenance planifiée (statut, garage, coût…)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Post(':id/complete')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_MAINTENANCE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marquer une maintenance comme complétée — met à jour le kilométrage véhicule' })
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteMaintenanceDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.complete(id, dto, actor);
  }

  @Post(':id/cancel')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_MAINTENANCE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler une maintenance planifiée ou en cours' })
  cancel(@Param('id') id: string, @CurrentUser() actor: User) {
    return this.service.cancel(id, actor);
  }

  // ─── Kilométrage ───────────────────────────────────────────────────────────

  @Get('mileage/records')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les relevés kilométriques (filtrés par véhicule, chauffeur, source)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findMileageRecords(
    @Query() filters: MileageFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findMileageRecords(filters, page, limit);
  }

  @Post('mileage/records')
  @Roles(UserRole.DRIVER)
  @RequirePermission(Perm.VALIDATE_MILEAGE)
  @ApiOperation({ summary: 'Enregistrer un relevé kilométrique (chauffeur photo tableau de bord, manager ou GPS)' })
  createMileageRecord(@Body() dto: CreateMileageRecordDto, @CurrentUser() actor: User) {
    return this.service.createMileageRecord(dto, actor);
  }

  @Post('mileage/records/:id/validate')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.VALIDATE_MILEAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valider un relevé kilométrique DRIVER — met à jour le kilométrage du véhicule' })
  validateMileageRecord(@Param('id') id: string, @CurrentUser() actor: User) {
    return this.service.validateMileageRecord(id, actor);
  }
}
