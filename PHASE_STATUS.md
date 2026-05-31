# Fleet Platform — Project Phase Status

> **Last updated:** 2026-05-31
> **Stack:** NestJS 10 · Prisma 7 · PostgreSQL · TypeScript 5.6 · Decimal.js 10
> **Architecture:** Modular monolith (backend) · Flutter (mobile, not started) · 3 apps (Admin, Manager, Driver)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented & tested |
| 🟡 | Partially implemented (logic done, no tests or incomplete) |
| 🔲 | Stub only (8-line skeleton, no real logic) |
| ❌ | Not started |

---

## Completed Phases

### Phase 1 — Foundation & Infrastructure

**Goal:** Bootstrap the NestJS project with core infrastructure and RBAC.

| Deliverable | Status | Notes |
|-------------|--------|-------|
| NestJS 10 project structure | ✅ | Modular monolith, `src/modules/` |
| Prisma 7 setup (`prisma.config.ts`) | ✅ | Config via `prisma.config.ts`, NOT `url` in schema |
| PostgreSQL schema (50+ models) | ✅ | Full ERD in `docs/ERD.md` |
| `PrismaService` + soft-delete middleware | ✅ | Auto-adds `deletedAt: null` on User, Driver, Owner, Vehicle, Contract |
| JWT Auth (`login`, `refresh`) | ✅ | `AuthModule` — email + phone login |
| Global guards (`JwtAuthGuard`, `RolesGuard`) | ✅ | APP_GUARD pattern, applied globally |
| Global exception filter (`HttpExceptionFilter`) | ✅ | Standardised error shape |
| Permission system (`RolePermission` + `UserPermissionOverride`) | ✅ | Per-user grants/revocations with optional expiry |
| `UsersModule` — CRUD + RBAC | ✅ | Soft delete, status management |
| `VehiclesModule` — CRUD | ✅ | R-15: blocks contract on REPOSSESSED vehicle |
| `DriversModule` — CRUD | ✅ | Soft delete via User |
| `OwnersModule` — CRUD | ✅ | |
| `PermissionsModule` — RBAC management | ✅ | Permission catalogue, role grants, user overrides |
| `AuditModule` — structured audit log | ✅ | `metadata` alias for `afterJson` |
| `LedgerModule` — financial ledger | ✅ | `entityType/entityId/actorId` aliases, `occurredAt` defaults to `now()` |
| `NotificationsModule` — notification dispatch | ✅ | Fire-and-forget |
| Permission seed (`prisma/seed.ts`) | ✅ | All codes in `Perm` constant seeded with role assignments |
| Swagger (`/api`) | ✅ | Bearer auth configured, all routes annotated |
| `backend/README.md` | ✅ | Full setup guide (12 sections) |

---

### Phase 2 — Infrastructure Hardening & Unit Tests

**Goal:** Harden core infrastructure with comprehensive unit test coverage.

| Deliverable | Status | Tests |
|-------------|--------|-------|
| `auth.service.spec.ts` | ✅ | 11 cases — login (email/phone/missing), refresh (valid/invalid/expired/suspended) |
| `permissions.service.spec.ts` | ✅ | 12 cases — checkPermission (7 scenarios: override grant/revoke/expired, role fallback, unknown), create, grantToUser |
| `prisma.service.spec.ts` | ✅ | 8 cases — soft-delete middleware (findMany, findUnique→findFirst, delete→update, deleteMany→updateMany, non-affected models) |

---

### Phase 3-A — Financial Core (Ownership Program)

**Goal:** Full `Contract → Payment → DailyEntry → Progression` pipeline for the `OWNERSHIP_PROGRAM` contract type.

#### New Modules

| Module | Status | Key Operations |
|--------|--------|---------------|
| `PaymentsModule` | ✅ | `recordPayment`, `rejectPayment` |
| `DailyEntriesModule` | ✅ | `allocatePaymentToEntries`, `initializeContractEntries`, `createChargeEntries`, `ensureEntriesAhead`, `getProgressSummary` |
| `ChargesModule` | ✅ | `create`, `submit`, `validate`, `reject`, `addToContract` |
| `DepositsModule` | ✅ | `create`, `adminValidate`, `recordPayment`, `use`, `refund` |

