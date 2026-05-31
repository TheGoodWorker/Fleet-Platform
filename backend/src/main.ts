import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LimitCapInterceptor } from './common/interceptors/limit-cap.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Sécurité HTTP
  app.use(helmet());

  // Préfixe global API
  app.setGlobalPrefix(apiPrefix);

  // H-04 : CORS avec allowlist configurable.
  // - development : toutes les origines acceptées (Swagger, Flutter dev, Postman).
  // - production/staging : seules les origines listées dans ALLOWED_ORIGINS sont acceptées.
  //   Format : ALLOWED_ORIGINS=https://app.fleet.com,https://admin.fleet.com
  //   Si ALLOWED_ORIGINS est absent en production, CORS est désactivé (blocage total).
  const rawOrigins = configService.get<string>('ALLOWED_ORIGINS', '');
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const corsOrigin: boolean | string[] =
    nodeEnv === 'development'
      ? true
      : allowedOrigins.length > 0
        ? allowedOrigins
        : false;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Filtre d'exceptions global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Intercepteurs globaux — ordre d'exécution : LimitCap → ClassSerializer → Transform
  // LimitCap doit être en premier : il s'exécute AVANT les pipes (ParseIntPipe).
  app.useGlobalInterceptors(
    new LimitCapInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );

  // Swagger — DEV et staging uniquement
  if (nodeEnv !== 'production') {
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
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    console.log(`📚 Swagger: http://localhost:${port}/docs`);
  }

  await app.listen(port);
  console.log(`🚀 Fleet Platform Backend démarré sur http://localhost:${port}/${apiPrefix}`);
  console.log(`🌍 Environnement: ${nodeEnv}`);
}

bootstrap();
