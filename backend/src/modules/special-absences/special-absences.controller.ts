import {
  Controller, Get, Post, Param, Query, Body,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { SpecialAbsencesService } from './special-absences.service';
import {
  RequestSpecialAbsenceDto, ReviewAbsenceDto, SmValidateAbsenceDto,
  CloseAbsenceDto, SpecialAbsenceFiltersDto,
} from './dto/special-absence.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('special-absences')
@ApiBearerAuth('JWT')
@Controller('special-absences')
export class SpecialAbsencesController {
  constructor(private readonly service: SpecialAbsencesService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les absences spéciales (filtrées par chauffeur, contrat, statut)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query() filters: SpecialAbsenceFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findAll(filters, page, limit);
  }

  @Get(':id')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Détail d\'une absence spéciale' })
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user);
  }

  @Post()
  @Roles(UserRole.DRIVER)
  @RequirePermission(Perm.MANAGE_SPECIAL_ABSENCE)
  @ApiOperation({ summary: 'Soumettre une demande d\'absence spéciale (chauffeur)' })
  request(@Body() dto: RequestSpecialAbsenceDto, @CurrentUser() actor: User) {
    return this.service.request(dto, actor);
  }

  @Post(':id/review')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_SPECIAL_ABSENCE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manager examine la demande : approved (seul) | escalate (vers SM)' })
  managerReview(
    @Param('id') id: string,
    @Body() dto: ReviewAbsenceDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.managerReview(id, dto, actor);
  }

  @Post(':id/sm-validate')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.APPROVE_SPECIAL_ABSENCE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super Manager approuve ou rejette l\'absence escaladée' })
  smValidate(
    @Param('id') id: string,
    @Body() dto: SmValidateAbsenceDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.smValidate(id, dto, actor);
  }

  @Post(':id/cancel')
  @Roles(UserRole.DRIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler une demande d\'absence (chauffeur, avant approbation)' })
  cancel(@Param('id') id: string, @CurrentUser() actor: User) {
    return this.service.cancel(id, actor);
  }

  @Post(':id/close')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_SPECIAL_ABSENCE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clôturer une absence approuvée (fin effective)' })
  close(
    @Param('id') id: string,
    @Body() dto: CloseAbsenceDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.close(id, dto, actor);
  }
}