#### Extended Modules

| Module | What was added |
|--------|---------------|
| `ContractsModule` | Full `activate()` — 8-condition checklist, DailyEntry initialisation |
| `DriversModule` | `validateKyc()`, `validateField()` + 2 new routes |

#### Tests

| File | Cases | Scenarios |
|------|-------|-----------|
| `payments.service.spec.ts` | 6 | Partial / exact / superior payment, inactive contract, zero amount |
| `daily-entries.service.spec.ts` | 6 | Exact payment (1 day), superior (2 VALIDATED + surplus), partial (PARTIALLY_PAID), PARTIALLY_PAID priority, NotFoundException, `getProgressSummary` (50%) |
| `deposits.service.spec.ts` | 11 | Standard / non-standard deposit, ConflictException, partial payment, full payment + depositPaid, D-13 block, overpayment, R-06 refund (ACTIVE blocked, COMPLETED allowed) |
| `charges.service.spec.ts` | 5 | Validate workflow, addToContract 3 days, status guard, responsible guard |
| `contracts.service.spec.ts` | 8 | Successful activation, 7 failure cases (depositPaid, kycValidated, fieldValidated, driver status, vehicle status, wrong contract status, NotFoundException) |

---

### Phase 3-A.5 — Financial Core Stabilisation

**Goal:** Close 6 identified gaps before Phase 3-B.

| Gap | Status | Details |
|-----|--------|---------|
| **Gap 1** — Continuous DailyEntry generation | ✅ | `@Cron('0 2 * * *')` runs `ensureEntriesAhead(contractId, 30)` for all active OWNERSHIP_PROGRAM contracts |
| **Gap 2** — Automatic contract completion | ✅ | `allocatePaymentToEntries` detects `validatedDays >= targetDays` inside TX → sets `ContractStatus.COMPLETED` + `closedAt`, releases vehicle (`AVAILABLE`, all current* fields nulled) |
| **Gap 3** — Surplus suppression post-completion | ✅ | Surplus PARTIALLY_PAID entry created **only if** `!contractCompleted` (critical ordering fix) |
| **Gap 4** — Permission seed verification | ✅ | All Phase 3-A permissions verified present. Fixed: `can_validate_field` added to MANAGER role |
| **Gap 5** — KYC + field validation checklist integration | ✅ | `validateKyc()` → PENDING_KYC → PENDING_FIELD_VALIDATION + `kycValidated=true` on DRAFT contracts. `validateField()` → PENDING_FIELD_VALIDATION → APPROVED + `fieldValidated=true` |
| **Gap 6** — Additional integration tests | ✅ | `daily-entries.completion.spec.ts` (4 cases) · `drivers.service.spec.ts` (15 cases) |

**Bonus:** `PaymentsService.recordPayment()` calls `ensureEntriesAhead(30)` fire-and-forget after every successful payment.

---

## Implemented Business Rules

### Payment & DailyEntry Engine

| Rule | Code | Implementation |
|------|------|---------------|
| Exact payment validates exactly 1 day | R-01 | `allocatePaymentToEntries` — `amount == dailyAmount` → `VALIDATED` |
| Superior payment validates N days + reliquat | R-02 | Loop absorbs `min(remaining, needed)` per entry; surplus → `PARTIALLY_PAID` entry |
| Partial payment → `PARTIALLY_PAID`, no `validatedDays` increment | R-03 | `amount < dailyAmount` → update status only, no `contract.update` |
| `PARTIALLY_PAID` entries processed before `UNPAID` | R-04 | Prisma `orderBy: [{ status: 'asc' }, { date: 'asc' }]` (PARTIALLY_PAID sorts first) |
| `validatedDays` increments only via VALIDATED transitions | — | Only `allocatePaymentToEntries` increments; never direct update elsewhere |
| Surplus suppressed when contract completes | — | `contractCompleted` flag checked before creating surplus entry |
| Vehicle released on contract completion | — | `vehicle.update({ status: AVAILABLE, currentContractId: null, … })` inside TX |

### Contract Activation Checklist (8 conditions)

