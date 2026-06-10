import {
  Controller, Get, Post, Param, Query, Body,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { ImmobilizationsService } from './immobilizations.service';
import {
  CreateImmobilizationDto, ReleaseImmobilizationDto, ImmobilizationFiltersDto,
} from './dto/immobilization.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('immobilizations')
@ApiBearerAuth('JWT')
@Controller('immobilizations')
export class ImmobilizationsController {
  constructor(private readonly service: ImmobilizationsService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les immobilisations (filtrées par véhicule, contrat, statut)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query() filters: ImmobilizationFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findAll(filters, page, limit, user);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail d\'une immobilisation' })
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_IMMOBILIZATION)
  @ApiOperation({ summary: 'Immobiliser un véhicule — notifie manager + chauffeur, enregistre événement disponibilité' })
  start(@Body() dto: CreateImmobilizationDto, @CurrentUser() actor: User) {
    return this.service.start(dto, actor);
  }

  @Post(':id/release')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_IMMOBILIZATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Libérer un véhicule immobilisé — résout l\'événement de disponibilité' })
  release(
    @Param('id') id: string,
    @Body() dto: ReleaseImmobilizationDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.release(id, dto, actor);
  }
}
