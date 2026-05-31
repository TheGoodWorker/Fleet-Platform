# Fleet Platform — Release Notes

---

## [Phase 3-C] — 2026-05-31 · Terrain Operations & Owner Portal

> Tag: `phase-3C-terrain-owner`
> Schema: V3 (47 models · 59 enums) — no schema changes

### Added — 5 new modules (15 files)

#### AvailabilityModule (`GET/POST /availability`)
- `AvailabilityService.recordEvent()` — source unique de vérité D-15 pour la non-disponibilité véhicule
- `AvailabilityService.resolveEvent()` / `resolveActiveEventsForSource()` — résolution manuelle ou automatique
- Endpoint `GET /availability/vehicle/:vehicleId/active` — état d'indisponibilité courant
- Exporté vers ImmobilizationsModule et SpecialAbsencesModule

#### ImmobilizationsModule (`GET/POST /immobilizations`)
- `ImmobilizationsService.start()` — crée immobilisation + événement IMMOBILIZED (D-15), garde anti-double
- `ImmobilizationsService.release()` — termine l'immobilisation, résout l'événement de disponibilité
- Notifications manager + chauffeur à la création et à la libération

#### SpecialAbsencesModule (`GET/POST /special-absences`)
- Workflow PENDING → MANAGER_REVIEWED → APPROVED/REJECTED
- `managerReview()` — décision directe (approved) ou escalade vers super-managers
- `smValidate()` — validation finale par super-manager
- `onApproved()` (privé) — déclenche événement SPECIAL_ABSENCE (D-15) + notifie chauffeur
- `cancel()` et `close()` — résolution des événements de disponibilité associés

#### FuelModule (`GET/POST /fuel`)
- `FuelService.record()` — R-08 : INITIAL_FULL_TANK exige `fuelLevel = FULL`
- R-09 opt-in : flag `autoCreateDiscrepancyCharge` → crée Charge(CLEANING, PENDING_VALIDATION) automatique
- `validate()` — correction de niveau possible par manager
- `getVehicleFuelHistory()` — historique + summary (lastHandoverLevel, lastReturnLevel, delta, hasDiscrepancy)

#### OwnerPortalModule (`GET/PATCH /owner-portal`)
- `upsertVisibilitySettings()` — D-16 : SIMPLE_RENTAL interdit pour showDailyEntries/showDriverPayments/showCharges/showGrossRevenue
- `getDashboard()` — tableau de bord filtré selon les 12 flags de visibilité (vehicleDetails, driverName, rentalPayments, ROI, documents, accidents, maintenance, notifications)
- `getFinancialSummary()` — bilan mensuel avec balance totale
- `recordRentalPayment()` — auto-calcul statut PAID/PENDING, unicité (contractId, year, month), notification propriétaire
- ROI brut (Arbitrage I) : `(cumulativePaid − investmentCost) / investmentCost * 100`

### Changed
- `audit-actions.ts` — +10 nouvelles actions : SPECIAL_ABSENCE_*, FUEL_*, OWNER_*, AVAILABILITY_*
- `entity-types.ts` — +3 : SPECIAL_ABSENCE, AVAILABILITY_EVENT, OWNER_RENTAL_PAYMENT
- `app.module.ts` — 5 nouveaux modules enregistrés

### Tests
- `availability.service.spec.ts` — lifecycle complet (recordEvent, resolveEvent, resolveActiveEventsForSource, findActiveForVehicle)
- `immobilizations.service.spec.ts` — start/release, garde anti-double, D-15
- `special-absences.service.spec.ts` — workflow complet (request → review → smValidate → cancel)
- `fuel.service.spec.ts` — R-08, R-09 opt-in, validate, delta carburant
- `owner-portal.service.spec.ts` — D-16 guard, visibilité filtering, ROI Arbitrage I, auto-statut PAID/PENDING

