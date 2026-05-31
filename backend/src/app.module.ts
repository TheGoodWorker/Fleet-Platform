import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { appConfig, validateConfig } from './config/app.config';
import { jwtConfig } from './config/jwt.config';

// ── Modules fonctionnels ──
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { OwnersModule } from './modules/owners/owners.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ChargesModule } from './modules/charges/charges.module';
import { DepositsModule } from './modules/deposits/deposits.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { MediaModule } from './modules/media/media.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { AccidentsModule } from './modules/accidents/accidents.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { AuditModule } from './modules/audit/audit.module';
import { DailyEntriesModule } from './modules/daily-entries/daily-entries.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { ImmobilizationsModule } from './modules/immobilizations/immobilizations.module';
import { SpecialAbsencesModule } from './modules/special-absences/special-absences.module';
import { FuelModule } from './modules/fuel/fuel.module';
import { OwnerPortalModule } from './modules/owner-portal/owner-portal.module';
import { ContraventionsModule } from './modules/contraventions/contraventions.module';
import { RepossessionsModule } from './modules/repossessions/repossessions.module';

@Module({
  providers: [
    // ThrottlerGuard global — appliqué à toute l'application (H-11)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  imports: [
    // Config globale
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig],
      validate: validateConfig,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting — deux profils :
    //   global : 100 req / 60 s (tous les endpoints)
    //   auth   : 5 req / 60 s  (POST /auth/login uniquement, via @Throttle sur le handler)
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            name: 'global',
            ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
            limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
          },
          {
            name: 'auth',
            ttl: parseInt(process.env.AUTH_THROTTLE_TTL ?? '60000', 10),
            limit: parseInt(process.env.AUTH_THROTTLE_LIMIT ?? '5', 10),
          },
        ],
      }),
    }),

    // Cron jobs
    ScheduleModule.forRoot(),

    // Prisma — global, disponible dans tous les modules
    PrismaModule,

    // Modules fonctionnels
    AuthModule,
    UsersModule,
    PermissionsModule,
    OwnersModule,
    VehiclesModule,
    DriversModule,
    ContractsModule,
    PaymentsModule,
    ChargesModule,
    DepositsModule,
    DocumentsModule,
    MediaModule,
    InspectionsModule,
    IncidentsModule,
    AccidentsModule,
    MaintenanceModule,
    NotificationsModule,
    TasksModule,
    ScoringModule,
    SettlementsModule,
    LedgerModule,
    AuditModule,
    DailyEntriesModule,
    // Phase 3-C — Terrain Operations & Owner Portal
    AvailabilityModule,
    ImmobilizationsModule,
    SpecialAbsencesModule,
    FuelModule,
    OwnerPortalModule,
    // Phase 3-E — Critical Business Fixes
    ContraventionsModule,
    RepossessionsModule,
  ],
})
export class AppModule {}
