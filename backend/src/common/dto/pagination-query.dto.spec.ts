/**
 * Phase 8-D — Régression pagination
 *
 * Reproduit exactement ce que fait NestJS lorsqu'un contrôleur déclare
 * `@Query() filters: XxxFiltersDto` : la query brute est passée à la
 * `ValidationPipe` globale configurée comme dans `main.ts`
 * (whitelist + forbidNonWhitelisted + transform + enableImplicitConversion).
 *
 * Avant le fix, `?page=1&limit=50` levait une BadRequestException
 * « property page should not exist » / « property limit should not exist ».
 * Ces tests garantissent que les 5 endpoints de liste acceptent désormais
 * page/limit, les transforment en number, tout en conservant le rejet des
 * propriétés inconnues.
 */

import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';

import { VehicleFiltersDto } from '../../modules/vehicles/dto/vehicle.dto';
import { DriverFiltersDto } from '../../modules/drivers/dto/driver.dto';
import { ContractFiltersDto } from '../../modules/contracts/dto/contract.dto';
import { PaymentFiltersDto } from '../../modules/payments/dto/payment.dto';
import { DocumentFiltersDto } from '../../modules/documents/dto/document.dto';
import { MAX_PAGINATION_LIMIT } from '../interceptors/limit-cap.interceptor';

// Réplique stricte de la config de main.ts
const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: true },
});

const meta = (metatype: any): ArgumentMetadata => ({
  type: 'query',
  metatype,
  data: '',
});

// Les query params arrivent toujours en string côté HTTP
const listDtos: Array<[string, any]> = [
  ['VehicleFiltersDto', VehicleFiltersDto],
  ['DriverFiltersDto', DriverFiltersDto],
  ['ContractFiltersDto', ContractFiltersDto],
  ['PaymentFiltersDto', PaymentFiltersDto],
  ['DocumentFiltersDto', DocumentFiltersDto],
];

describe('Phase 8-D — pagination sur les endpoints de liste', () => {
  describe.each(listDtos)('%s', (_name, dto) => {
    it('accepte ?page=1&limit=50 sans lever (régression)', async () => {
      const result = await pipe.transform({ page: '1', limit: '50' }, meta(dto));
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('transforme page/limit string → number', async () => {
      const result = await pipe.transform({ page: '3', limit: '20' }, meta(dto));
      expect(typeof result.page).toBe('number');
      expect(typeof result.limit).toBe('number');
    });

    it('accepte une query vide (pagination optionnelle)', async () => {
      const result = await pipe.transform({}, meta(dto));
      expect(result.page).toBeUndefined();
      expect(result.limit).toBeUndefined();
    });

    it('rejette toujours une propriété inconnue (whitelist active)', async () => {
      await expect(
        pipe.transform({ page: '1', bogusField: 'x' }, meta(dto)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette page=0 (Min=1)', async () => {
      await expect(
        pipe.transform({ page: '0' }, meta(dto)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it(`rejette limit au-delà de ${MAX_PAGINATION_LIMIT} (Max)`, async () => {
      await expect(
        pipe.transform({ limit: String(MAX_PAGINATION_LIMIT + 1) }, meta(dto)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
