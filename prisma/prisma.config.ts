import path from 'node:path'
import type { PrismaConfig } from 'prisma'

// Prisma 7 — configuration de la source de données
// La connexion DB est gérée ici, pas dans schema.prisma

export default {
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
} satisfies PrismaConfig
