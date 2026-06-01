/**
 * G-03 — MediaController : ordre des routes GET
 *
 * Vérifie que :
 * - GET /photo-missions est enregistré AVANT GET /:id
 * - GET /photo-missions/:id est enregistré AVANT GET /:id
 * - GET /:id/url est enregistré AVANT GET /:id
 *
 * Méthode : inspection des métadonnées NestJS (Reflect.getMetadata)
 * pour vérifier l'ordre de déclaration des routes dans la classe.
 */

import 'reflect-metadata';
import { Get } from '@nestjs/common';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { MediaController } from './media.controller';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Renvoie les noms de méthodes du contrôleur dans leur ordre de déclaration,
 *  avec leur path et méthode HTTP, filtrés sur GET uniquement. */
function getGetRouteOrder(controllerClass: any): Array<{ method: string; path: string }> {
  const proto = controllerClass.prototype;
  return Object.getOwnPropertyNames(proto)
    .filter((name) => name !== 'constructor')
    .filter((name) => {
      const httpMethod = Reflect.getMetadata(METHOD_METADATA, proto[name]);
      return httpMethod === RequestMethod.GET;
    })
    .map((name) => ({
      method: name,
      path: Reflect.getMetadata(PATH_METADATA, proto[name]) ?? '',
    }));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MediaController — G-03 (ordre routes GET)', () => {
  let routes: Array<{ method: string; path: string }>;

  beforeAll(() => {
    routes = getGetRouteOrder(MediaController);
  });

  it('déclare au moins 5 routes GET', () => {
    expect(routes.length).toBeGreaterThanOrEqual(5);
  });

  it('GET photo-missions est déclaré AVANT GET :id', () => {
    const idxPhotoMissions = routes.findIndex((r) => r.path === 'photo-missions');
    const idxId = routes.findIndex((r) => r.path === ':id');

    expect(idxPhotoMissions).toBeGreaterThanOrEqual(0); // route existe
    expect(idxId).toBeGreaterThanOrEqual(0);            // route existe
    expect(idxPhotoMissions).toBeLessThan(idxId);       // ordre correct
  });

  it('GET photo-missions/:id est déclaré AVANT GET :id', () => {
    const idxPhotoMissionsParam = routes.findIndex((r) => r.path === 'photo-missions/:id');
    const idxId = routes.findIndex((r) => r.path === ':id');

    expect(idxPhotoMissionsParam).toBeGreaterThanOrEqual(0);
    expect(idxId).toBeGreaterThanOrEqual(0);
    expect(idxPhotoMissionsParam).toBeLessThan(idxId);
  });

  it('GET :id/url est déclaré AVANT GET :id', () => {
    const idxUrl = routes.findIndex((r) => r.path === ':id/url');
    const idxId = routes.findIndex((r) => r.path === ':id');

    expect(idxUrl).toBeGreaterThanOrEqual(0);
    expect(idxId).toBeGreaterThanOrEqual(0);
    expect(idxUrl).toBeLessThan(idxId);
  });

  it('snapshot de l\'ordre des routes GET pour régression', () => {
    const paths = routes.map((r) => r.path);
    // photo-missions, photo-missions/:id, :id/url, :id, '' (ou vide pour liste)
    const photoMissionsIdx = paths.indexOf('photo-missions');
    const photoMissionsParamIdx = paths.indexOf('photo-missions/:id');
    const urlIdx = paths.indexOf(':id/url');
    const idIdx = paths.indexOf(':id');

    // Toutes les routes spécifiques sont avant :id
    expect(photoMissionsIdx).toBeLessThan(idIdx);
    expect(photoMissionsParamIdx).toBeLessThan(idIdx);
    expect(urlIdx).toBeLessThan(idIdx);
  });
});
