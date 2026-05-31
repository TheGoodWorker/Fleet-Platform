/**
 * H-13 — Module Tasks (stub)
 *
 * Le modèle `Task` existe en base (schéma Prisma) mais la logique métier
 * n'est pas encore implémentée (Phase 3+).
 *
 * Tous les endpoints retournent 501 Not Implemented pour signaler
 * explicitement aux clients Flutter que ce module est planifié.
 */

import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('tasks')
@ApiBearerAuth('JWT')
@Controller('tasks')
export class TasksController {
  @Get('status')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @ApiOperation({ summary: 'État du module — non implémenté (Phase 3+)' })
  @ApiResponse({ status: 501, description: 'Module Tasks prévu Phase 3+' })
  status() {
    return {
      module: 'tasks',
      status: 'not_implemented',
      plannedPhase: 'Phase 3+',
      message: 'Le module Tâches est planifié mais pas encore disponible.',
    };
  }
}
