/**
 * generate-swagger.ts
 *
 * Exporte le contrat OpenAPI (swagger.json) sans démarrer le serveur HTTP.
 * Usage : npx ts-node -r tsconfig-paths/register scripts/generate-swagger.ts
 */

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';

async function generateSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });

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
    .addTag('audit', 'Journal d\'audit')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const outputPath = path.join(__dirname, '../../docs/swagger.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');

  console.log(`✅ swagger.json généré : ${outputPath}`);
  await app.close();
}

generateSwagger().catch((err) => {
  console.error('Erreur génération swagger:', err);
  process.exit(1);
});
