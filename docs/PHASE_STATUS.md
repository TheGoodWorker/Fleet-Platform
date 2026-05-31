# Fleet Platform — Phase Status & Progress Tracker

> **Last updated:** 2026-05-31  
> **Checkpoint:** Phase 3-B architecture finalized — schema V3 approved, ready for implementation  
> **Stack:** NestJS 10 · Prisma 7 · PostgreSQL · TypeScript 5.6 · Decimal.js 10  
> **Architecture:** Modular Monolith (backend) · Flutter (mobile — not started)  
> **Schema:** V3 — 47 models · 59 enums · 2 new models · 3 new enums · 12 new fields

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented & tested |
| 🟡 | Logic implemented, no tests |
| 🔲 | Stub — 8-line skeleton, no real logic |
| ❌ | Not started |

---

## Completed Phases

---

### Phase 1 — Foundation & Infrastructure ✅

**Objective:** Bootstrap the project with all shared infrastructure before any business logic.

| Deliverable | Status |
|-------------|--------|
| NestJS 10 project scaffold (`src/modules/`) | ✅ |
| Prisma 7 with `prisma.config.ts` (no `url` in schema) | ✅ |
| PostgreSQL schema — 50+ models, all relations | ✅ |
| `PrismaService` + soft-delete Prisma middleware | ✅ |
| JWT authentication — `login` (email + phone), `refresh` | ✅ |
| Global `JwtAuthGuard` + `RolesGuard` (APP_GUARD) | ✅ |
| Global `HttpExceptionFilter` — standardised error shape | ✅ |
| `PermissionsModule` — `RolePermission` + `UserPermissionOverride` with expiry | ✅ |
| `AuditModule` — structured audit log, immutable entries | ✅ |
| `LedgerModule` — double-entry ledger, fire-and-forget | ✅ |
| `NotificationsModule` — dispatch, fire-and-forget | ✅ |
| `UsersModule` — CRUD, soft delete, status management | ✅ |
| `VehiclesModule` — CRUD, status machine | ✅ |
| `DriversModule` — CRUD, soft delete via User | ✅ |
| `OwnersModule` — CRUD | ✅ |
| Permission seed — all `Perm.*` codes with role assignments | ✅ |
| Swagger (`/api`) — Bearer auth, all routes annotated | ✅ |
| `backend/README.md` — full setup guide (12 sections) | ✅ |

---

### Phase 2 — Infrastructure Hardening & Unit Tests ✅

**Objective:** Comprehensive test coverage on core infrastructure before any business logic.

| File | Tests | Scenarios |
|------|-------|-----------|
| `auth.service.spec.ts` | 11 | `login` (email, phone, missing creds, user not found, wrong password, suspended) · `refresh` (valid, wrong type, invalid JWT, user suspended, user not found) |
| `permissions.service.spec.ts` | 12 | `checkPermission` (7: override grant/revoke/expired/priority/role fallback/unknown/user absent) · `create` (success, ConflictException) · `grantToUser` (NotFoundException, upsert) |
| `prisma.service.spec.ts` | 8 | Soft-delete middleware: `findMany`, `findUnique→findFirst`, `delete→update`, `deleteMany→updateMany`, non-affected models |

---

### Phase 3-A — Financial Core (Ownership Program) ✅

**Objective:** Full `Contract → Payment → DailyEntry → Progression` pipeline for `OWNERSHIP_PROGRAM`.

#### New Modules

| Module | Key Methods |
|--------|-------------|
| `PaymentsModule` | `recordPayment`, `rejectPayment` |
| `DailyEntriesModule` | `allocatePaymentToEntries`, `initializeContractEntries`, `createChargeEntries`, `getProgressSummary` |
| `ChargesModule` | `create`, `submit`, `validate`, `reject`, `addToContract` |
| `DepositsModule` | `create`, `adminValidate`, `recordPayment`, `use`, `refund` |

#### Extended Modules

