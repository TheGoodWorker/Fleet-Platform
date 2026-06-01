/**
 * generate-swagger.js
 *
 * Génère docs/swagger.json.
 * Utilise AppModule avec PrismaService entièrement remplacé par un mock
 * grâce à NestJS overrideProvider (pas de connexion DB).
 *
 * Usage : node scripts/generate-swagger.js
 */

process.env.NODE_ENV = 'development';
process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
process.env.JWT_ACCESS_SECRET = 'dummy-access-secret-32chars-padding!!';
process.env.JWT_REFRESH_SECRET = 'dummy-refresh-secret-32chars-pad!!';
process.env.API_PREFIX = 'api/v1';
process.env.PORT = '3001';

const path = require('path');
const fs = require('fs');
const BASE = path.resolve(__dirname, '..');

// ─── Stub PrismaService dans le cache require() ───────────────────────────────
// Prisma 7 (WASM engine) requiert un adapter ; on stub le module entier
// avant que AppModule soit chargé.

const prismaServicePath = path.join(BASE, 'dist/src/prisma/prisma.service.js');

// Proxy générique qui répond true à tous les "in" checks et retourne
// une fn async pour tout accès inconnu.
class PrismaServiceMock {
  constructor() {}
  // NestJS lifecycle hooks — doivent être présents directement sur l'instance
  onModuleInit() { return Promise.resolve(); }
  onModuleDestroy() { return Promise.resolve(); }
}

// Envelopper dans un Proxy après construction pour les appels DB
const originalResolve = require.resolve.bind(require);
try {
  const absPath = originalResolve(prismaServicePath);
  require.cache[absPath] = {
    id: absPath,
    filename: absPath,
    loaded: true,
    exports: { PrismaService: PrismaServiceMock },
    parent: null,
    children: [],
    paths: [],
  };
} catch (e) {
  // Si le chemin ne peut pas être résolu, on l'insère directement
  require.cache[prismaServicePath] = {
    id: prismaServicePath,
    filename: prismaServicePath,
    loaded: true,
    exports: { PrismaService: PrismaServiceMock },
    parent: null,
    children: [],
    paths: [],
  };
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const { NestFactory } = require('@nestjs/core');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
const { ValidationPipe } = require('@nestjs/common');

async function generateSwagger() {
  const { AppModule } = require(path.join(BASE, 'dist/src/app.module'));
  const { PrismaService } = require(prismaServicePath);

  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });

  // Override NestJS DI : remplace PrismaService par le mock
  // (au cas où le cache ne serait pas pris en compte)
  // Note : overrideProvider s'utilise sur le TestingModule, pas sur l'app
  // → on s'appuie uniquement sur le require.cache ci-dessus.

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fleet Platform API')
    .setDescription('API de gestion de flotte VTC — Fleet Platform V2')
    .setVersion('2.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addTag('auth', 'Authentification')
    .addTag('users', 'Gestion des utilisateurs')
    .addTag('permissions', 'Moteur RBAC')
    .addTag('owners', 'Propriétaires de véhicules')
    .addTag('vehicles', 'Gestion des véhicules')
    .addTag('drivers', 'Gestion des chauffeurs')
    .addTag('contracts', 'Gestion des contrats')
    .addTag('payments', 'Paiements')
    .addTag('charges', 'Charges additionnelles')
    .addTag('deposits', 'Cautions')
    .addTag('inspections', 'Inspections remise/reprise')
    .addTag('incidents', 'Incidents et accidents')
    .addTag('maintenance', 'Maintenance et kilométrage')
    .addTag('documents', 'Documents et expirations')
    .addTag('settlements', 'Relevés mensuels propriétaires')
    .addTag('notifications', 'Notifications')
    .addTag('tasks', 'Tâches et rendez-vous')
    .addTag('audit', "Journal d'audit")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const outputPath = path.resolve(BASE, '../docs/swagger.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');

  const stats = fs.statSync(outputPath);
  const kb = (stats.size / 1024).toFixed(1);
  const endpoints = Object.keys(document.paths || {}).length;
  console.log(`✅ swagger.json généré : ${outputPath}`);
  console.log(`   Taille : ${kb} Ko — ${endpoints} paths`);

  await app.close();
}

generateSwagger().catch((err) => {
  console.error('❌ Erreur :', err && err.message ? err.message : String(err));
  process.exit(1);
});
