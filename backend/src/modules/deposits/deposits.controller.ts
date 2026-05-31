import {
  Controller, Get, Post, Param, Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, User } from '@prisma/client';
import { DepositsService } from './deposits.service';
import {
  CreateDepositDto, RecordDepositPaymentDto, AdminValidateDepositDto,
  UseDepositDto, RefundDepositDto,
} from './dto/deposit.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('deposits')
@ApiBearerAuth('JWT')
@Controller('deposits')
export class DepositsController {
  constructor(private readonly service: DepositsService) {}

  @Get('contract/:contractId')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Caution d\'un contrat' })
  findByContract(@Param('contractId') contractId: string) {
    return this.service.findByContract(contractId);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail d\'une caution' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.VALIDATE_DEPOSIT)
  @ApiOperation({ summary: 'Créer une caution (Super Manager propose le montant)' })
  create(@Body() dto: CreateDepositDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Post(':id/admin-validate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin valide un montant de caution hors-barème (D-13)' })
  adminValidate(
    @Param('id') id: string,
    @Body() dto: AdminValidateDepositDto,
    @CurrentUser() user: User,
  ) {
    return this.service.adminValidate(id, dto, user);
  }

  @Post(':id/pay')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.VALIDATE_DEPOSIT)
  @ApiOperation({ summary: 'Enregistrer un paiement de caution (total ou partiel)' })
  recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordDepositPaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.service.recordPayment(id, dto, user);
  }

  @Post(':id/use')
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Utiliser tout ou partie de la caution (R-07 : justification obligatoire)' })
  useDeposit(
    @Param('id') id: string,
    @Body() dto: UseDepositDto,
    @CurrentUser() user: User,
  ) {
    return this.service.useDeposit(id, dto, user);
  }

  @Post(':id/refund')
  @Roles(UserRole.SUPER_MANAGER)
  @ApiOperation({ summary: 'Rembourser la caution (uniquement après COMPLETED ou TERMINATED — R-06)' })
  refund(
    @Param('id') id: string,
    @Body() dto: RefundDepositDto,
    @CurrentUser() user: User,
  ) {
    return this.service.refund(id, dto, user);
  }
}