| Module | Added |
|--------|-------|
| `ContractsModule` | Full `activate()` — 8-condition checklist, DailyEntry init, vehicle assignment |
| `AuditService` | `metadata` alias for `afterJson` |
| `LedgerService` | `entityType/entityId/actorId` aliases; `occurredAt` defaults to `new Date()` |
| `AuditActions` | Renamed from `AuditAction` (backwards alias kept); added CHARGE_*, DEPOSIT_*, PAYMENT_REJECTED |
| `EntityTypes` | Renamed from `EntityType` (backwards alias kept) |

#### Tests

| File | Cases | Key Assertions |
|------|-------|---------------|
| `payments.service.spec.ts` | 6 | Partial / exact / superior payment; inactive contract blocked; amount=0 blocked |
| `daily-entries.service.spec.ts` | 6 | 1 VALIDATED on exact; 2 VALIDATED + surplus on superior; PARTIALLY_PAID on partial; PARTIALLY_PAID priority; NotFoundException; `getProgressSummary` 50% |
| `deposits.service.spec.ts` | 11 | Standard deposit; non-standard + Admin notif; ConflictException; partial→PARTIAL; full→PAID + depositPaid on contract; D-13 block; overpayment; R-06 ACTIVE blocked; R-06 COMPLETED allowed |
| `charges.service.spec.ts` | 5 | PENDING_VALIDATION→VALIDATED; wrong-status guard; 3 extra days created; charge not validated guard; responsible≠DRIVER guard |
| `contracts.service.spec.ts` | 8 | Successful activation; 7 failure cases (depositPaid, kycValidated, fieldValidated, driver status, vehicle status, wrong contract status, NotFoundException) |

---

### Phase 3-B Architecture Finalization ✅

**Objective:** Gap analysis + schema V3 approval before implementing operational modules. No code written — schema and docs only.

#### Schema V3 changes

| Category | Additions |
|----------|-----------|
| **New models** | `OwnerPortalVisibilitySettings` (47 fields) · `OwnerRentalPayment` (expectedAmount / actualAmount / status) |
| **New enums** | `OwnerPaymentFrequency` (MONTHLY / WEEKLY / BIWEEKLY / CUSTOM) · `RentalPaymentStatus` (PENDING / PAID / LATE / DISPUTED) |
| **Enum extensions** | `PermissionModule` +3 (FUEL, AVAILABILITY, OWNER_PORTAL) · `VehicleAvailabilityEventType` +2 (BREAKDOWN, APPOINTMENT) · `NotificationType` +7 (ACCIDENT_STEP_UPDATED, ACCIDENT_RESOLVED, REPAIR_STARTED, OWNER_DOCUMENT_EXPIRING_SOON, OWNER_DOCUMENT_EXPIRED, OWNER_RENTAL_PAYMENT_RECORDED, OWNER_RENTAL_PAYMENT_DUE) |
| **New fields on existing models** | `Contract` +3 (vehicleInvestmentCost, simpleRentalMonthlyAmount, ownerPaymentFrequency) · `Inspection` +3 (linkedHandoverInspectionId, self-relation, returnComparisonNotes) · `AccidentCase` +5 (declaredById, policeReportNumber, estimatedRepairDays, repairDeadline, insuranceDocumentId) · `FuelTransaction` +3 (discrepancyChargeId, validatedById, validatedAt) · `VehicleAvailabilityEvent` +2 (resolvedAt, resolvedById) · `Document` +2 (notifyOwner, expiryNotifiedAt) |
| **New permissions** | 11 new codes: can_record_fuel, can_validate_mileage, can_manage_immobilization, can_manage_special_absence, can_approve_special_absence, can_configure_owner_visibility, can_view_owner_portal, can_record_owner_payment, can_create_photo_mission, can_validate_photo_mission |
| **Architecture decisions** | D-16 (OwnerPortalVisibilitySettings per-contract) · D-17 (SIMPLE_RENTAL financial model separate from MonthlySettlement) |

---

### Phase 3-A.5 — Financial Core Stabilisation ✅

**Objective:** Close 6 identified gaps before opening operational modules.

