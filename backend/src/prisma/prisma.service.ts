import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
        ...(process.env.NODE_ENV === 'development'
          ? [{ emit: 'stdout' as const, level: 'query' as const }]
          : []),
      ],
    });

    // Middleware soft delete — filtre automatique sur les entités concernées
    this.$use(async (params, next) => {
      const softDeleteModels = ['User', 'Driver', 'Owner', 'Vehicle', 'Contract'];

      if (softDeleteModels.includes(params.model ?? '')) {
        if (['findMany', 'findFirst', 'findFirstOrThrow'].includes(params.action)) {
          params.args = params.args ?? {};
          params.args.where = { ...params.args.where, deletedAt: null };
        }

        if (params.action === 'findUnique' || params.action === 'findUniqueOrThrow') {
          params.action = params.action === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
          params.args = params.args ?? {};
          params.args.where = { ...params.args.where, deletedAt: null };
        }

        if (params.action === 'delete') {
          params.action = 'update';
          params.args.data = { deletedAt: new Date() };
        }

        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          params.args.data = { deletedAt: new Date() };
        }
      }

      return next(params);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connexion PostgreSQL établie');
    } catch (error) {
      this.logger.error('❌ Échec connexion PostgreSQL', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Connexion PostgreSQL fermée');
  }
}