### Permissions utilisées
- `CONFIGURE_OWNER_VISIBILITY` — PATCH visibility settings
- `VIEW_OWNER_PORTAL` — GET dashboard / financial summary
- `RECORD_OWNER_PAYMENT` — POST/PATCH rental payments
- `MANAGE_IMMOBILIZATION` — POST immobilizations / release
- `MANAGE_SPECIAL_ABSENCE` — POST special-absences
- `APPROVE_SPECIAL_ABSENCE` — sm-validate (SUPER_MANAGER uniquement)
- `RECORD_FUEL` — POST fuel transactions
- `VALIDATE_MILEAGE` — POST fuel validate

---

## [Phase 3-B] — 2026-05-31 · Operational Modules

> Tag: `phase-3B-operational`
> Schema: V3 (47 models · 59 enums)

---

### Added

#### MediaModule (storage abstraction)
- `IMediaStorageProvider` interface with `STORAGE_PROVIDER` injection token — swappable LocalStorage → S3 → GCS
- `LocalStorageProvider` — writes to `process.cwd()/uploads`, configurable via `MEDIA_LOCAL_DIR` and `MEDIA_BASE_URL`
- `MediaService.upload()` — validates MIME type, max 50MB, D-06 anti-fraud (driver must use `IN_APP_CAMERA`), creates `MediaAsset`
- `MediaService.getSignedUrl()` — extracts key from stored URL, delegates TTL to storage provider
- `MediaService.createPhotoMission()` / `submitPhotoMission()` / `validatePhotoMission()` — full photo mission lifecycle
- `@Cron('0 10 * * *')` — marks OVERDUE missions, sends HIGH priority notifications to drivers
- Routes: `POST /media/upload`, `GET /media/:id`, `GET /media/:id/url`, `POST /media/photos`, `POST /media/photo-missions`, `GET /media/photo-missions/:id`, `POST /media/photo-missions/:id/submit`, `POST /media/photo-missions/:id/validate`

#### DocumentsModule (versioning + expiry cron)
- `DocumentsService.create()` — archives previous version (`isLatest=false`, `status=ARCHIVED`), increments `version`, sets `parentDocId`, computes status from `validUntil`
- `DocumentsService.computeStatus()` — `ALWAYS_VALID → VALID → EXPIRING_SOON (≤30j) → EXPIRED`
- `DocumentExpiryService.checkDocumentExpiry()` — `@Cron('0 8 * * *')` — updates status, sends reminders at 30/15/7/1 days (R-22/R-23), dedup via `reminder*SentAt` fields
- Critical expired documents notify all ADMINs at HIGH priority
- `notifyOwner=true` → owner receives `OWNER_DOCUMENT_EXPIRING_SOON` / `OWNER_DOCUMENT_EXPIRED`
- Routes: `GET /documents`, `GET /documents/:id`, `GET /documents/entity/:entityType/:entityId`, `POST /documents`, `PATCH /documents/:id`, `POST /documents/:id/archive`

#### InspectionsModule (double signature + R-09)
- `InspectionsService.driverSign()` — guards `PENDING_DRIVER`, transitions to `DRIVER_SIGNED`, notifies manager
- `InspectionsService.managerSign()` — transitions to `COMPLETED`, triggers R-09 fire-and-forget if `VEHICLE_RETURN` + `fuelLevelOut ≠ FULL`
- R-09: auto-creates `Charge(type=CLEANING, status=PENDING_VALIDATION, amount=dailyAmount)` for driver responsibility
- `InspectionsService.linkReturnToHandover()` — sets `linkedHandoverInspectionId` + `returnComparisonNotes`
- `InspectionsService.generateComparison()` — computes fuel delta (via `FUEL_LEVEL_ORDER` map), mileage delta, item diffs (damaged / missing / clean), `summary.hasIssues`
- Routes: `GET /inspections`, `GET /inspections/:id`, `POST /inspections`, `POST /inspections/:id/add-item`, `POST /inspections/:id/driver-sign`, `POST /inspections/:id/manager-sign`, `POST /inspections/:id/link-return`, `GET /inspections/:id/comparison`