| Gap | Status | What was done |
|-----|--------|--------------|
| **Gap 1** — Continuous DailyEntry generation | ✅ | `@Cron('0 2 * * *')` → `ensureEntriesAhead(contractId, 30)` for all active OWNERSHIP_PROGRAM contracts |
| **Gap 2** — Automatic contract completion | ✅ | `allocatePaymentToEntries` detects `validatedDays >= targetDays` inside TX → sets `COMPLETED` + `closedAt`, releases vehicle (`AVAILABLE`, current* fields nulled) |
| **Gap 3** — Surplus suppression post-completion | ✅ | Surplus PARTIALLY_PAID entry created **only if** `!contractCompleted` — critical ordering fix |
| **Gap 4** — Permission seed verification | ✅ | All Phase 3-A permissions verified present. Fixed: `can_validate_field` added to MANAGER role |
| **Gap 5** — KYC + field validation checklist integration | ✅ | `validateKyc()`: PENDING_KYC → PENDING_FIELD_VALIDATION + `kycValidated=true` on DRAFT contracts. `validateField()`: PENDING_FIELD_VALIDATION → APPROVED + `fieldValidated=true` |
| **Gap 6** — Additional integration tests | ✅ | `daily-entries.completion.spec.ts` (4 cases) · `drivers.service.spec.ts` (15 cases) |

**Bonus:** `PaymentsService.recordPayment()` calls `ensureEntriesAhead(30)` fire-and-forget after every successful payment.

---

## Implemented Business Rules

### Payment Allocation Engine

| Code | Rule | Where enforced |
|------|------|---------------|
| R-01 | `validatedDays` increments only when DailyEntry → VALIDATED; never decrements | `DailyEntriesService.allocatePaymentToEntries()` only |
| R-02 | Superior payment: validates N full days + creates PARTIALLY_PAID surplus for the remainder | Same — loop with `min(remaining, needed)` per entry |
| R-03 | Partial payment (< dailyAmount): DayStatus = PARTIALLY_PAID, `validatedDays` unchanged | Same — no `contract.update` if no VALIDATED transitions |
| R-04 | PARTIALLY_PAID entries are consumed before UNPAID (chronological within each group) | Prisma `orderBy: [{ status: asc }, { date: asc }]` |
| — | Surplus entry suppressed when contract completes | `contractCompleted` flag checked before creating surplus |
| — | Vehicle released atomically on contract completion (same TX as last validation) | `tx.vehicle.update({ status: AVAILABLE, currentContractId: null, … })` |

### Contract Activation — 8-Condition Checklist

| Condition | Source field | Rule |
|-----------|-------------|------|
| KYC validated | `contract.kycValidated` | Set by `DriversService.validateKyc()` |
| Field validation done | `contract.fieldValidated` | Set by `DriversService.validateField()` |
| Deposit paid | `contract.depositPaid` | **R-05** — set by `DepositsService.recordPayment()` on full payment |
| Contract signed | `contract.contractSigned` | Manual via `updateChecklist` |
| Manager approved | `contract.managerApproved` | Manual |
| Admin approved | `contract.adminApproved` | Manual |
| Vehicle available | `vehicle.status ∈ {AVAILABLE, ASSIGNED}` | Live check on activation |
| Driver approved | `driver.status ∈ {APPROVED, ACTIVE}` | Live check on activation |

All 8 must pass; any failure throws `BadRequestException` listing all unmet conditions.

### Deposit Rules

| Code | Rule |
|------|------|
| — | Standard amount = `max(2 × dailyAmount, 50 000 FCFA)`, tolerance ±1 FCFA |
| D-13 | Non-standard deposit: Admin must call `adminValidate` before any payment accepted |
| R-05 | Full deposit payment → `contract.depositPaid = true` (inside transaction) |
| R-06 | Deposit refund blocked if `contract.status === ACTIVE`; allowed only on COMPLETED / TERMINATED |
| R-07 | Deposit usage (`use`) requires `description` field |

### Charges

| Rule | Implementation |
|------|---------------|
| Workflow: DRAFT → PENDING_VALIDATION → VALIDATED/REJECTED → ADDED_TO_CONTRACT | Status machine — no skipping allowed |
| `extraDaysAdded = ceil(chargeAmount / dailyAmount)` | `createChargeEntries()` — DailyEntry rows created with `chargeId` trace |
| Only DRIVER-responsible validated charges can be added to contract | Guard: `validatedResponsible === 'DRIVER'` |