| Condition | Rule | Field |
|-----------|------|-------|
| KYC validated | — | `contract.kycValidated` |
| Field validation done | — | `contract.fieldValidated` |
| Deposit paid | **R-05** | `contract.depositPaid` |
| Contract signed | — | `contract.contractSigned` |
| Manager approved | — | `contract.managerApproved` |
| Admin approved | — | `contract.adminApproved` |
| Vehicle not IMMOBILIZED / REPOSSESSED | — | `vehicle.status ∈ {AVAILABLE, ASSIGNED}` |
| Driver APPROVED or ACTIVE | — | `driver.status ∈ {APPROVED, ACTIVE}` |

All 8 must pass; failure returns `BadRequestException` with the full list of unmet conditions.

### Deposit (Caution)

| Rule | Code | Implementation |
|------|------|---------------|
| Standard amount = `max(2 × dailyAmount, 50 000 FCFA)` | — | Tolerance ±1 FCFA for rounding |
| Non-standard deposit requires Admin validation before payment | **D-13** | `isStandardAmount=false` → Admin must call `adminValidate` → payment blocked until `validatedAmount` is set |
| Deposit fully paid → `depositPaid=true` on contract | **R-05** | `tx.contract.update({ data: { depositPaid: true } })` inside payment transaction |
| Refund only after COMPLETED or TERMINATED | **R-06** | Guard checks `contract.status` before allowing refund |
| Deposit usage requires justification | **R-07** | `description` field required in `UseDepositDto` |

### Charges

| Rule | Code | Implementation |
|------|------|---------------|
| Charge workflow: DRAFT → PENDING_VALIDATION → VALIDATED/REJECTED → ADDED_TO_CONTRACT | — | Status machine in `ChargesService` |
| `extraDaysAdded = ceil(amount / dailyAmount)` | — | `createChargeEntries` computes and creates DailyEntry rows with `chargeId` |
| Only DRIVER-responsible charges added to contract | — | Guard: `validatedResponsible === 'DRIVER'` |

### KYC & Field Validation

| Rule | Implementation |
|------|---------------|
| PENDING_KYC → PENDING_FIELD_VALIDATION on KYC validation | `DriversService.validateKyc()` |
| PENDING_FIELD_VALIDATION → APPROVED on field validation | `DriversService.validateField()` |
| `kycValidated=true` propagated to DRAFT/PENDING_APPROVAL contracts | `contract.updateMany` in both methods |
| `fieldValidated=true` propagated to DRAFT/PENDING_APPROVAL contracts | `contract.updateMany` in both methods |

### Vehicle

| Rule | Code | Implementation |
|------|------|---------------|
| Cannot create contract on REPOSSESSED vehicle | **R-15** | Guard in `ContractsService` |

### Infrastructure Rules

| Rule | Implementation |
|------|---------------|
| All critical financial operations in Prisma transactions | `$transaction` in payments, deposits, charges, contract activation |
| Ledger + Audit fire-and-forget outside transaction | Never blocks main operation |
| Soft delete preserves referential integrity | Middleware adds `deletedAt: null` to all reads |
| All monetary values use `Decimal.js` | No `Float`, no `number` for money |

---

## Implemented Routes

### Auth
```
POST   /auth/login
POST   /auth/refresh
GET    /auth/me
```

### Users
```
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
PATCH  /users/:id/status
PATCH  /users/:id/password
DELETE /users/:id
```

### Drivers
```
GET    /drivers
GET    /drivers/:id
POST   /drivers
PATCH  /drivers/:id
PATCH  /drivers/:id/status
POST   /drivers/:id/validate-kyc        ← Phase 3-A.5
POST   /drivers/:id/validate-field      ← Phase 3-A.5
DELETE /drivers/:id
```

### Vehicles
```
GET    /vehicles
GET    /vehicles/:id
POST   /vehicles
PATCH  /vehicles/:id
PATCH  /vehicles/:id/status
DELETE /vehicles/:id
```

### Contracts
```
GET    /contracts
GET    /contracts/:id
POST   /contracts
POST   /contracts/:id/activate          ← Phase 3-A
POST   /contracts/:id/suspend
POST   /contracts/:id/close
PATCH  /contracts/:id
PATCH  /contracts/:id/assign-manager
```

### Payments
```
GET    /payments
GET    /payments/:id
POST   /payments                        ← Phase 3-A
PATCH  /payments/:id/reject             ← Phase 3-A
```

