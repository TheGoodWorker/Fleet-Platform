import { Controller, Get, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { LedgerService } from './ledger.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('ledger')
@ApiBearerAuth('JWT')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly service: LedgerService) {}

  @Get('contracts/:contractId')
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Grand livre par contrat' })
  findByContract(
    @Param('contractId') contractId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.service.findByContract(contractId, page, limit);
  }
}