### KYC & Field Validation

| Rule | Implementation |
|------|---------------|
| PENDING_KYC → PENDING_FIELD_VALIDATION on KYC sign-off | `DriversService.validateKyc()` |
| All DriverKYC boolean fields set to `true` atomically | Same method |
| `kycValidated=true` propagated to all DRAFT/PENDING_APPROVAL contracts of driver | `contract.updateMany` |
| PENDING_FIELD_VALIDATION → APPROVED on field sign-off | `DriversService.validateField()` |
| `fieldValidated=true` propagated to all DRAFT/PENDING_APPROVAL contracts of driver | `contract.updateMany` |

### Infrastructure Rules

| Rule | Implementation |
|------|---------------|
| All critical financial ops run in `prisma.$transaction()` | Payments, deposits, charges `addToContract`, contract activation |
| Ledger + Audit always fire-and-forget outside transaction | `.catch(() => {})` pattern — never blocks main op |
| All monetary values use `Decimal.js` | No `Float`, no `number` for money anywhere in codebase |
| Soft delete auto-applied on User, Driver, Owner, Vehicle, Contract | Prisma middleware adds `deletedAt: null` to all read operations |
| Permission codes are string constants, not Prisma enums | `common/constants/permissions.ts` — no migration needed to add permissions |

---

## Completed Modules

| Module | Implementation depth | Test file |
|--------|---------------------|-----------|
| `AuthModule` | ✅ Full — login, refresh, JWT strategy | `auth.service.spec.ts` |
| `UsersModule` | ✅ Full — CRUD, soft delete, status | — |
| `PermissionsModule` | ✅ Full — role perms, user overrides, expiry | `permissions.service.spec.ts` |
| `PrismaService` | ✅ Full — soft-delete middleware | `prisma.service.spec.ts` |
| `OwnersModule` | 🟡 CRUD only | — |
| `VehiclesModule` | 🟡 CRUD + status | — |
| `DriversModule` | ✅ Full — CRUD + validateKyc + validateField | `drivers.service.spec.ts` |
| `ContractsModule` | ✅ Full — CRUD + activate (8-condition checklist) | `contracts.service.spec.ts` |
| `PaymentsModule` | ✅ Full — recordPayment + rejectPayment | `payments.service.spec.ts` |
| `DailyEntriesModule` | ✅ Full — allocation engine + cron + completion | `daily-entries.service.spec.ts` · `daily-entries.completion.spec.ts` |
| `ChargesModule` | ✅ Full — 5-state workflow + addToContract | `charges.service.spec.ts` |
| `DepositsModule` | ✅ Full — create + validate + pay + use + refund | `deposits.service.spec.ts` |
| `AuditModule` | ✅ Full — structured logging, read API | — |
| `LedgerModule` | ✅ Full — entry creation, aliases | — |
| `NotificationsModule` | 🟡 Dispatch only — no retry, no delivery tracking | — |

---

## Remaining Modules

### Stub modules (8-line skeleton — no business logic)

| Module | Key Prisma models | Phase target |
|--------|------------------|-------------|
| `DocumentsModule` | `Document` | Phase 3-B |
| `MediaModule` | `MediaAsset`, `Photo`, `PhotoMission` | Phase 3-B |
| `InspectionsModule` | `Inspection`, `InspectionItem` | Phase 3-B |
| `IncidentsModule` | `Incident` | Phase 3-B |
| `AccidentsModule` | `AccidentCase`, `AccidentExpense`, `AccidentStepHistory` | Phase 3-B |
| `MaintenanceModule` | `MaintenanceRecord` | Phase 3-B |
| `TasksModule` | `Task` | Phase 3-B |
| `ScoringModule` | `DriverScoreEvent`, `VehicleScoreEvent` | Phase 4 |
| `SettlementsModule` | `MonthlySettlement`, `SettlementRevenueLine`, `SettlementExpenseLine`, `OwnerSettlementPayment` | Phase 4 |

### Prisma models with no module yet