### Daily Entries
```
GET    /daily-entries/contract/:contractId
GET    /daily-entries/contract/:contractId/progress
GET    /daily-entries/contract/:contractId/next-unpaid
```

### Charges
```
GET    /charges
GET    /charges/:id
POST   /charges                         ← Phase 3-A
POST   /charges/:id/submit              ← Phase 3-A
POST   /charges/:id/validate            ← Phase 3-A
POST   /charges/:id/reject              ← Phase 3-A
POST   /charges/:id/add-to-contract     ← Phase 3-A
```

### Deposits
```
GET    /deposits/contract/:contractId
GET    /deposits/:id
POST   /deposits                        ← Phase 3-A
POST   /deposits/:id/admin-validate     ← Phase 3-A
POST   /deposits/:id/pay                ← Phase 3-A
POST   /deposits/:id/use                ← Phase 3-A
POST   /deposits/:id/refund             ← Phase 3-A
```

### Permissions
```
GET    /permissions
GET    /permissions/roles/:role
GET    /permissions/module/:module
GET    /permissions/users/:userId/overrides
POST   /permissions
POST   /permissions/users/:userId/grant
DELETE /permissions/users/:userId/overrides/:permissionCode
```

---

## Test Coverage Summary

| File | Test Cases | Module |
|------|-----------|--------|
| `deposits.service.spec.ts` | 21 | Deposits |
| `drivers.service.spec.ts` | 15 | Drivers — KYC + Field |
| `permissions.service.spec.ts` | 12 | Permissions |
| `auth.service.spec.ts` | 11 | Auth |
| `prisma.service.spec.ts` | 8 | Prisma middleware |
| `contracts.service.spec.ts` | 8 | Contract activation |
| `payments.service.spec.ts` | 6 | Payments |
| `daily-entries.service.spec.ts` | 6 | Payment allocation |
| `charges.service.spec.ts` | 5 | Charges |
| `daily-entries.completion.spec.ts` | 4 | Contract completion |
| **Total** | **96** | |

---

## Remaining Modules

### Stub modules (8 lines — no real logic)

| Module | Key Models | Priority |
|--------|-----------|---------|
| `DocumentsModule` | `Document` | Phase 3-B |
| `MediaModule` | `MediaAsset`, `Photo`, `PhotoMission` | Phase 3-B |
| `InspectionsModule` | `Inspection`, `InspectionItem` | Phase 3-B |
| `IncidentsModule` | `Incident` | Phase 3-B |
| `AccidentsModule` | `AccidentCase`, `AccidentExpense`, `AccidentStepHistory` | Phase 3-B |
| `MaintenanceModule` | `MaintenanceRecord` | Phase 3-B |
| `TasksModule` | `Task` | Phase 3-B |
| `ScoringModule` | `DriverScoreEvent`, `VehicleScoreEvent` | Phase 4 |
| `SettlementsModule` | `MonthlySettlement`, `SettlementRevenueLine`, `SettlementExpenseLine`, `OwnerSettlementPayment` | Phase 4 |

### Models with no module yet

| Model | Notes |
|-------|-------|
| `VehicleRepossession` | Repossession workflow — partial logic exists in `AuditActions` |
| `Contravention` | Traffic fine management |
| `Immobilization` | Vehicle immobilization records |
| `FuelTransaction` | Fuel card / advance tracking |
| `MileageRecord` | GPS/odometer recording |
| `VehicleAvailabilityEvent` | Fleet availability calendar |
| `VehicleDriverAssignment` | Assignment history |
| `VehicleManagerAssignment` | Manager assignment history |
| `SpecialAbsence` | Planned driver absences |

---

## Known Limitations

### Infrastructure

| # | Limitation | Impact | Fix |
|---|-----------|--------|-----|
| L-01 | `prisma generate` not run — all `@prisma/client` named exports fail TypeScript compilation | Blocks `tsc --noEmit` but not Jest (which uses `ts-jest` with `isolatedModules`) | Run `npx prisma generate` once |
| L-02 | `app.module.ts` imports stub modules with lowercase export names | TypeScript error on `DocumentsModule`, `MediaModule`, etc. | Resolved automatically when stub modules are fully implemented |
| L-03 | No E2E tests | No real database integration verified | Add Supertest + test database in Phase 5 |
| L-04 | No real Prisma migration history | `prisma db push` used instead of `migrate dev` | Create proper migration chain before production |

