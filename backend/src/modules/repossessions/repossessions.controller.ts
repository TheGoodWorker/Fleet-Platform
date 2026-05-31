import {
  Controller, Get, Post, Param, Query, Body,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { RepossessionsService } from './repossessions.service';
import {
  CreateRepossessionDto, SmValidateRepossessionDto,
  AdminApproveRepossessionDto, RepossessionFiltersDto,
} from './dto/repossession.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('repossessions')
@ApiBearerAuth('JWT')
@Controller('repossessions')
export class RepossessionsController {
  constructor(private readonly service: RepossessionsService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les dossiers de reprise' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query() filters: RepossessionFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findAll(filters, page, limit);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail d\'un dossier de reprise' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /** R-14 : Étape 1 — Manager propose la reprise */
  @Post()
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.PROPOSE_REPOSSESSION)
  @ApiOperation({ summary: 'R-14 : Proposer une reprise de véhicule (Manager)' })
  propose(
    @Body() dto: CreateRepossessionDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.propose(dto, actor);
  }

  /** R-14 : Étape 2 — Super Manager valide */
  @Post(':id/sm-validate')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.VALIDATE_REPOSSESSION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'R-14 : Valider ou rejeter une reprise (Super Manager)' })
  smValidate(
    @Param('id') id: string,
    @Body() dto: SmValidateRepossessionDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.smValidate(id, dto, actor);
  }

  /** R-14 : Étape 3 — Admin approuve définitivement */
  @Post(':id/admin-approve')
  @Roles(UserRole.ADMIN)
  @RequirePermission(Perm.APPROVE_REPOSSESSION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'R-14 : Approuver la reprise (Admin) → vehicle REPOSSESSED + contract VEHICLE_REPOSSESSED',
  })
  adminApprove(
    @Param('id') id: string,
    @Body() dto: AdminApproveRepossessionDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.adminApprove(id, dto, actor);
  }
}
