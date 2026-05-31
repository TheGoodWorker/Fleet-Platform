import { Controller, Get, Patch, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Mes notifications' })
  findMine(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.service.findForUser(user.id, page, limit, unreadOnly === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  countUnread(@CurrentUser() user: User) {
    return this.service.countUnread(user.id).then((count) => ({ count }));
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer comme lue' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Tout marquer comme lu' })
  markAllAsRead(@CurrentUser() user: User) {
    return this.service.markAllAsRead(user.id);
  }
}
