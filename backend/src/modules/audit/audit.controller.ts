import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('audit')
@ApiBearerAuth('JWT')
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.VIEW_AUDIT_LOGS)
  @ApiOperation({ summary: "Journal d'audit (immuable)" })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
  ) {
    return this.service.findAll(page, limit, { entityType, entityId, actorId, action });
  }
}
