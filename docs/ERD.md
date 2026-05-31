# ERD Logique & Structure Backend NestJS — V3
# Fleet Platform · 47 modèles · 59 enums
# Mis à jour : Phase 3-B Architecture Finalization (2026-05-31)

---

## Diagramme entité-relation (Mermaid)

```mermaid
erDiagram

    %% ═══════════════════════════════════════════════
    %% GROUPE 1 — IDENTITÉ & ACCÈS
    %% ═══════════════════════════════════════════════

    User {
        uuid    id           PK
        enum    role
        string  firstName
        string  lastName
        string  email        UK
        string  phone        UK
        string  passwordHash
        enum    status
        string  fcmToken
        datetime deletedAt
    }

    Permission {
        uuid   id     PK
        string code   UK
        string name
        enum   module
        bool   isActive
    }

    RolePermission {
        uuid id          PK
        enum role
        uuid permissionId FK
        bool isGranted
    }

    UserPermissionOverride {
        uuid     id           PK
        uuid     userId       FK
        uuid     permissionId FK
        bool     isGranted
        datetime expiresAt
    }

    Driver {
        uuid   id          PK
        uuid   userId      FK
        enum   status
        float  scoreValue
        string idCardNumber
        string licenseNumber
    }

    DriverKYC {
        uuid id          PK
        uuid driverId    FK
        bool fullNameVerified
        bool idCardVerified
        bool licenseVerified
        bool phoneVerified
    }

    DriverFieldValidation {
        uuid   id        PK
        uuid   driverId  FK
        bool   homeVisitDone
        float  gpsLocationLat
        float  gpsLocationLng
        enum   status
    }

    Owner {
        uuid   id     PK
        uuid   userId FK
        enum   type
        string name
        string email
        string phone
        enum   status
    }

    %% ═══════════════════════════════════════════════
    %% GROUPE 2 — VÉHICULE & AFFECTATIONS
    %% ═══════════════════════════════════════════════

    Vehicle {
        uuid   id               PK
        uuid   ownerId          FK
        string plateNumber      UK
        string vin              UK
        string brand
        string model
        int    year
        enum   status
        uuid   currentManagerId FK
        uuid   currentDriverId  FK
        uuid   currentContractId FK "unique"
        string carculVehicleId
        float  scoreValue
        datetime deletedAt
    }

    VehicleManagerAssignment {
        uuid     id        PK
        uuid     vehicleId FK
        uuid     managerId FK
        datetime startDate
        datetime endDate
        bool     isActive
    }

    VehicleDriverAssignment {
        uuid     id         PK
        uuid     vehicleId  FK
        uuid     driverId   FK
        uuid     contractId FK
        datetime startDate
        datetime endDate
        bool     isActive
        enum     source
        json     scheduleRules
    }

    VehicleAvailabilityEvent {
        uuid     id               PK
        uuid     vehicleId        FK
        uuid     contractId       FK
        enum     type
        datetime startDate
        datetime endDate
        string   sourceEntityType
        string   sourceEntityId
        datetime resolvedAt
        uuid     resolvedById     FK
    }

    %% ═══════════════════════════════════════════════
    %% GROUPE 3 — CONTRAT
    %% ═══════════════════════════════════════════════

    Contract {
        uuid    id                        PK
        enum    type
        enum    status
        uuid    vehicleId                 FK
        uuid    driverId                  FK
        uuid    ownerId                   FK
        string  managerId
        decimal dailyAmount
        int     targetDays
        int     validatedDays
        int     restDay
        enum    mgmtFeeType
        decimal mgmtFeePercentage
        decimal mgmtFeeFixed
        enum    mgmtFeeBase
        decimal vehicleInvestmentCost     "SIMPLE_RENTAL: base ROI"
        decimal simpleRentalMonthlyAmount "SIMPLE_RENTAL: loyer fixe owner"
        enum    ownerPaymentFrequency     "MONTHLY|WEEKLY|BIWEEKLY|CUSTOM"
        bool    kycValidated
        bool    fieldValidated
        bool    depositPaid
        bool    contractSigned
        bool    adminApproved
        string  contractNumber            UK
        uuid    parentContractId          FK
        datetime deletedAt
    }

    OwnerPortalVisibilitySettings {
        uuid id              PK
        uuid contractId      FK "unique"
        bool showDailyEntries
        bool showDriverPayments
        bool showCharges
        bool showGrossRevenue
        bool showDriverName
        bool showVehicleDetails
        bool showGps
        bool showDocuments
        bool showAccidents
        bool showMaintenance
        bool showNotifications
        bool showRoi
    }

    OwnerRentalPayment {
        uuid    id             PK
        uuid    contractId     FK
        uuid    ownerId        FK
        decimal expectedAmount
        decimal actualAmount
        enum    status         "PENDING|PAID|LATE|DISPUTED"
        int     periodMonth
        int     periodYear
        datetime dueDate
        datetime paidAt
        enum    paymentMethod
        uuid    recordedById   FK
    }

    %% ═══════════════════════════════════════════════
    %% GROUPE 4 — FINANCE
    %% ═══════════════════════════════════════════════

    Payment {
        uuid    id              PK
        uuid    contractId      FK
        uuid    vehicleId       FK
        uuid    driverId        FK
        decimal amount
        enum    source
        enum    status
        int     validatedDaysCount
        datetime paidAt
        uuid    createdById     FK
    }

    DailyEntry {
        uuid    id           PK
        uuid    contractId   FK
        uuid    vehicleId
        uuid    driverId
        date    date
        enum    status
        decimal expectedAmount
        decimal paidAmount
        uuid    paymentId    FK
        enum    chargeType
        bool    isRestDay
        bool    isExcused
    }

    Charge {
        uuid    id                  PK
        enum    type
        enum    status
        decimal amount
        decimal paidAmount
        uuid    vehicleId           FK
        uuid    contractId          FK
        uuid    driverId            FK
        enum    proposedResponsible
        enum    validatedResponsible
        uuid    createdById         FK
        uuid    validatedById       FK
        uuid    incidentId          FK
        int     extraDaysAdded
        string  rejectionReason
    }

    Deposit {
        uuid    id                 PK
        uuid    contractId         FK "unique"
        decimal recommendedAmount
        decimal requestedAmount
        decimal validatedAmount
        decimal paidAmount
        decimal remainingAmount
        decimal usedAmount
        decimal refundedAmount
        enum    status
        bool    isStandardAmount
        uuid    proposedById
        uuid    adminValidatedById
    }

    DepositTransaction {
        uuid    id        PK
        uuid    depositId FK
        enum    type
        decimal amount
        string  description
    }

    Contravention {
        uuid    id        PK
        uuid    vehicleId FK
        uuid    driverId  FK
        decimal amount
        enum    source
        string  carculRef
        datetime date
        bool    isPaid
    }

    LedgerEntry {
        uuid    id           PK
        uuid    contractId
        uuid    vehicleId
        uuid    ownerId
        enum    entryType
        enum    direction
        decimal amount
        string  currency
        string  sourceType
        string  sourceId
        datetime occurredAt
    }

    %% ═══════════════════════════════════════════════
    %% GROUPE 5 — OPÉRATIONS
    %% ═══════════════════════════════════════════════

    Immobilization {
        uuid     id          PK
        uuid     vehicleId   FK
        uuid     contractId  FK
        enum     responsible
        enum     status
        string   reason
        datetime startDate
        datetime actualEnd
        uuid     createdById FK
        uuid     incidentId  FK
    }

    SpecialAbsence {
        uuid     id             PK
        uuid     driverId       FK
        uuid     contractId     FK
        string   reason
        datetime startDate
        int      estimatedDays
        enum     status
        uuid     reviewedById
        uuid     smValidatedById
    }

    MaintenanceRecord {
        uuid    id             PK
        uuid    vehicleId      FK
        enum    type
        enum    status
        int     mileageAtService
        datetime scheduledAt
        datetime completedAt
        decimal  cost
    }

    MileageRecord {
        uuid     id          PK
        uuid     vehicleId   FK
        uuid     driverId    FK
        int      mileage
        string   photoUrl
        datetime recordedAt
        enum     source
        bool     isValidated
    }

    FuelTransaction {
        uuid     id                  PK
        uuid     vehicleId           FK
        uuid     contractId          FK
        uuid     driverId            FK
        enum     type
        enum     fuelLevel
        decimal  amount
        float    liters
        string   photoUrl
        enum     responsible
        uuid     inspectionId        FK
        uuid     discrepancyChargeId FK "R-09 auto-charge"
        uuid     validatedById       FK
        datetime validatedAt
        datetime recordedAt
    }

    %% ═══════════════════════════════════════════════
    %% GROUPE 6 — INCIDENTS & ACCIDENTS
    %% ═══════════════════════════════════════════════

    Incident {
        uuid     id          PK
        enum     type
        enum     status
        enum     severity
        uuid     vehicleId   FK
        uuid     driverId    FK
        string   managerId
        string   description
        datetime occurredAt
    }

    AccidentCase {
        uuid     id                  PK
        uuid     incidentId          FK "unique"
        string   insuranceFileNumber
        enum     currentStep
        enum     status
        string   towingCompany
        decimal  towingCost
        string   insuranceCompany
        datetime vehicleReturnedAt
        uuid     declaredById        FK
        string   policeReportNumber
        int      estimatedRepairDays
        datetime repairDeadline
        uuid     insuranceDocumentId FK "→ MediaAsset"
    }

    AccidentStepHistory {
        uuid     id             PK
        uuid     accidentCaseId FK
        enum     step
        datetime completedAt
        string   completedById
        string   notes
    }

    AccidentExpense {
        uuid    id             PK
        uuid    accidentCaseId FK
        enum    type
        decimal amount
        enum    responsible
        bool    isPaid
        uuid    validatedById
        string  rejectionReason
    }

    %% ═══════════════════════════════════════════════
    %% GROUPE 7 — MÉDIAS (fichiers centralisés)
    %% ═══════════════════════════════════════════════

    MediaAsset {
        uuid     id              PK
        string   fileUrl
        string   thumbnailUrl
        string   mimeType
        int      fileSize
        enum     mediaType
        enum     source
        string   hash
        float    gpsLat
        float    gpsLng
        datetime takenAt
        datetime serverTimestamp
        string   entityType
        string   entityId
    }

    PhotoMission {
        uuid     id           PK
        uuid     vehicleId    FK
        uuid     driverId     FK
        enum     type
        enum     status
        datetime dueDate
        int      reminderCount
        string   incidentId
    }

    Photo {
        uuid   id            PK
        uuid   mediaAssetId  FK "unique"
        uuid   missionId     FK
        uuid   inspectionId  FK
        string captureContext
    }

    Inspection {
        uuid     id                          PK
        enum     type
        enum     status
        uuid     vehicleId                   FK
        uuid     contractId                  FK
        string   driverId
        string   managerId
        enum     fuelLevelIn
        enum     fuelLevelOut
        int      mileageIn
        int      mileageOut
        datetime driverSignedAt
        datetime managerSignedAt
        uuid     linkedHandoverInspectionId  FK "self: RETURN → DELIVERY"
        string   returnComparisonNotes
    }

    InspectionItem {
        uuid   id           PK
        uuid   inspectionId FK
        string itemKey
        string label
        enum   status
        string comment
    }

    Document {
        uuid     id               PK
        uuid     mediaAssetId     FK "unique"
        enum     entityType
        string   entityId
        enum     type
        datetime validFrom
        datetime validUntil
        bool     alwaysValid
        enum     status
        bool     isCritical
        datetime reminder30SentAt
        datetime reminder15SentAt
        datetime reminder7SentAt
        datetime reminder1SentAt
        int      version
        bool     isLatest
        uuid     parentDocId      FK
    }

    %% ═══════════════════════════════════════════════
    %% GROUPE 8 — REPRISE VÉHICULE
    %% ═══════════════════════════════════════════════

    VehicleRepossession {
        uuid     id                PK
        uuid     vehicleId         FK
        uuid     contractId        FK "unique"
        enum     status
        string   reason
        uuid     proposedById
        uuid     smValidatedById
        uuid     adminApprovedById
        decimal  repairCost
        datetime repossessionDate
    }

    %% ═══════════════════════════════════════════════
    %% GROUPE 9 — RELEVÉ MENSUEL (PARTNER_FLEET)
    %% ═══════════════════════════════════════════════

    MonthlySettlement {
        uuid    id                      PK
        uuid    vehicleId               FK
        uuid    contractId              FK
        uuid    ownerId                 FK
        int     year
        int     month
        decimal totalRevenue
        decimal driverExpenses
        decimal ownerExpenses
        decimal companyExpenses
        decimal maintenanceCosts
        decimal totalExpenses
        decimal grossProfit
        enum    mgmtFeeTypeSnapshot
        enum    mgmtFeeBaseSnapshot
        decimal mgmtFeePercentageSnapshot
        decimal mgmtFeeFixedSnapshot
        decimal managementCommission
        decimal ownerAmountDue
        decimal ownerAmountPaid
        decimal ownerAmountBalance
        enum    status
    }

    SettlementRevenueLine {
        uuid    id           PK
        uuid    settlementId FK
        uuid    paymentId    FK
        datetime date
        decimal amount
        string  driverId
    }

    SettlementExpenseLine {
        uuid    id           PK
        uuid    settlementId FK
        uuid    chargeId     FK
        uuid    maintenanceId FK
        datetime date
        decimal amount
        enum    category
        enum    responsible
        bool    impactsProfit
    }

    OwnerSettlementPayment {
        uuid    id           PK
        uuid    settlementId FK
        uuid    ownerId
        decimal amount
        datetime paidAt
        enum    paymentMethod
        string  reference
        uuid    recordedById
    }

    %% ═══════════════════════════════════════════════
    %% GROUPE 10 — TÂCHES & NOTIFICATIONS
    %% ═══════════════════════════════════════════════

    Task {
        uuid     id                PK
        enum     type
        enum     status
        enum     priority
        string   title
        uuid     createdById       FK
        uuid     assignedToId      FK
        enum     relatedEntityType
        string   relatedEntityId
        datetime dueDate
    }

    Notification {
        uuid     id       PK
        uuid     userId   FK
        enum     type
        string   title
        string   message
        enum     priority
        string   entityType
        string   entityId
        datetime readAt
        bool     fcmSent
    }

    %% ═══════════════════════════════════════════════
    %% GROUPE 11 — SCORING & AUDIT
    %% ═══════════════════════════════════════════════

    DriverScoreEvent {
        uuid  id          PK
        uuid  driverId    FK
        string category
        float  impact
        float  scoreBefore
        float  scoreAfter
        string entityType
        string entityId
    }

    VehicleScoreEvent {
        uuid  id        PK
        uuid  vehicleId FK
        string category
        float  impact
        float  scoreBefore
        float  scoreAfter
    }

    AuditLog {
        uuid   id         PK
        uuid   actorId    FK
        string action
        string entityType
        string entityId
        json   beforeJson
        json   afterJson
        string ipAddress
    }

    %% ═══════════════════════════════════════════════
    %% RELATIONS
    %% ═══════════════════════════════════════════════

    %% ── Identité & RBAC ─────────────────────────
    User ||--o| Driver                   : "profil_driver"
    User ||--o| Owner                    : "profil_owner"
    User ||--o{ UserPermissionOverride   : "overrides"
    User ||--o{ RolePermission           : "role_default (via enum)"
    Permission ||--o{ RolePermission     : "rôles"
    Permission ||--o{ UserPermissionOverride : "exceptions"

    %% ── Driver ──────────────────────────────────
    Driver ||--o| DriverKYC              : "kyc"
    Driver ||--o| DriverFieldValidation  : "terrain"
    Driver ||--o{ VehicleDriverAssignment: "affectations"
    Driver ||--o{ Contract               : "contrats"
    Driver ||--o{ Payment                : "paiements"
    Driver ||--o{ Charge                 : "charges"
    Driver ||--o{ SpecialAbsence         : "absences"
    Driver ||--o{ PhotoMission           : "missions"
    Driver ||--o{ MileageRecord          : "kilométrages"
    Driver ||--o{ FuelTransaction        : "carburant"
    Driver ||--o{ Contravention          : "contraventions"
    Driver ||--o{ DriverScoreEvent       : "score"

    %% ── Owner ───────────────────────────────────
    Owner ||--o{ Vehicle                 : "possède"
    Owner ||--o{ Contract                : "contrats"
    Owner ||--o{ MonthlySettlement       : "relevés"
    Owner ||--o{ OwnerRentalPayment      : "versements_rental"

    %% ── Vehicle ─────────────────────────────────
    Vehicle ||--o{ VehicleManagerAssignment  : "historique_managers"
    Vehicle ||--o{ VehicleDriverAssignment   : "historique_drivers"
    Vehicle ||--o{ Contract                  : "contrats_historique"
    Vehicle ||--o| Contract                  : "contrat_courant"
    Vehicle ||--o{ Incident                  : "incidents"
    Vehicle ||--o{ Immobilization            : "immobilisations"
    Vehicle ||--o{ MaintenanceRecord         : "maintenances"
    Vehicle ||--o{ MileageRecord             : "kilométrages"
    Vehicle ||--o{ FuelTransaction           : "carburant"
    Vehicle ||--o{ PhotoMission              : "missions_photo"
    Vehicle ||--o{ Inspection                : "inspections"
    Vehicle ||--o{ Contravention             : "contraventions"
    Vehicle ||--o{ VehicleRepossession       : "reprises"
    Vehicle ||--o{ VehicleScoreEvent         : "score"
    Vehicle ||--o{ MonthlySettlement         : "relevés"
    Vehicle ||--o{ VehicleAvailabilityEvent  : "calendrier"

    %% ── Contract ────────────────────────────────
    Contract ||--o{ Payment                       : "paiements"
    Contract ||--o{ DailyEntry                    : "jours_calendrier"
    Contract ||--o{ Charge                        : "charges"
    Contract ||--o| Deposit                       : "caution"
    Contract ||--o{ Immobilization                : "immobilisations"
    Contract ||--o{ Inspection                    : "inspections"
    Contract ||--o{ SpecialAbsence                : "absences"
    Contract ||--o{ FuelTransaction               : "carburant"
    Contract ||--o{ VehicleDriverAssignment       : "affectations"
    Contract ||--o{ VehicleAvailabilityEvent      : "calendrier"
    Contract ||--o| VehicleRepossession           : "reprise"
    Contract ||--o{ MonthlySettlement             : "relevés"
    Contract ||--o| OwnerPortalVisibilitySettings : "portail_owner"
    Contract ||--o{ OwnerRentalPayment            : "versements_owner"
    Contract }o--o| Contract                      : "succession"

    %% ── Finance ─────────────────────────────────
    Payment ||--o{ DailyEntry            : "couvre"
    Payment ||--o{ SettlementRevenueLine : "dans_relevé"
    Deposit ||--o{ DepositTransaction    : "mouvements"
    Charge  ||--o{ SettlementExpenseLine : "dans_relevé"

    %% ── Incidents & Accidents ───────────────────
    Incident ||--o| AccidentCase              : "dossier"
    Incident ||--o{ Charge                    : "charges"
    Incident ||--o{ Immobilization            : "immobilisations"
    AccidentCase ||--o{ AccidentStepHistory   : "étapes"
    AccidentCase ||--o{ AccidentExpense       : "dépenses"
    AccidentCase }o--o| User                  : "déclaré_par"
    AccidentCase }o--o| MediaAsset            : "doc_assurance"

    %% ── Fuel & Inspection ────────────────────────
    FuelTransaction }o--o| Charge             : "discrepancy_charge"
    Inspection }o--o| Inspection              : "retour_vs_remise"

    %% ── Médias ──────────────────────────────────
    MediaAsset ||--o| Photo              : "wrapper_photo"
    MediaAsset ||--o| Document           : "wrapper_document"
    PhotoMission ||--o{ Photo            : "photos"
    Inspection ||--o{ InspectionItem     : "checklist"
    Inspection ||--o{ Photo              : "photos"
    Inspection ||--o{ FuelTransaction    : "carburant"
    MaintenanceRecord ||--o{ SettlementExpenseLine : "dans_relevé"
    Document }o--o| Document             : "versioning"

    %% ── Relevé mensuel ──────────────────────────
    MonthlySettlement ||--o{ SettlementRevenueLine  : "recettes"
    MonthlySettlement ||--o{ SettlementExpenseLine  : "dépenses"
    MonthlySettlement ||--o{ OwnerSettlementPayment : "versements"

    %% ── Tâches, Notifs, Audit ───────────────────
    User ||--o{ Notification             : "notifications"
    User ||--o{ Task                     : "créées"
    User ||--o{ Task                     : "assignées"
    User ||--o{ AuditLog                 : "actions_auditées"
```

