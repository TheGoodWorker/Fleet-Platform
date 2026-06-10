import {
  Controller, Get, Post, Param, Query, Body,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { ContraventionsService } from './contraventions.service';
import {
  CreateContraventionDto, MarkPaidDto, ConvertToChargeDto, ContraventionFiltersDto,
} from './dto/contravention.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('contraventions')
@ApiBearerAuth('JWT')
@Controller('contraventions')
export class ContraventionsController {
  constructor(private readonly service: ContraventionsService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les contraventions (filtrables par véhicule, chauffeur, statut)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query() filters: ContraventionFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findAll(filters, page, limit, user);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail d\'une contravention' })
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_INCIDENT) // Réutilise le perm incidents — à affiner en Phase 4
  @ApiOperation({
    summary: 'Créer une contravention — D-12 : responsabilité toujours DRIVER',
  })
  create(
    @Body() dto: CreateContraventionDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.create(dto, actor);
  }

  @Post(':id/mark-paid')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marquer une contravention comme payée' })
  markPaid(
    @Param('id') id: string,
    @Body() dto: MarkPaidDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.markPaid(id, dto, actor);
  }

  @Post(':id/convert-to-charge')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Convertir une contravention en Charge — D-12 : type=FINE, responsible=DRIVER',
  })
  convertToCharge(
    @Param('id') id: string,
    @Body() dto: ConvertToChargeDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.convertToCharge(id, dto, actor);
  }
}