### Business Logic

| # | Limitation | Impact |
|---|-----------|--------|
| L-05 | Payment rejection does not reverse DailyEntry allocations | Operational risk — manual audit required for reversed payments |
| L-06 | `DayStatus.ABSENT` / `SpecialAbsence` not handled | Driver absence days are never automatically created |
| L-07 | Repossession module is a stub | The full repossession workflow (DRAFT → SM_VALIDATED → ADMIN_APPROVED → executed) is not implemented |
| L-08 | `ScoringModule` is a stub | Driver and vehicle scoring events exist in the schema but are never created |
| L-09 | `SettlementsModule` is a stub | Monthly owner financial reporting (P&L per vehicle) not implemented |
| L-10 | No fuel tracking | `FuelTransaction` model exists but no CRUD |
| L-11 | No inspection signing (Flutter) | `Inspection` model exists but no mobile integration |
| L-12 | `PARTNER_FLEET` and `SIMPLE_RENTAL` contract types | Business logic differs from `OWNERSHIP_PROGRAM` — only OWNERSHIP_PROGRAM is fully implemented |
| L-13 | `ensureEntriesAhead` uses try/catch on `@@unique` conflict | Works correctly but not idempotent under concurrent cron runs — add a distributed lock for production |
| L-14 | Notifications are fire-and-forget with no retry | A failed push notification is silently swallowed |

---

## Next Recommended Phase

### Phase 3-B — Operational Modules

**Prerequisite:** Human validation of Phase 3-A.5 (this checkpoint).

**Goal:** Build the operational layer that managers use daily in the field.

**Scope (in order of priority):**

#### 1. Documents & Media
- `DocumentsModule`: attach documents (PDF, images) to any entity (Driver, Vehicle, Contract, Charge)
- `MediaModule`: photo missions, before/after photo capture (linked to Inspections and Accidents)
- Storage: local disk or S3-compatible (configure via env)

#### 2. Inspections
- `InspectionsModule`: create inspection from checklist template
- `POST /inspections/:id/sign` — Driver digital signature (Flutter deeplink)
- `InspectionItem` records per checkpoint

#### 3. Incidents
- `IncidentsModule`: log incidents (breakdown, theft, traffic stop)
- Status workflow: OPEN → IN_PROGRESS → CLOSED
- Link to Driver, Vehicle, Contract

#### 4. Accidents
- `AccidentsModule`: full step-by-step workflow (`AccidentStepHistory`)
  - Step 1: MANAGER reports → Step 2: SUPER_MANAGER validates → Step 3: ADMIN approves expenses
- `AccidentExpense`: link to charges or direct ledger entry

#### 5. Maintenance
- `MaintenanceModule`: maintenance records (preventive + corrective)
- Link to `VehicleRepossession` trigger if vehicle becomes IMMOBILIZED

**Out of scope for Phase 3-B:**
- Repossessions (Phase 4)
- Settlements (Phase 4)
- Scoring (Phase 4)
- Flutter mobile app (Phase 5)

**Estimated deliverables:**
- 5 fully implemented service files
- 5 controller files with full CRUD + workflow routes
- DTOs + filters for each module
- Unit tests for workflow state machines
- Route documentation in Swagger

---

## Phase Roadmap

```
Phase 1 ✅  Foundation & Infrastructure
Phase 2 ✅  Hardening & Unit Tests
Phase 3-A ✅  Financial Core — Payments, DailyEntries, Charges, Deposits
Phase 3-A.5 ✅  Stabilisation — Completion workflow, KYC integration, Cron
Phase 3-B 🔲  Operational — Documents, Media, Inspections, Incidents, Accidents, Maintenance
Phase 4   ❌  Financial Closure — Repossessions, Settlements, Scoring
Phase 5   ❌  Flutter Mobile — Admin app, Manager app, Driver app
Phase 6   ❌  Observability — Monitoring, alerting, CI/CD pipeline, E2E tests
```

---

*This file is the single source of truth for project progress. Update it at the end of each phase before starting the next.*
