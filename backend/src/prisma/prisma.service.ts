import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ─── Modèles avec soft-delete automatique ────────────────────────────────────
const SOFT_DELETE_MODELS = ['User', 'Driver', 'Owner', 'Vehicle', 'Contract'] as const;
type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

function isSoftDelete(model?: string): model is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes((model ?? '') as SoftDeleteModel);
}

// ─── Client étendu (soft-delete via query extensions Prisma 7) ───────────────
// Prisma 7 engine type "client" requiert un driver adapter.
// On passe le pool pg → PrismaPg → PrismaClient.
function buildExtendedClient(log: any[], pool: Pool) {
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ log, adapter }).$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }: any) {
          if (isSoftDelete(model)) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findFirst({ model, args, query }: any) {
          if (isSoftDelete(model)) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }: any) {
          if (isSoftDelete(model)) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findUnique({ model, args, query }: any) {
          if (isSoftDelete(model)) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
        async findUniqueOrThrow({ model, args, query }: any) {
          if (isSoftDelete(model)) {
            args.where = { ...args.where, deletedAt: null };
          }
          return query(args);
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof buildExtendedClient>;

// ─── PrismaService (composition + Proxy pour exposer les accesseurs de modèle) ──
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly _client: ExtendedPrismaClient;
  private readonly _pool: Pool;

  // Déclarations d'index pour satisfaire les appels dynamiques (prismaService.user etc.)
  [key: string]: any;

  constructor() {
    const log: any[] = [
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
      ...(process.env.NODE_ENV === 'development'
        ? [{ emit: 'stdout' as const, level: 'query' as const }]
        : []),
    ];

    // Création du pool pg depuis DATABASE_URL (chargé par ConfigModule avant ce constructeur)
    this._pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this._client = buildExtendedClient(log, this._pool);

    // Proxy — délègue tous les accès inconnus sur this vers _client
    // (ex: this.user, this.vehicle, this.$transaction, this.$executeRaw…)
    return new Proxy(this, {
      get(target: any, prop: string | symbol, receiver: any) {
        // Propriétés propres au service (logger, _client, _pool, méthodes NestJS)
        if (prop in target) {
          const val: any = Reflect.get(target, prop, receiver);
          return typeof val === 'function' ? val.bind(target) : val;
        }
        // Délégation au client Prisma étendu
        const clientProp: any = (target._client as any)[prop];
        return typeof clientProp === 'function'
          ? clientProp.bind(target._client)
          : clientProp;
      },
    });
  }

  async onModuleInit() {
    try {
      await (this._client as any).$connect();
      this.logger.log('✅ Connexion PostgreSQL établie');
    } catch (error) {
      this.logger.error('❌ Échec connexion PostgreSQL', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await (this._client as any).$disconnect();
    await this._pool.end();
    this.logger.log('🔌 Connexion PostgreSQL fermée');
  }
}
