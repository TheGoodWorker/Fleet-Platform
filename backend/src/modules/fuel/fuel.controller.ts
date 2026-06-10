import {
  Controller, Get, Post, Param, Query, Body,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { FuelService } from './fuel.service';
import { CreateFuelTransactionDto, ValidateFuelTransactionDto, FuelFiltersDto } from './dto/fuel.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('fuel')
@ApiBearerAuth('JWT')
@Controller('fuel')
export class FuelController {
  constructor(private readonly service: FuelService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les transactions carburant (filtrées par véhicule, contrat, type)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'unvalidatedOnly', required: false, description: 'true = non validées uniquement' })
  findAll(
    @Query() filters: FuelFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findAll(filters, page, limit, user);
  }

  @Get('vehicle/:vehicleId/history')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Historique carburant d\'un véhicule avec résumé dernier delta' })
  getVehicleFuelHistory(
    @Param('vehicleId') vehicleId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.getVehicleFuelHistory(vehicleId, limit, user);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail d\'une transaction carburant' })
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.RECORD_FUEL)
  @ApiOperation({
    summary: 'Enregistrer une transaction carburant (R-08: INITIAL_FULL_TANK obligatoire à remise)',
  })
  record(@Body() dto: CreateFuelTransactionDto, @CurrentUser() actor: User) {
    return this.service.record(dto, actor);
  }

  @Post(':id/validate')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.VALIDATE_MILEAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valider (et éventuellement corriger) une transaction carburant' })
  validate(
    @Param('id') id: string,
    @Body() dto: ValidateFuelTransactionDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.validate(id, dto, actor);
  }
}
