import {
  Controller, Get, Post, Patch, Param, Query, Body,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { OwnerPortalService } from './owner-portal.service';
import {
  UpdateVisibilitySettingsDto, RecordRentalPaymentDto,
  UpdateRentalPaymentStatusDto, RentalPaymentFiltersDto,
} from './dto/owner-portal.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('owner-portal')
@ApiBearerAuth('JWT')
@Controller('owner-portal')
export class OwnerPortalController {
  constructor(private readonly service: OwnerPortalService) {}

  // ─── Paramètres de visibilité ──────────────────────────────────────────────

  @Get('contracts/:contractId/visibility')
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Lire les paramètres de visibilité du portail propriétaire' })
  getVisibilitySettings(@Param('contractId') contractId: string) {
    return this.service.getVisibilitySettings(contractId);
  }

  @Patch('contracts/:contractId/visibility')
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.CONFIGURE_OWNER_VISIBILITY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configurer les paramètres de visibilité (D-16 : SIMPLE_RENTAL interdit pour flags financiers chauffeur)',
  })
  upsertVisibilitySettings(
    @Param('contractId') contractId: string,
    @Body() dto: UpdateVisibilitySettingsDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.upsertVisibilitySettings(contractId, dto, actor);
  }

  // ─── Dashboard propriétaire ────────────────────────────────────────────────

  @Get('contracts/:contractId/dashboard')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.VIEW_OWNER_PORTAL)
  @ApiOperation({ summary: 'Tableau de bord propriétaire (filtré par paramètres de visibilité)' })
  getDashboard(
    @Param('contractId') contractId: string,
    @CurrentUser() actor: User,
  ) {
    return this.service.getDashboard(contractId, actor.id);
  }

  // ─── Résumé financier par période ─────────────────────────────────────────

  @Get('contracts/:contractId/financial-summary')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.VIEW_OWNER_PORTAL)
  @ApiOperation({ summary: 'Résumé financier mensuel SIMPLE_RENTAL pour un propriétaire' })
  @ApiQuery({ name: 'year', required: true, description: 'Année ex: 2026' })
  @ApiQuery({ name: 'month', required: true, description: 'Mois 1-12' })
  getFinancialSummary(
    @Param('contractId') contractId: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.service.getFinancialSummary(contractId, year, month);
  }

  // ─── Versements SIMPLE_RENTAL ──────────────────────────────────────────────

  @Get('rental-payments')
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Lister les versements propriétaire (paginés, filtrables)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findRentalPayments(
    @Query() filters: RentalPaymentFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findRentalPayments(filters, page, limit);
  }

  @Post('rental-payments')
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.RECORD_OWNER_PAYMENT)
  @ApiOperation({ summary: 'Enregistrer un versement mensuel propriétaire (SIMPLE_RENTAL)' })
  recordRentalPayment(
    @Body() dto: RecordRentalPaymentDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.recordRentalPayment(dto, actor);
  }

  @Patch('rental-payments/:id/status')
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.RECORD_OWNER_PAYMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mettre à jour le statut d\'un versement propriétaire (PENDING → PAID / LATE)' })
  updateRentalPaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRentalPaymentStatusDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.updateRentalPaymentStatus(id, dto, actor);
  }
}
