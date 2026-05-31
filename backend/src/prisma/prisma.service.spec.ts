import { PrismaService } from './prisma.service';

/**
 * Tests du middleware soft-delete de PrismaService.
 * On intercepte $use pour capturer les paramètres modifiés sans connexion réelle à la DB.
 */
describe('PrismaService — middleware soft-delete', () => {
  let service: PrismaService;

  // Simule le middleware en l'appelant directement avec des params de test
  let capturedMiddleware: (params: any, next: any) => Promise<any>;

  beforeEach(() => {
    service = new PrismaService();

    // Récupère le middleware enregistré via $use
    jest.spyOn(service, '$use').mockImplementation((fn: any) => {
      capturedMiddleware = fn;
    });

    // Re-exécute le constructeur pour que $use soit appelé avec notre spy
    // On réinstancie proprement après avoir spy sur la classe parente
    const original$use = Object.getPrototypeOf(service).$use;
    service.$use = (fn: any) => { capturedMiddleware = fn; };
    // Réinitialise le middleware en le déclenchant manuellement
    (service as any).constructor.call(service);
  });

  const runMiddleware = (params: any) => {
    const next = jest.fn().mockResolvedValue({ result: true });
    return capturedMiddleware(params, next).then(() => ({ params, next }));
  };

  // ─── findMany ─────────────────────────────────────────────────────────────

  describe('findMany sur un modèle soft-delete', () => {
    it('injecte deletedAt: null dans where', async () => {
      const params = { model: 'User', action: 'findMany', args: { where: { role: 'ADMIN' } } };
      await runMiddleware(params);
      expect(params.args.where).toEqual({ role: 'ADMIN', deletedAt: null });
    });

    it('crée un objet where si inexistant', async () => {
      const params = { model: 'Vehicle', action: 'findMany', args: {} };
      await runMiddleware(params);
      expect(params.args.where).toEqual({ deletedAt: null });
    });
  });

  // ─── findUnique → findFirst ────────────────────────────────────────────────

  describe('findUnique sur un modèle soft-delete', () => {
    it('redirige vers findFirst et injecte deletedAt: null', async () => {
      const params = { model: 'Driver', action: 'findUnique', args: { where: { id: 'abc' } } };
      await runMiddleware(params);
      expect(params.action).toBe('findFirst');
      expect(params.args.where.deletedAt).toBeNull();
    });

    it('redirige findUniqueOrThrow → findFirstOrThrow', async () => {
      const params = { model: 'Contract', action: 'findUniqueOrThrow', args: { where: { id: 'abc' } } };
      await runMiddleware(params);
      expect(params.action).toBe('findFirstOrThrow');
    });
  });

  // ─── delete → update ──────────────────────────────────────────────────────

  describe('delete sur un modèle soft-delete', () => {
    it('convertit delete en update avec deletedAt', async () => {
      const params = { model: 'Owner', action: 'delete', args: { where: { id: 'x' } } };
      await runMiddleware(params);
      expect(params.action).toBe('update');
      expect(params.args.data.deletedAt).toBeInstanceOf(Date);
    });

    it('convertit deleteMany en updateMany avec deletedAt', async () => {
      const params = { model: 'Vehicle', action: 'deleteMany', args: { where: { status: 'INACTIVE' } } };
      await runMiddleware(params);
      expect(params.action).toBe('updateMany');
      expect(params.args.data.deletedAt).toBeInstanceOf(Date);
    });
  });

  // ─── Modèles non concernés ────────────────────────────────────────────────

  describe('modèles non soumis au soft-delete', () => {
    it('ne modifie pas les params pour AuditLog', async () => {
      const params = { model: 'AuditLog', action: 'findMany', args: { where: {} } };
      await runMiddleware(params);
      expect(params.args.where).not.toHaveProperty('deletedAt');
    });

    it('ne convertit pas delete pour LedgerEntry', async () => {
      const params = { model: 'LedgerEntry', action: 'delete', args: { where: { id: 'y' } } };
      await runMiddleware(params);
      expect(params.action).toBe('delete');
    });
  });
});