#### IncidentsModule (OPEN→IN_PROGRESS→RESOLVED→CLOSED)
- Strict status machine: `OPEN → IN_PROGRESS → RESOLVED → CLOSED`
- `close()` requires prior `RESOLVED` status — SUPER_MANAGER only
- Notifications: `ACCIDENT_DECLARED` for ACCIDENT type, `BREAKDOWN_DECLARED` for BREAKDOWN
- Routes: `GET /incidents`, `GET /incidents/:id`, `POST /incidents`, `PATCH /incidents/:id`, `POST /incidents/:id/in-progress`, `POST /incidents/:id/resolve`, `POST /incidents/:id/close`

#### AccidentsModule (14-step workflow)
- `STEP_ORDER` map enforces strict linear progression — no backward steps
- `STEP_TIMESTAMP_FIELD` map auto-fills the corresponding `*At` field on `AccidentCase`
- Step-specific data: `towingCompany`, `towingCost`, `towingPlateVisible`, `towingPhotoUrl` on towing steps
- Full `AccidentStepHistory` recorded on every advance
- `addExpense()` / `validateExpense()` — `AccidentExpense` management, SUPER_MANAGER validates
- `close()` — standard close requires `VEHICLE_RETURNED` step; `DISPUTED` close bypasses step requirement
- Routes: `GET /accidents`, `GET /accidents/:id`, `GET /accidents/by-incident/:incidentId`, `POST /accidents`, `POST /accidents/:id/advance-step`, `POST /accidents/:id/expenses`, `POST /accidents/:id/expenses/:expenseId/validate`, `POST /accidents/:id/close`

#### MaintenanceModule (preventive + corrective + mileage tracking)
- `MaintenanceService.complete()` — transitions to `COMPLETED`, syncs `Vehicle.currentMileage` if mileage provided
- `MaintenanceService.syncVehicleMileage()` — private helper, only updates if new mileage > current (no regression)
- `createMileageRecord()` — validates no mileage regression; auto-validates if `source=MANAGER` or `CARCUL`
- `validateMileageRecord()` — manager validation of DRIVER-submitted records, updates vehicle mileage
- Routes: `GET /maintenance`, `GET /maintenance/:id`, `POST /maintenance`, `PATCH /maintenance/:id`, `POST /maintenance/:id/complete`, `POST /maintenance/:id/cancel`, `GET /maintenance/mileage/records`, `POST /maintenance/mileage/records`, `POST /maintenance/mileage/records/:id/validate`

#### Tests (5 new spec files)
- `documents/document-expiry.service.spec.ts` — 5 scenarios: EXPIRED transition, EXPIRING_SOON, dedup reminder, admin alert critique, owner notification
- `inspections/inspections.service.spec.ts` — 7 scenarios: create, NotFoundException vehicle, driverSign guard, managerSign R-09 (no charge if FULL, charge if < FULL), generateComparison (fuel delta, items, BadRequest si pas de remise liée)
- `accidents/accidents.service.spec.ts` — 8 scenarios: create, type guard, doublon guard, step advance, backward step rejected, close status CLOSED, close DISPUTED, reject close if not VEHICLE_RETURNED
- `maintenance/maintenance.service.spec.ts` — 8 scenarios: create, vehicle not found, complete + sync mileage, déjà complété, validateMileageRecord, déjà validé, no regression, auto-validate MANAGER source
- `owners/owner-visibility.spec.ts` — 7 scenarios: masquer toutes données financières, laisser driver name visible, tout exposer permissive, GPS masqué indépendamment, accidents masqués indépendamment, ROI masqué, défauts schema respectés

---

