import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, RejectPaymentDto, PaymentFiltersDto } from './dto/payment.dto';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('payments')
@ApiBearerAuth('JWT')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les paiements (filtres optionnels — scopé par rôle)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query() filters: PaymentFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.service.findAll(filters, page, limit, user);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail d\'un paiement' })
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.RECORD_PAYMENT)
  @ApiOperation({ summary: 'Enregistrer un paiement manuel' })
  recordPayment(@Body() dto: CreatePaymentDto, @CurrentUser() user: User) {
    return this.service.recordPayment(dto, user);
  }

  @Patch(':id/reject')
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Rejeter un paiement (Super Manager / Admin)' })
  rejectPayment(
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.service.rejectPayment(id, dto, user);
  }
}
