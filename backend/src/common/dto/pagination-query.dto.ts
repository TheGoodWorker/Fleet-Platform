import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_PAGINATION_LIMIT } from '../interceptors/limit-cap.interceptor';

/**
 * Phase 8-D — Pagination commune
 *
 * Classe de base à étendre par tous les *FiltersDto* des endpoints de liste.
 * Sans ces champs, la `ValidationPipe` globale (`forbidNonWhitelisted: true`)
 * rejette `?page=1&limit=50` avec « property page should not exist » (400).
 *
 * Le cap réel de `limit` est appliqué en amont par {@link LimitCapInterceptor}
 * (MAX_PAGINATION_LIMIT). Le `@Max` ici n'est qu'un garde-fou cohérent et
 * documenté pour Swagger.
 *
 * `@Type(() => Number)` + `enableImplicitConversion` (global) transforment la
 * valeur string de la query en number avant validation.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, description: 'Numéro de page (1-indexé)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_PAGINATION_LIMIT,
    default: 20,
    description: `Nombre d'éléments par page (plafonné à ${MAX_PAGINATION_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGINATION_LIMIT)
  limit?: number;
}