---

## Structure Backend NestJS — Modular Monolith V2

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── modules/
│   │
│   │   ── FONDATIONS ────────────────────────────────────────────────────────
│   │
│   │   ├── auth/                         # JWT, login multi-app, refresh tokens
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/               # jwt.strategy, local.strategy
│   │   │   └── dto/
│   │   │
│   │   ├── users/                        # CRUD users + gestion compte
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── permissions/                  # Moteur RBAC : Permission, RolePermission, Override
│   │   │   ├── permissions.module.ts
│   │   │   ├── permissions.controller.ts # CRUD permissions (Admin seulement)
│   │   │   ├── permissions.service.ts    # resolve: checkPermission(userId, code)
│   │   │   ├── permissions.guard.ts      # @RequirePermission('can_validate_charge')
│   │   │   └── permissions.decorator.ts
│   │   │
│   │   ├── owners/                       # Propriétaires + profil investisseur
│   │   │   ├── owners.module.ts
│   │   │   ├── owners.controller.ts
│   │   │   └── owners.service.ts
│   │   │
│   │   ── VÉHICULE & AFFECTATIONS ───────────────────────────────────────────
│   │   │
│   │   ├── vehicles/                     # Véhicules + statuts
│   │   │   ├── vehicles.module.ts
│   │   │   ├── vehicles.controller.ts
│   │   │   └── vehicles.service.ts
│   │   │
│   │   ├── manager-assignments/          # Affectations Manager ↔ Véhicule
│   │   │   └── manager-assignments.service.ts
│   │   │
│   │   ├── driver-assignments/           # Affectations Chauffeur ↔ Véhicule
│   │   │   └── driver-assignments.service.ts
│   │   │
│   │   ├── availability/                 # VehicleAvailabilityEvent — calendrier opérationnel
│   │   │   └── availability.service.ts  # Alimenté par Immobilization/SpecialAbsence/etc.
│   │   │
│   │   ── DRIVERS ────────────────────────────────────────────────────────────
│   │   │
│   │   ├── drivers/                      # Chauffeurs + KYC + validation terrain
│   │   │   ├── drivers.module.ts
│   │   │   ├── drivers.controller.ts
│   │   │   ├── drivers.service.ts
│   │   │   ├── kyc.service.ts
│   │   │   └── field-validation.service.ts
│   │   │
│   │   ── CONTRATS & FINANCE ────────────────────────────────────────────────
│   │   │
│   │   ├── contracts/                    # Contrats (3 types) + checklist pré-activation
│   │   │   ├── contracts.module.ts
│   │   │   ├── contracts.controller.ts
│   │   │   ├── contracts.service.ts
│   │   │   └── contracts-activation.service.ts
│   │   │
│   │   ├── payments/                     # Paiements + calcul jours validés
│   │   │   ├── payments.module.ts
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   └── daily-entries.service.ts  # Moteur progression DailyEntry
│   │   │
│   │   ├── charges/                      # Charges additionnelles + workflow validation
│   │   │   ├── charges.module.ts
│   │   │   ├── charges.controller.ts
│   │   │   └── charges.service.ts
│   │   │
│   │   ├── deposits/                     # Caution + mouvements + validation Admin
│   │   │   ├── deposits.module.ts
│   │   │   └── deposits.service.ts
│   │   │
│   │   ├── contraventions/               # Contraventions (Carcul + manuel)
│   │   │   ├── contraventions.module.ts
│   │   │   └── contraventions.service.ts
│   │   │
│   │   ├── settlements/                  # Relevé mensuel PARTNER_FLEET
│   │   │   ├── settlements.module.ts
│   │   │   ├── settlements.controller.ts
│   │   │   ├── settlement-calculator.service.ts  # Calcul montants + commission
│   │   │   ├── settlement-workflow.service.ts    # DRAFT→APPROVED→PAID
│   │   │   └── owner-portal.controller.ts        # Routes propriétaire (read-only)
│   │   │
│   │   ├── ledger/                       # Grand livre financier (préparatoire)
│   │   │   ├── ledger.module.ts
│   │   │   └── ledger.service.ts         # createEntry() appelé par tous les services financiers
│   │   │
│   │   ── OPÉRATIONS ─────────────────────────────────────────────────────────
│   │   │
│   │   ├── immobilizations/              # Immobilisations véhicule
│   │   │   ├── immobilizations.module.ts
│   │   │   └── immobilizations.service.ts
│   │   │
│   │   ├── special-absences/             # Absences spéciales chauffeurs
│   │   │   └── special-absences.service.ts
│   │   │
│   │   ├── maintenance/                  # Vidanges + maintenance + kilométrage
│   │   │   ├── maintenance.module.ts
│   │   │   ├── maintenance.controller.ts
│   │   │   ├── maintenance.service.ts
│   │   │   └── mileage.service.ts        # Relevés kilométriques + alertes vidange
│   │   │
│   │   ├── fuel/                         # Suivi carburant — remise/retour/remplissage
│   │   │   ├── fuel.module.ts
│   │   │   ├── fuel.controller.ts
│   │   │   └── fuel.service.ts
│   │   │
│   │   ── INCIDENTS & ACCIDENTS ──────────────────────────────────────────────
│   │   │
│   │   ├── incidents/                    # Pannes + incidents
│   │   │   ├── incidents.module.ts
│   │   │   ├── incidents.controller.ts
│   │   │   └── incidents.service.ts
│   │   │
│   │   ├── accidents/                    # Dossiers accident (14 étapes)
│   │   │   ├── accidents.module.ts
│   │   │   ├── accidents.controller.ts
│   │   │   ├── accidents.service.ts
│   │   │   └── accident-steps.service.ts
│   │   │
│   │   ── MÉDIAS & INSPECTIONS ──────────────────────────────────────────────
│   │   │
│   │   ├── media-assets/                 # Store central fichiers — S3/Supabase
│   │   │   ├── media-assets.module.ts
│   │   │   └── media-assets.service.ts   # upload(), getSignedUrl(), validateSource()
│   │   │
│   │   ├── photos/                       # Missions photo + wrapper Photo
│   │   │   ├── photos.module.ts
│   │   │   ├── photos.controller.ts
│   │   │   └── photos.service.ts         # Anti-fraude: IN_APP_CAMERA obligatoire chauffeurs
│   │   │
│   │   ├── inspections/                  # Inspections remise/reprise + checklist
│   │   │   ├── inspections.module.ts
│   │   │   ├── inspections.controller.ts
│   │   │   └── inspections.service.ts
│   │   │
│   │   ├── documents/                    # Documents + versioning + expirations
│   │   │   ├── documents.module.ts
│   │   │   ├── documents.controller.ts
│   │   │   ├── documents.service.ts
│   │   │   └── document-expiry.service.ts  # Cron: rappels 30j/15j/7j/1j
│   │   │
│   │   ── REPRISE & SCORING ───────────────────────────────────────────────────
│   │   │
│   │   ├── repossessions/                # Workflow reprise véhicule (3 niveaux)
│   │   │   ├── repossessions.module.ts
│   │   │   └── repossessions.service.ts
│   │   │
│   │   ├── scoring/                      # Score chauffeur + score véhicule
│   │   │   ├── scoring.module.ts
│   │   │   └── scoring.service.ts
│   │   │
│   │   ── TRANSVERSAL ───────────────────────────────────────────────────────
│   │   │
│   │   ├── tasks/                        # Tâches, rendez-vous, rappels
│   │   │   ├── tasks.module.ts
│   │   │   ├── tasks.controller.ts
│   │   │   └── tasks.service.ts
│   │   │
│   │   ├── notifications/                # Firebase FCM + historique
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   └── fcm.service.ts
│   │   │
│   │   ── INTÉGRATIONS & ANALYTIQUE (Phase 4+) ────────────────────────────
│   │   │
│   │   ├── gps-carcul/                   # Intégration GPS Carcul (Phase 5)
│   │   │   └── carcul.service.ts
│   │   │
│   │   └── analytics/                    # Rapports, rentabilité (Phase 4+)
│   │       └── analytics.service.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts           # @Roles(UserRole.ADMIN)
│   │   │   ├── require-permission.decorator.ts  # @RequirePermission('code')
│   │   │   ├── current-user.decorator.ts    # @CurrentUser()
│   │   │   └── audit.decorator.ts           # @Audit('ACTION_NAME')
│   │   │
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── permissions.guard.ts         # Vérifie Permission.code
│   │   │
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   │
│   │   ├── interceptors/
│   │   │   ├── audit-log.interceptor.ts     # Log auto des actions sensibles
│   │   │   └── transform.interceptor.ts     # Enveloppe réponses API
│   │   │
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   │
│   │   └── utils/
│   │       ├── days-calculator.ts           # Math.floor(amount / dailyAmount)
│   │       ├── score-calculator.ts          # Calcul scores chauffeur + véhicule
│   │       ├── document-expiry.ts           # Check statut documents
│   │       └── decimal.utils.ts             # Helpers Decimal.js
│   │
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── firebase.config.ts
│   │   └── storage.config.ts               # S3/Supabase
│   │
│   └── prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts               # Middleware soft-delete inclus
│
├── prisma/
│   ├── schema.prisma                       # V2 — 45 modèles · 57 enums
│   ├── prisma.config.ts                    # Prisma 7 — URL DB séparée du schema
│   ├── migrations/
│   └── seed.ts
│
├── .env
├── .env.example
└── package.json
```

---

## Dépendances inter-modules (ordre de bootstrap)

```
PrismaModule (global)
  → UsersModule
      → AuthModule (JWT strategies)
      → PermissionsModule (RBAC engine)
  → OwnersModule
  → VehiclesModule
      → ManagerAssignmentsModule
      → DriverAssignmentsModule
      → AvailabilityModule
  → DriversModule
      → KYC (sous-service)
      → FieldValidation (sous-service)
  → ContractsModule
      → PaymentsModule → DailyEntriesService
      → ChargesModule
      → DepositsModule
      → SettlementsModule → LedgerModule
  → MediaAssetsModule (global, requis par Photos + Documents)
      → PhotosModule
      → DocumentsModule → DocumentExpiryService (cron)
      → InspectionsModule
  → FuelModule
  → MaintenanceModule → MileageService
  → ImmobilizationsModule → AvailabilityModule
  → SpecialAbsencesModule → AvailabilityModule
  → IncidentsModule
      → AccidentsModule
  → RepossessionsModule
  → ContraventionsModule
  → ScoringModule
  → TasksModule
  → NotificationsModule (global — FCM)
```
