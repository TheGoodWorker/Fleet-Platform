import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole, User } from '@prisma/client';
import { ChargesService } from './charges.service';
import {
  CreateChargeDto, ValidateChargeDto, RejectChargeDto,
  AddToContractDto, ChargeFiltersDto,
} from './dto/charge.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('charges')
@ApiBearerAuth('JWT')
@Controller('charges')
export class ChargesController {
  constructor(private readonly service: ChargesService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les charges' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query() filters: ChargeFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findAll(filters, page, limit, user);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail d\'une charge' })
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.CREATE_CHARGE)
  @ApiOperation({ summary: 'Créer une charge (statut DRAFT)' })
  create(@Body() dto: CreateChargeDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Post(':id/submit')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Soumettre une charge pour validation (DRAFT → PENDING_VALIDATION)' })
  submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.submit(id, user);
  }

  @Post(':id/validate')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.VALIDATE_CHARGE)
  @ApiOperation({ summary: 'Valider une charge (Super Manager / Admin)' })
  validate(
    @Param('id') id: string,
    @Body() dto: ValidateChargeDto,
    @CurrentUser() user: User,
  ) {
    return this.service.validate(id, dto, user);
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.VALIDATE_CHARGE)
  @ApiOperation({ summary: 'Rejeter une charge' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectChargeDto,
    @CurrentUser() user: User,
  ) {
    return this.service.reject(id, dto, user);
  }

  @Post(':id/add-to-contract')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.VALIDATE_CHARGE)
  @ApiOperation({ summary: 'Ajouter une charge validée au contrat (génère des DailyEntry)' })
  addToContract(
    @Param('id') id: string,
    @Body() dto: AddToContractDto,
    @CurrentUser() user: User,
  ) {
    return this.service.addToContract(id, dto, user);
  }
}
