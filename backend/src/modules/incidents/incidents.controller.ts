import {
  Controller, Get, Post, Patch, Param, Query, Body,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { IncidentsService } from './incidents.service';
import {
  CreateIncidentDto, UpdateIncidentDto, ResolveIncidentDto, IncidentFiltersDto,
} from './dto/incident.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('incidents')
@ApiBearerAuth('JWT')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly service: IncidentsService) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les incidents (filtrés par véhicule, chauffeur, type, statut, sévérité)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query() filters: IncidentFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findAll(filters, page, limit, user);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail d\'un incident avec dossier accident, charges, immobilisations' })
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user);
  }

  // ─── Création & mise à jour ────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.CREATE_INCIDENT)
  @ApiOperation({ summary: 'Déclarer un nouvel incident (panne, accident, autre)' })
  create(@Body() dto: CreateIncidentDto, @CurrentUser() actor: User) {
    return this.service.create(dto, actor);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_INCIDENT)
  @ApiOperation({ summary: 'Modifier les notes / sévérité / manager d\'un incident non clôturé' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.update(id, dto, actor);
  }

  // ─── Transitions de statut ─────────────────────────────────────────────────

  @Post(':id/in-progress')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_INCIDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Passer l\'incident en IN_PROGRESS (prise en charge)' })
  markInProgress(@Param('id') id: string, @CurrentUser() actor: User) {
    return this.service.markInProgress(id, actor);
  }

  @Post(':id/resolve')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_INCIDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marquer l\'incident comme RESOLVED (traitement terminé)' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveIncidentDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.resolve(id, dto, actor);
  }

  @Post(':id/close')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.MANAGE_INCIDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clôturer définitivement un incident résolu (SUPER_MANAGER uniquement)' })
  close(@Param('id') id: string, @CurrentUser() actor: User) {
    return this.service.close(id, actor);
  }
}
