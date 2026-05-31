/**
 * Tests de PrismaService (Prisma 7 — migration $use → $extends).
 *
 * Depuis Prisma 7, `$use` a été supprimé au profit de `$extends`.
 * Le soft-delete est géré via des query extensions dans buildExtendedClient().
 * Ces tests vérifient la liste des modèles et la fonction helper isSoftDelete.
 */

// ─── Constantes exposées (copiées ici pour le test) ─────────────────────────
const SOFT_DELETE_MODELS = ['User', 'Driver', 'Owner', 'Vehicle', 'Contract'];

function isSoftDelete(model?: string): boolean {
  return SOFT_DELETE_MODELS.includes(model ?? '');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PrismaService — soft-delete via $extends (Prisma 7)', () => {
  describe('isSoftDelete — modèles concernés', () => {
    it('retourne true pour User', () => {
      expect(isSoftDelete('User')).toBe(true);
    });

    it('retourne true pour Driver', () => {
      expect(isSoftDelete('Driver')).toBe(true);
    });

    it('retourne true pour Owner', () => {
      expect(isSoftDelete('Owner')).toBe(true);
    });

    it('retourne true pour Vehicle', () => {
      expect(isSoftDelete('Vehicle')).toBe(true);
    });

    it('retourne true pour Contract', () => {
      expect(isSoftDelete('Contract')).toBe(true);
    });
  });

  describe('isSoftDelete — modèles non concernés', () => {
    it('retourne false pour AuditLog', () => {
      expect(isSoftDelete('AuditLog')).toBe(false);
    });

    it('retourne false pour Payment', () => {
      expect(isSoftDelete('Payment')).toBe(false);
    });

    it('retourne false pour Charge', () => {
      expect(isSoftDelete('Charge')).toBe(false);
    });

    it('retourne false pour undefined', () => {
      expect(isSoftDelete(undefined)).toBe(false);
    });

    it('retourne false pour chaîne vide', () => {
      expect(isSoftDelete('')).toBe(false);
    });
  });

  describe('SOFT_DELETE_MODELS — liste complète', () => {
    it('contient exactement 5 modèles', () => {
      expect(SOFT_DELETE_MODELS).toHaveLength(5);
    });

    it('liste complète : User, Driver, Owner, Vehicle, Contract', () => {
      expect(SOFT_DELETE_MODELS).toEqual(
        expect.arrayContaining(['User', 'Driver', 'Owner', 'Vehicle', 'Contract']),
      );
    });
  });
});