### Schema V3 additions (confirmed)
- `OwnerPortalVisibilitySettings` model (12 visibility flags including showGps, showDocuments, showAccidents, showMaintenance, showNotifications, showRoi)
- `OwnerRentalPayment` model (expectedAmount / actualAmount, `@@unique([contractId, periodYear, periodMonth])`)
- `OwnerPaymentFrequency` enum: MONTHLY, WEEKLY, BIWEEKLY, CUSTOM
- `RentalPaymentStatus` enum: PENDING, PAID, LATE, DISPUTED
- Contract: `vehicleInvestmentCost`, `simpleRentalMonthlyAmount`, `ownerPaymentFrequency`, relations to `ownerPortalSettings` and `ownerRentalPayments`
- Inspection: `linkedHandoverInspectionId` self-FK + `returnComparisonNotes`
- AccidentCase: `declaredById`, `policeReportNumber`, `estimatedRepairDays`, `repairDeadline`, `insuranceDocumentId`
- Document: `notifyOwner`, `expiryNotifiedAt`

---

### Remains (known limitations at Phase 3-B)

| ID | Issue | Phase target |
|----|-------|-------------|
| L-01 | `prisma generate` not run — TypeScript compilation requires migration + generate | Pre-deploy |
| L-02 | FuelModule, AvailabilityModule, ImmobilizationsModule, SpecialAbsencesModule, OwnerPortalModule — not yet implemented (stub only) | Phase 3-C / Phase 4 |
| L-03 | Payment rejection does not reverse DailyEntry allocations | Phase 4 |
| L-04 | OwnerPortalService (filter by OwnerPortalVisibilitySettings) — stub, logic tested in owner-visibility.spec.ts | Phase 4 |
| L-05 | S3StorageProvider / GCSStorageProvider adapters — interface ready, LocalStorage only in prod | Phase 5 |

---

## [Phase 3-A.5] — 2026-05-31 · Financial Core Stabilisation

> Tag: `phase-3A-complete`  
> Checkpoint: Awaiting human validation before Phase 3-B begins.

---

### Added

#### Continuous DailyEntry generation
- `DailyEntriesService.ensureEntriesAhead(contractId, daysAhead = 30)` — ensures a rolling window of UNPAID daily entries always exists ahead of the current date for active contracts
- `@Cron('0 2 * * *')` — scheduled job fires daily at 02:00 UTC for all active `OWNERSHIP_PROGRAM` contracts
- `PaymentsService.recordPayment()` — calls `ensureEntriesAhead(30)` fire-and-forget after every successful payment transaction

#### KYC & field validation integration with contract checklist
- `DriversService.validateKyc(driverId, actorId)` — validates all DriverKYC fields, transitions driver PENDING_KYC → PENDING_FIELD_VALIDATION, propagates `kycValidated=true` to all DRAFT/PENDING_APPROVAL contracts of the driver
- `DriversService.validateField(driverId, actorId, dto)` — validates field visit, transitions PENDING_FIELD_VALIDATION → APPROVED, propagates `fieldValidated=true` to contracts
- `POST /drivers/:id/validate-kyc` — SUPER_MANAGER + `can_validate_kyc`
- `POST /drivers/:id/validate-field` — MANAGER + `can_validate_field`
- `ValidateFieldDto` — optional fields: `homeVisitDone`, `gpsLocationLat/Lng`, `homeVisitPhotoUrl`, `resourcePersonName/Phone`, `managerComment`, `notes`

#### New test files
- `daily-entries.completion.spec.ts` — 4 contract completion scenarios
- `drivers.service.spec.ts` — 15 KYC + field validation scenarios

#### Documentation
- `docs/PHASE_STATUS.md` — single source of truth for project progress (permanent tracker)
- `PHASE_STATUS.md` — root-level summary (mirrors docs version)
- `RELEASE_NOTES.md` — this file

---

### Fixed

