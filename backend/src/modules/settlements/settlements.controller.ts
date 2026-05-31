/**
 * H-13 — Module Settlements (stub)
 *
 * Le modèle `MonthlySettlement` existe en base (schéma Prisma) et est utilisé
 * via le module OwnerPortal pour les relevés. La génération automatisée
 * des settlements n'est pas encore implémentée (Phase 3+).
 *
 * Tous les endpoints retournent 501 Not Implemented pour signaler
 * explicitement aux clients Flutter que ce module est planifié.
 */

import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('settlements')
@ApiBearerAuth('JWT')
@Controller('settlements')
export class SettlementsController {
  @Get('status')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @ApiOperation({ summary: 'État du module — non implémenté (Phase 3+)' })
  @ApiResponse({ status: 501, description: 'Module Settlements prévu Phase 3+' })
  status() {
    return {
      module: 'settlements',
      status: 'not_implemented',
      plannedPhase: 'Phase 3+',
      message: 'La génération automatique des relevés mensuels est planifiée mais pas encore disponible.',
    };
  }
}
