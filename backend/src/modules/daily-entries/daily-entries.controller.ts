import {
  Controller, Get, Param, Query,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { DailyEntriesService } from './daily-entries.service';
import { DailyEntryFiltersDto } from './dto/daily-entry.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('daily-entries')
@ApiBearerAuth('JWT')
@Controller('daily-entries')
export class DailyEntriesController {
  constructor(private readonly service: DailyEntriesService) {}

  @Get('contract/:contractId')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Lister les DailyEntry d\'un contrat' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findByContract(
    @Param('contractId') contractId: string,
    @Query() filters: DailyEntryFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(60), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findByContract(contractId, filters, page, limit, user);
  }

  @Get('contract/:contractId/progress')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Résumé de progression d\'un contrat OWNERSHIP_PROGRAM' })
  getProgressSummary(
    @Param('contractId') contractId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.getProgressSummary(contractId, user);
  }

  @Get('contract/:contractId/next-unpaid')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.RECORD_PAYMENT)
  @ApiOperation({ summary: 'Prochain jour non payé d\'un contrat' })
  getNextUnpaid(@Param('contractId') contractId: string) {
    return this.service.getNextUnpaidEntry(contractId);
  }
}
