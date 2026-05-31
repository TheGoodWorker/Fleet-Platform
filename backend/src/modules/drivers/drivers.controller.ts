import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole, DriverStatus } from '@prisma/client';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto, DriverFiltersDto, ValidateFieldDto } from './dto/driver.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('drivers')
@ApiBearerAuth('JWT')
@Controller('drivers')
export class DriversController {
  constructor(private readonly service: DriversService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Liste des chauffeurs' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: DriverStatus }) @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query() filters: DriverFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findAll(filters, page, limit);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail chauffeur' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.CREATE_DRIVER)
  @ApiOperation({ summary: 'Créer un profil chauffeur (à partir d\'un User existant)' })
  create(@Body() dto: CreateDriverDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Modifier les infos d\'un chauffeur' })
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Changer le statut d\'un chauffeur' })
  updateStatus(@Param('id') id: string, @Query('status') status: DriverStatus) {
    return this.service.updateStatus(id, status);
  }

  // ─── Gap 5 : Validation KYC ────────────────────────────────────────────────

  /**
   * POST /drivers/:id/validate-kyc
   *
   * Valide le KYC d'un chauffeur.
   * - Marque tous les champs DriverKYC vérifiés
   * - Passe driver.status PENDING_KYC → PENDING_FIELD_VALIDATION
   * - Propage kycValidated=true sur les contrats DRAFT/PENDING_APPROVAL du chauffeur
   *
   * Rôle requis : SUPER_MANAGER + permission can_validate_kyc
   */
  @Post(':id/validate-kyc')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.VALIDATE_KYC)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Valider le KYC d\'un chauffeur (PENDING_KYC → PENDING_FIELD_VALIDATION)' })
  validateKyc(
    @Param('id') id: string,
    @CurrentUser() actor: User,
  ): Promise<void> {
    return this.service.validateKyc(id, actor.id);
  }

  // ─── Gap 5 : Validation terrain ────────────────────────────────────────────

  /**
   * POST /drivers/:id/validate-field
   *
   * Valide la visite terrain d'un chauffeur.
   * - Met à jour DriverFieldValidation (status=VALIDATED, homeVisitDone=true)
   * - Passe driver.status PENDING_FIELD_VALIDATION → APPROVED
   * - Propage fieldValidated=true sur les contrats DRAFT/PENDING_APPROVAL du chauffeur
   *
   * Rôle requis : MANAGER + permission can_validate_field
   */
  @Post(':id/validate-field')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.VALIDATE_FIELD)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Valider la visite terrain d\'un chauffeur (PENDING_FIELD_VALIDATION → APPROVED)' })
  validateField(
    @Param('id') id: string,
    @Body() dto: ValidateFieldDto,
    @CurrentUser() actor: User,
  ): Promise<void> {
    return this.service.validateField(id, actor.id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermission(Perm.MANAGE_USERS)
  @ApiOperation({ summary: 'Désactiver (soft delete) un chauffeur' })
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}
