import {
  Controller, Get, Post, Param, Query,
  ParseIntPipe, DefaultValuePipe, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { AvailabilityService } from './availability.service';
import { AvailabilityFiltersDto, ResolveAvailabilityEventDto } from './dto/availability.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('availability')
@ApiBearerAuth('JWT')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les événements de disponibilité (filtrés par véhicule, type, actifs)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'active', required: false, description: 'true = non résolus uniquement' })
  findAll(
    @Query() filters: AvailabilityFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findAll(filters, page, limit, user);
  }

  @Get('vehicle/:vehicleId/active')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Récupérer l\'événement actif (non résolu) d\'un véhicule' })
  findActiveForVehicle(@Param('vehicleId') vehicleId: string, @CurrentUser() user: User) {
    return this.service.findActiveForVehicle(vehicleId, user);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail d\'un événement de disponibilité' })
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user);
  }

  @Post(':id/resolve')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Résoudre manuellement un événement de disponibilité' })
  resolveEvent(
    @Param('id') id: string,
    @Body() dto: ResolveAvailabilityEventDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.resolveEvent(id, dto, actor);
  }
}
