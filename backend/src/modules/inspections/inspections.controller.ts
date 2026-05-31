import {
  Controller, Get, Post, Param, Query, Body,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { InspectionsService } from './inspections.service';
import {
  CreateInspectionDto, SignInspectionDto, LinkReturnInspectionDto,
  AddInspectionItemDto, InspectionFiltersDto,
} from './dto/inspection.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('inspections')
@ApiBearerAuth('JWT')
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly service: InspectionsService) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les inspections (filtrés par véhicule, contrat, type, statut)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query() filters: InspectionFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findAll(filters, page, limit);
  }

  @Get(':id')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Détail d\'une inspection avec items, photos, transactions carburant' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/comparison')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Comparaison remise → retour (fuel delta, mileage delta, items dégradés)' })
  generateComparison(@Param('id') id: string) {
    return this.service.generateComparison(id);
  }

  // ─── Création ──────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.CREATE_INSPECTION)
  @ApiOperation({ summary: 'Créer une nouvelle inspection (HANDOVER, RETURN, REGULAR, INCIDENT…)' })
  create(@Body() dto: CreateInspectionDto, @CurrentUser() actor: User) {
    return this.service.create(dto, actor);
  }

  // ─── Items de checklist ────────────────────────────────────────────────────

  @Post(':id/add-item')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.CREATE_INSPECTION)
  @ApiOperation({ summary: 'Ajouter un item de checklist à une inspection non terminée' })
  addItem(
    @Param('id') id: string,
    @Body() dto: AddInspectionItemDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.addItem(id, dto, actor);
  }

  // ─── Signatures ────────────────────────────────────────────────────────────

  @Post(':id/driver-sign')
  @Roles(UserRole.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Signature chauffeur — passe l\'inspection en DRIVER_SIGNED' })
  driverSign(
    @Param('id') id: string,
    @Body() dto: SignInspectionDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.driverSign(id, dto, actor);
  }

  @Post(':id/manager-sign')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.SIGN_INSPECTION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Signature manager — complète l\'inspection (COMPLETED) et déclenche R-09 si retour avec carburant manquant' })
  managerSign(
    @Param('id') id: string,
    @Body() dto: SignInspectionDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.managerSign(id, dto, actor);
  }

  // ─── Lien retour → remise ──────────────────────────────────────────────────

  @Post(':id/link-return')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.CREATE_INSPECTION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lier une inspection de retour à son inspection de remise pour comparaison' })
  linkReturnToHandover(
    @Param('id') id: string,
    @Body() dto: LinkReturnInspectionDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.linkReturnToHandover(id, dto, actor);
  }
}
