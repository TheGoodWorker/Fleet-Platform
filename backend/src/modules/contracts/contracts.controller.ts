import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { UserRole, User } from '@prisma/client';
import { ContractsService } from './contracts.service';
import { CreateContractDto, UpdateContractDto, ContractFiltersDto } from './dto/contract.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SuspendContractDto {
  @ApiProperty({ description: 'Motif de suspension' }) @IsString() reason: string;
}

@ApiTags('contracts')
@ApiBearerAuth('JWT')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Liste des contrats (filtrée selon le rôle)' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query() filters: ContractFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findAll(filters, page, limit, user);
  }

  @Get(':id')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Détail contrat' })
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.CREATE_CONTRACT)
  @ApiOperation({ summary: 'Créer un contrat (statut DRAFT)' })
  create(@Body() dto: CreateContractDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Modifier un contrat (DRAFT uniquement)' })
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Supprimer un contrat (DRAFT uniquement)' })
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }

  // ─── Actions métier ────────────────────────────────────────────────────────

  @Post(':id/activate')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.ACTIVATE_CONTRACT)
  @ApiOperation({ summary: 'Activer un contrat — vérifie la checklist complète (R-05, D-04)' })
  activate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.activate(id, user);
  }

  @Post(':id/suspend')
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Suspendre un contrat ACTIVE' })
  suspend(
    @Param('id') id: string,
    @Body() dto: SuspendContractDto,
    @CurrentUser() user: User,
  ) {
    return this.service.suspend(id, dto.reason, user);
  }

  @Post(':id/close')
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Clôturer un contrat (ACTIVE ou SUSPENDED)' })
  close(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.close(id, user);
  }
}