| Model | Notes |
|-------|-------|
| `VehicleRepossession` | AuditActions defined, full workflow not implemented |
| `Contravention` | Traffic fines — always DRIVER-responsible (D-12) |
| `Immobilization` | Vehicle immobilisation records — `can_manage_immobilization` permission ready |
| `FuelTransaction` | R-08, R-09 defined in ADR — `discrepancyChargeId` FK ready for auto-charge |
| `MileageRecord` | GPS/odometer — pending Carcul integration |
| `VehicleAvailabilityEvent` | Availability calendar — fed by multiple services (D-15) · BREAKDOWN + APPOINTMENT enum values now present |
| `VehicleDriverAssignment` | Assignment history log |
| `VehicleManagerAssignment` | Manager assignment history |
| `SpecialAbsence` | Planned driver absences — `can_manage_special_absence`, `can_approve_special_absence` permissions ready |
| `OwnerPortalVisibilitySettings` | **NEW** — schema V3 — portail visibility config per contract (D-16) |
| `OwnerRentalPayment` | **NEW** — schema V3 — SIMPLE_RENTAL fixed rent payments (D-17) |

---

## Known Limitations

### Infrastructure

| ID | Limitation | Impact | Resolution |
|----|-----------|--------|-----------|
| L-01 | `prisma generate` not run — `@prisma/client` named exports absent | `tsc --noEmit` fails (274 errors); Jest works via `ts-jest isolatedModules` | Run `npx prisma generate` once |
| L-02 | Stub modules export lowercase names (`documentsModule`) → `app.module.ts` TypeScript errors | Compile-time only; resolves when stubs are implemented | Auto-fixed in Phase 3-B |
| L-03 | No E2E tests | Real DB integration not verified | Supertest + test DB in Phase 5 |
| L-04 | No Prisma migration history (`db push` only) | Cannot safely run incremental migrations in production | Create `prisma migrate dev` history before first prod deploy |
| L-05 | `ensureEntriesAhead` not idempotent under concurrent cron runs | Rare duplicate entry attempt (caught by `@@unique`, swallowed) | Add distributed lock (Redis) before scaling to multiple instances |

### Business Logic

| ID | Limitation | Impact |
|----|-----------|--------|
| L-06 | Payment rejection does not reverse DailyEntry allocations | Manual audit required for any wrongly recorded payment |
| L-07 | `DayStatus.ABSENT` / `SpecialAbsence` not handled | Absence days never automatically created |
| L-08 | `VehicleRepossession` module is a stub | Full 3-level repossession workflow (R-14) not implemented |
| L-09 | `ScoringModule` is a stub | Score events never fired; `Driver.scoreValue` always initial 100.0 |
| L-10 | `SettlementsModule` is a stub | Owner financial reporting (R-16–R-19) not implemented |
| L-11 | `PARTNER_FLEET` and `SIMPLE_RENTAL` contract types | Only `OWNERSHIP_PROGRAM` has full payment/DailyEntry logic |
| L-12 | No fuel tracking | R-08/R-09 defined in ADR but `FuelTransaction` CRUD absent |
| L-13 | Notifications fire-and-forget with no retry | Failed push silently swallowed |
| L-14 | No rate-limiting tuning | Default ThrottlerModule config — not tuned for production load |

---

## Architectural Decisions

> Full detail in `docs/ARCHITECTURE_DECISIONS.md`. Summary of decisions that directly affect daily development:

