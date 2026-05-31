/**
 * H-14 — LimitCapInterceptor
 *
 * Vérifie que :
 * - limit > 100 est réduit à 100
 * - limit <= 100 passe sans modification
 * - limit absent passe sans modification
 * - limit = 0 ou négatif passe sans modification (ParseIntPipe gère ça)
 * - limit en nombre (après ParseIntPipe) est aussi capé
 */

import { LimitCapInterceptor, MAX_PAGINATION_LIMIT } from './limit-cap.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

function buildContext(query: Record<string, any> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ query }),
    }),
  } as any;
}

const next: CallHandler = { handle: () => of(null) };

describe('LimitCapInterceptor — H-14', () => {
  let interceptor: LimitCapInterceptor;

  beforeEach(() => {
    interceptor = new LimitCapInterceptor();
  });

  it(`plafonne limit=${MAX_PAGINATION_LIMIT + 1} à ${MAX_PAGINATION_LIMIT}`, () => {
    const query = { limit: String(MAX_PAGINATION_LIMIT + 1) };
    interceptor.intercept(buildContext(query), next);
    expect(query.limit).toBe(String(MAX_PAGINATION_LIMIT));
  });

  it('plafonne limit=999999 à 100', () => {
    const query = { limit: '999999' };
    interceptor.intercept(buildContext(query), next);
    expect(query.limit).toBe('100');
  });

  it('ne modifie pas limit=50 (inférieur au cap)', () => {
    const query = { limit: '50' };
    interceptor.intercept(buildContext(query), next);
    expect(query.limit).toBe('50');
  });

  it('ne modifie pas limit=100 (égal au cap)', () => {
    const query = { limit: '100' };
    interceptor.intercept(buildContext(query), next);
    expect(query.limit).toBe('100');
  });

  it('ne modifie pas une requête sans paramètre limit', () => {
    const query = { page: '1' };
    interceptor.intercept(buildContext(query), next);
    expect(query).toEqual({ page: '1' });
  });

  it('plafonne limit numérique (déjà parsé) > 100', () => {
    const query: Record<string, any> = { limit: 500 };
    interceptor.intercept(buildContext(query), next);
    expect(query.limit).toBe('100');
  });

  it('ne modifie pas limit=0 (laisse ParseIntPipe valider)', () => {
    const query = { limit: '0' };
    interceptor.intercept(buildContext(query), next);
    expect(query.limit).toBe('0');
  });
});