#### Critical: surplus DailyEntry created after contract completion
**Before:** `allocatePaymentToEntries` created a surplus PARTIALLY_PAID entry _then_ checked if the contract was complete. This could create a phantom day on a completed contract.  
**After:** `validatedDays` increment + completion detection run first. Surplus entry created **only if** `!contractCompleted`.

#### Vehicle release fields not fully nulled on completion
**Before:** Only `currentContractId` was nulled.  
**After:** `currentContractId`, `currentDriverId`, and `currentManagerId` all set to `null` atomically in the same transaction.

#### Missing `can_validate_field` permission for MANAGER role in seed
**Before:** MANAGER had no `can_validate_field` permission — field visits could only be done by SUPER_MANAGER.  
**After:** `can_validate_field` added to MANAGER role in `prisma/seed.ts`. Matches the real operational model where on-ground managers conduct field visits.

---

### Remains (known limitations at this checkpoint)

| ID | Issue | Phase target |
|----|-------|-------------|
| L-01 | `prisma generate` not run — TypeScript compilation fails (274 pre-existing errors, all `@prisma/client` related) | Pre-deploy |
| L-02 | 9 stub modules (Documents, Media, Inspections, Incidents, Accidents, Maintenance, Tasks, Scoring, Settlements) with no business logic | Phase 3-B / Phase 4 |
| L-03 | Payment rejection does not reverse DailyEntry allocations | Phase 4 |
| L-04 | `DayStatus.ABSENT` / `SpecialAbsence` not handled | Phase 3-B |
| L-05 | No E2E tests with real database | Phase 5 |
| L-06 | `PARTNER_FLEET` and `SIMPLE_RENTAL` contract types have no dedicated payment logic | Phase 4 |
| L-07 | `ensureEntriesAhead` not safe under concurrent cron runs (no distributed lock) | Before production scale-out |
| L-08 | No Prisma migration history — `db push` only | Before first production deploy |

---

## [Phase 3-A] — 2026-05-31 · Financial Core

### Added
- `PaymentsModule` — `recordPayment` (partial/exact/superior logic), `rejectPayment`
- `DailyEntriesModule` — `allocatePaymentToEntries`, `initializeContractEntries`, `createChargeEntries`, `getProgressSummary`
- `ChargesModule` — 5-state workflow (DRAFT → PENDING_VALIDATION → VALIDATED/REJECTED → ADDED_TO_CONTRACT)
- `DepositsModule` — standard/non-standard deposit, D-13 Admin validation gate, R-05/R-06/R-07
- `ContractsModule.activate()` — 8-condition checklist enforcement
- `AuditService.log()` — `metadata` alias for `afterJson`
- `LedgerService.createEntry()` — `entityType/entityId/actorId` aliases, `occurredAt` defaults to `new Date()`
- `AuditActions` renamed from `AuditAction` (deprecated alias kept); new: CHARGE_*, DEPOSIT_*, PAYMENT_REJECTED
- `EntityTypes` renamed from `EntityType` (deprecated alias kept)
- 36 unit tests across 5 new spec files

---

## [Phase 2] — Infrastructure Hardening

### Added
- `auth.service.spec.ts` — 11 tests (login + refresh)
- `permissions.service.spec.ts` — 12 tests (checkPermission, create, grantToUser)
- `prisma.service.spec.ts` — 8 tests (soft-delete middleware)
- `backend/README.md` — full setup guide

---

## [Phase 1] — Foundation

### Added
- NestJS 10 modular monolith scaffold
- Prisma 7 with `prisma.config.ts` (D-02)
- Full PostgreSQL schema — 50+ models
- JWT auth, global guards, soft-delete middleware
- `AuthModule`, `UsersModule`, `VehiclesModule`, `DriversModule`, `OwnersModule`, `PermissionsModule`, `AuditModule`, `LedgerModule`, `NotificationsModule`
- Permission seed with full role assignments
- Swagger (`/api`)

---

*Append new entries at the top of this file. Never edit past releases.*