| Code | Decision | Constraint for developers |
|------|----------|--------------------------|
| **D-01** | Modular Monolith — no microservices at MVP | All modules in single NestJS process; no inter-service HTTP calls |
| **D-02** | Prisma 7 — `url` managed by `prisma.config.ts`, not `schema.prisma` | Never add `url = env("DATABASE_URL")` to `datasource` block |
| **D-03** | Polymorphic associations via `(entityType String, entityId String)` | `entityType` values come from `EntityTypes` constant only — no free strings |
| **D-04** | Two named relations `Vehicle ↔ Contract` | `currentContractId` updated only by `ContractsService.activate()` and `.close()` |
| **D-05** | Soft delete on 5 entities only: User, Driver, Owner, Vehicle, Contract | `Payment`, `DailyEntry`, `AuditLog`, `LedgerEntry` are immutable — never deleted |
| **D-06** | `MediaAsset` as central file store | `MediaSource.IN_APP_CAMERA` is the only allowed source for driver uploads — validated in service, not controller |
| **D-07** | Commission snapshots in `MonthlySettlement` | After `status = APPROVED`, all financial fields are frozen |
| **D-08** | DailyEntry as progression unit — no fixed end date | `validatedDays / targetDays` only; contract end date is never a calendar date |
| **D-09** | Permission codes are `String @unique` — not a Prisma enum | Adding a permission = `INSERT` only, no schema migration |
| **D-10** | `LedgerEntry` populated by application, not DB triggers | Every financial service must call `LedgerService.createEntry()` explicitly |
| **D-11** | Score starts at 100.0, tracked via `DriverScoreEvent` / `VehicleScoreEvent` | Score formula not yet defined — see open arbitrage point A |
| **D-12** | Contraventions always DRIVER-responsible | `impactsProfit = false` in settlement expense lines |
| **D-13** | Non-standard deposit requires Admin validation | `isStandardAmount = false` → blocks payment until `adminValidate` called |
| **D-14** | Document versioning via `parentDocId` + `isLatest` | Never hard-delete a document version |
| **D-15** | `VehicleAvailabilityEvent` fed by multiple services | `ImmobilizationsService`, `AccidentsService`, `MaintenanceService` all call `AvailabilityService.recordEvent()` |
| **D-16** | `OwnerPortalVisibilitySettings` per contract, not per owner | One owner can have PARTNER_FLEET + SIMPLE_RENTAL contracts with different visibility rules |
| **D-17** | `SIMPLE_RENTAL` uses `OwnerRentalPayment`, not `MonthlySettlement` | Owner gets fixed rent — no share of driver revenue. Fields: `vehicleInvestmentCost`, `simpleRentalMonthlyAmount`, `ownerPaymentFrequency` |

### Open Architecture Arbitrages

| # | Subject | Options | Priority |
|---|---------|---------|----------|
| A | Driver/vehicle scoring formula | Fixed weights per category vs. Ollama ML | Before Phase 4 |
| B | LedgerEntry granularity | Per payment vs. daily batch summary | Before Phase 4 |
| C | OwnerSettlementPayment.paymentMethod | Add WAVE / ORANGE_MONEY as distinct values? | Before Phase 4 |
| D | `UserPermissionOverride.expiresAt` | Currently nullable (permanent). Force expiry? | Before Phase 3-B |
| E | Settlement generation | Manual by Manager vs. auto-cron on 1st of month | Before Phase 4 |
| I | SIMPLE_RENTAL ROI formula | Gross ROI `(cumRevenue − investmentCost) / investmentCost` vs. net ROI (deducting charges) | Before Phase 4 |
| J | `OwnerRentalPayment.dueDate` generation | Auto-calculated by cron from `ownerPaymentFrequency` vs. manually set per period | Before Phase 4 |

---

## Inviolable Business Rules (quick reference)

```
R-01  validatedDays never decrements — only DailyEntriesService may increment it
R-02  Superior payment → N days VALIDATED + PARTIALLY_PAID surplus (if contract not completed)
R-03  Partial payment → PARTIALLY_PAID only — no validatedDays increment
R-04  Contract end date is never fixed — it extends as days are missed
R-05  Contract cannot activate without depositPaid = true
R-06  Deposit refund only after COMPLETED or TERMINATED
R-07  Deposit usage requires description/justification
R-08  Vehicle delivery inspection → FuelTransaction INITIAL_FULL_TANK required
R-09  Fuel level at return ≠ FULL → auto charge against driver
R-10  Driver photo uploads → MediaSource.IN_APP_CAMERA only (server-validated)
R-11  Accident steps are strictly ordered — only one step at a time
R-12  Towing photo must have plate visible (towingPlateVisible = true)
R-13  Accident expenses ≥ threshold → Super Manager validation required
R-14  Repossession: 3-level workflow — Manager → Super Manager → Admin
R-15  No contract on REPOSSESSED vehicle
R-16  One settlement per (contractId, year, month)
R-17  APPROVED settlement fields are frozen — corrections via new settlement or LedgerEntry
R-18  DRIVER charges in settlement: impactsProfit = false
R-19  Commission snapshots copied at generation — non-modifiable after
R-20  Admin receives only HIGH and CRITICAL notifications
R-21  Owner sees settlements only from status SENT_TO_OWNER
R-22  Expired critical document → notify Admin (not just Managers)
R-23  Expiry reminders sent once each at 30d, 15d, 7d, 1d
```

