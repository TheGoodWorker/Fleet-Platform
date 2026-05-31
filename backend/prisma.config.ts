import path from 'node:path';
import type { PrismaConfig } from 'prisma';

// Le schéma Prisma V2 est versionné au niveau racine du projet.
// Les migrations sont stockées dans backend/prisma/migrations/.

export default {
  earlyAccess: true,
  schema: path.join(__dirname, '..', 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'prisma', 'migrations'),
  },
} satisfies PrismaConfig;
