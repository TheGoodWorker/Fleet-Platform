import path from 'node:path'
import type { PrismaConfig } from 'prisma'

// Prisma 7 — configuration de la source de données
// La connexion DB est gérée ici, pas dans schema.prisma

export default {
  schema: path.join('/Users/jamalburemoh/Fleet-Platform/prisma', 'schema.prisma'),
} satisfies PrismaConfig