---

## Next Recommended Phase

### Phase 3-B — Operational Modules

> **Gate condition:** Schema V3 approved (✅ done). Implementation can begin.

**Goal:** Build the operational layer used daily by managers in the field — documents, media, inspections, fuel, incidents, accidents, maintenance, availability, owner portal.

#### Recommended implementation order

| Priority | Module | Key workflow | Depends on |
|----------|--------|-------------|-----------|
| 1 | `MediaModule` | Upload `MediaAsset`, create `Photo` + `PhotoMission` | S3/Supabase env var |
| 2 | `DocumentsModule` | Attach docs to any entity via `(entityType, entityId)`; expiry cron; `notifyOwner` flag | `MediaModule` |
| 3 | `InspectionsModule` | Create from template, double-sign, `linkedHandoverInspectionId` for return comparison | `DocumentsModule`, `FuelModule` |
| 4 | `FuelModule` | R-08 INITIAL_FULL_TANK, R-09 RETURN_CHECK → auto `discrepancyCharge`, `validatedById` | `ChargesModule`, `InspectionsModule` |
| 5 | `AvailabilityModule` | `VehicleAvailabilityEvent` CRUD; BREAKDOWN + APPOINTMENT types; `resolvedAt` tracking | — |
| 6 | `ImmobilizationsModule` | Start/end immobilisation → triggers `AvailabilityEvent(IMMOBILIZED)` | `AvailabilityModule` |
| 7 | `SpecialAbsencesModule` | Driver submits → Manager reviews → SM approves; triggers `AvailabilityEvent(SPECIAL_ABSENCE)` | `AvailabilityModule` |
| 8 | `IncidentsModule` | OPEN → IN_PROGRESS → CLOSED; BREAKDOWN type → triggers `AvailabilityEvent(BREAKDOWN)` | `AvailabilityModule` |
| 9 | `AccidentsModule` | 14-step workflow, `declaredById`, `policeReportNumber`, `insuranceDocumentId`, expenses | `ChargesModule`, `IncidentsModule` |
| 10 | `MaintenanceModule` | Preventive + corrective records, `can_manage_maintenance`, triggers `AvailabilityEvent(MAINTENANCE)` | `AvailabilityModule` |
| 11 | `OwnerPortalModule` | `OwnerPortalVisibilitySettings` CRUD; `OwnerRentalPayment` for SIMPLE_RENTAL; read-only portal routes | `SettlementsModule` stub |

#### Out of scope for Phase 3-B

- Repossessions (Phase 4)
- Settlements / MonthlySettlement (Phase 4)
- Scoring formula (Phase 4)
- Flutter mobile app (Phase 5)
- GPS / Carcul integration (Phase 5)

---

## Phase Roadmap

```
Phase 1        ✅  Foundation & Infrastructure
Phase 2        ✅  Hardening & Unit Tests
Phase 3-A      ✅  Financial Core — Payments, DailyEntries, Charges, Deposits
Phase 3-A.5    ✅  Stabilisation — Completion workflow, KYC integration, Cron
Phase 3-B arch ✅  Architecture finalized — Schema V3, ERD V3, ADR D-16/D-17
Phase 3-B      🔲  Operational — Media, Documents, Inspections, Fuel, Availability,
                   Immobilizations, SpecialAbsences, Incidents, Accidents, Maintenance,
                   OwnerPortal (11 modules)
Phase 4        ❌  Financial Closure — Repossessions, Settlements, Scoring, Analytics
Phase 5        ❌  Flutter Mobile — Admin app, Manager app, Driver app + GPS/Carcul/Wave
Phase 6        ❌  Observability — Monitoring, alerting, CI/CD, E2E tests, load testing
```

---

*This file is the single source of truth for project progress.*  
*Update at the end of every phase before the next begins.*  
*Never delete — append only.*
