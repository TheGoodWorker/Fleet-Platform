/**
 * H-14 — LimitCapInterceptor
 *
 * Intercepteur global qui plafonne le paramètre de pagination `limit` à
 * MAX_PAGINATION_LIMIT (100) sur toutes les routes de l'application.
 *
 * Il s'exécute AVANT les pipes (ParseIntPipe) — il modifie la valeur brute
 * de `req.query.limit` pour que ParseIntPipe reçoive déjà une valeur capée.
 *
 * Pourquoi un intercepteur global plutôt que modifier les 23 contrôleurs ?
 *  - Un seul point de vérité.
 *  - Tous les futurs contrôleurs bénéficient du cap sans effort.
 *  - Pas de régression sur les routes existantes.
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

export const MAX_PAGINATION_LIMIT = 100;

@Injectable()
export class LimitCapInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<{ query?: Record<string, any> }>();

    if (request.query?.limit !== undefined) {
      const raw = request.query.limit;
      const parsed = typeof raw === 'number' ? raw : parseInt(String(raw), 10);

      if (!isNaN(parsed) && parsed > MAX_PAGINATION_LIMIT) {
        // Réinitialise en string pour que ParseIntPipe le retranstype normalement.
        request.query.limit = String(MAX_PAGINATION_LIMIT);
      }
    }

    return next.handle();
  }
}
