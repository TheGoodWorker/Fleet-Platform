# Fleet Platform — Release Notes

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
