import 'dotenv/config' // charge DATABASE_URL depuis backend/.env pour le CLI Prisma
import path from 'node:path'
import type { PrismaConfig } from 'prisma'

// Prisma 7 — la connexion DB est configurée ici (plus dans schema.prisma).
// · datasource.url  → utilisé par le CLI (migrate, introspect, studio)
// · adapter         → passé au constructeur PrismaClient pour le runtime (voir prisma.service.ts)

export default {
  schema: path.join(__dirname, 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: path.join(__dirname, '..', 'backend', 'prisma', 'migrations'),
  },
} satisfies PrismaConfig
