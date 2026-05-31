import {
  Controller, Get, Post, Param, Query, Body,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { AccidentsService } from './accidents.service';
import {
  CreateAccidentCaseDto, AdvanceStepDto, AddExpenseDto,
  ValidateExpenseDto, CloseAccidentCaseDto, AccidentFiltersDto,
} from './dto/accident.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('accidents')
@ApiBearerAuth('JWT')
@Controller('accidents')
export class AccidentsController {
  constructor(private readonly service: AccidentsService) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les dossiers accident (filtrés par véhicule, statut, étape courante)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query() filters: AccidentFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findAll(filters, page, limit);
  }

  @Get('by-incident/:incidentId')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Trouver le dossier accident d\'un incident' })
  findByIncident(@Param('incidentId') incidentId: string) {
    return this.service.findByIncident(incidentId);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail d\'un dossier accident (historique étapes + dépenses)' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  // ─── Création ──────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.CREATE_ACCIDENT)
  @ApiOperation({ summary: 'Ouvrir un dossier accident depuis un incident de type ACCIDENT' })
  create(@Body() dto: CreateAccidentCaseDto, @CurrentUser() actor: User) {
    return this.service.create(dto, actor);
  }

  // ─── Workflow 14 étapes ────────────────────────────────────────────────────

  @Post(':id/advance-step')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.ADVANCE_ACCIDENT_STEP)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Avancer le dossier accident à l\'étape suivante (ordre strict)' })
  advanceStep(
    @Param('id') id: string,
    @Body() dto: AdvanceStepDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.advanceStep(id, dto, actor);
  }

  // ─── Dépenses ──────────────────────────────────────────────────────────────

  @Post(':id/expenses')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.ADVANCE_ACCIDENT_STEP)
  @ApiOperation({ summary: 'Ajouter une dépense au dossier accident (remorquage, transport, frais de dossier…)' })
  addExpense(
    @Param('id') id: string,
    @Body() dto: AddExpenseDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.addExpense(id, dto, actor);
  }

  @Post(':id/expenses/:expenseId/validate')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.VALIDATE_ACCIDENT_EXPENSE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valider ou rejeter une dépense accident (SUPER_MANAGER uniquement)' })
  validateExpense(
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: ValidateExpenseDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.validateExpense(id, expenseId, dto, actor);
  }

  /** R-13 : Validation Super Manager pour dépenses dépassant le seuil ACCIDENT_EXPENSE_SM_THRESHOLD */
  @Post(':id/expenses/:expenseId/sm-validate')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.VALIDATE_ACCIDENT_EXPENSE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'R-13 : Valider une dépense ≥ seuil (Super Manager obligatoire)' })
  smValidateExpense(
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
    @CurrentUser() actor: User,
  ) {
    return this.service.smValidateExpense(id, expenseId, actor);
  }

  // ─── Clôture ───────────────────────────────────────────────────────────────

  @Post(':id/close')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.ADVANCE_ACCIDENT_STEP)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clôturer le dossier accident (CLOSED ou DISPUTED — SUPER_MANAGER uniquement)' })
  close(
    @Param('id') id: string,
    @Body() dto: CloseAccidentCaseDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.close(id, dto, actor);
  }
}
