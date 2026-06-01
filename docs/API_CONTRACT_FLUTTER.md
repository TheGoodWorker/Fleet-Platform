# Fleet Platform — Contrat API pour Flutter

> **Généré le :** 2026-06-01  
> **Version backend :** Phase 4-C (commit `37d8da6`)  
> **Base URL :** `https://[HOST]/api/v1`  
> **Format :** JSON (UTF-8) · Authentification Bearer JWT  
> **Conventions :** REST + verbes métier explicites · Réponse enveloppée `{ success, data, meta }`

---

## Sommaire

1. [Liste complète des endpoints](#1-liste-complète-des-endpoints)
2. [Auth Flutter](#2-auth-flutter)
3. [Rôles et permissions](#3-rôles-et-permissions)
4. [Uploads / Media](#4-uploads--media)
5. [Pagination et filtres](#5-pagination-et-filtres)
6. [Format standard des réponses](#6-format-standard-des-réponses)
7. [Modules prioritaires Flutter](#7-modules-prioritaires-flutter)
8. [Gaps API avant Flutter](#8-gaps-api-avant-flutter)
9. [Recommandation finale](#9-recommandation-finale)

---

## 1. Liste complète des endpoints

> **Légende rôles :** Les rôles sont hiérarchiques — `MANAGER` signifie MANAGER + SUPER_MANAGER + ADMIN.  
> `@` = permission atomique requise en plus du rôle.  
> `PUBLIC` = pas d'authentification requise.

---

### 1.1 Auth · `/auth`

| Méthode | Route | Auth | Rôle min. | Permission | Body DTO | Réponse | Erreurs |
|---------|-------|------|-----------|-----------|----------|---------|---------|
| `POST` | `/auth/login` | PUBLIC | — | — | `LoginDto` | `AuthResponseDto` | 401 identifiants invalides · 429 trop de tentatives (5/min) |
| `POST` | `/auth/refresh` | PUBLIC | — | — | `RefreshTokenDto` | `AuthResponseDto` | 401 token invalide/révoqué |
| `POST` | `/auth/logout` | JWT | tout | — | `LogoutDto` | `{ message }` | 401 non authentifié |
| `GET` | `/auth/me` | JWT | tout | — | — | profil utilisateur | 401 |

**DTOs Auth :**

```typescript
// POST /auth/login
LoginDto {
  email?: string;        // email OU phone obligatoire
  phone?: string;        // format E.164 (+22101234567)
  password: string;      // min 6 caractères
}

// POST /auth/refresh
RefreshTokenDto {
  refreshToken: string;
}

// POST /auth/logout
LogoutDto {
  refreshToken: string;
}

// Réponse login/refresh
AuthResponseDto {
  accessToken: string;   // JWT Bearer
  refreshToken: string;  // à stocker sécurisé (SecureStorage)
  expiresIn: string;     // ex: "1d"
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    role: UserRole;      // ADMIN|SUPER_MANAGER|MANAGER|DRIVER|OWNER
  }
}
```

---

### 1.2 Users · `/users`

| Méthode | Route | Rôle min. | Permission | Body DTO | Query | Réponse |
|---------|-------|-----------|-----------|----------|-------|---------|
| `GET` | `/users` | MANAGER | — | — | `UserFiltersDto` + page/limit | liste paginée |
| `GET` | `/users/:id` | MANAGER | — | — | — | utilisateur |
| `POST` | `/users` | SUPER_MANAGER | `can_manage_users` | `CreateUserDto` | — | utilisateur créé |
| `PATCH` | `/users/:id` | MANAGER | — | `UpdateUserDto` | — | utilisateur modifié |
| `PATCH` | `/users/:id/password` | propriétaire ou ADMIN | — | `ChangePasswordDto` | — | 200 OK |
| `PATCH` | `/users/:id/suspend` | SUPER_MANAGER | `can_manage_users` | — | — | utilisateur suspendu |
| `PATCH` | `/users/:id/activate` | SUPER_MANAGER | `can_manage_users` | — | — | utilisateur activé |
| `DELETE` | `/users/:id` | ADMIN | `can_manage_users` | — | — | soft delete |

**Scoping MANAGER (H-05) :** un MANAGER ne voit que les utilisateurs DRIVER liés à ses contrats.

**Filtres `UserFiltersDto` :** `role` (enum UserRole) · `search` (prénom/nom/email)

---

### 1.3 Owners · `/owners`

| Méthode | Route | Rôle min. | Permission | Body DTO | Query | Réponse |
|---------|-------|-----------|-----------|----------|-------|---------|
| `GET` | `/owners` | MANAGER | — | — | page · limit · search | liste paginée |
| `GET` | `/owners/:id` | MANAGER | — | — | — | propriétaire + véhicules + contrats |
| `POST` | `/owners` | SUPER_MANAGER | — | `CreateOwnerDto` | — | propriétaire créé |
| `PATCH` | `/owners/:id` | SUPER_MANAGER | — | `UpdateOwnerDto` | — | propriétaire modifié |
| `DELETE` | `/owners/:id` | ADMIN | `can_manage_users` | — | — | soft delete |

---

### 1.4 Vehicles · `/vehicles`

| Méthode | Route | Rôle min. | Permission | Body DTO | Query | Réponse |
|---------|-------|-----------|-----------|----------|-------|---------|
| `GET` | `/vehicles` | DRIVER | — | — | `VehicleFiltersDto` + page/limit | liste paginée (scopée rôle) |
| `GET` | `/vehicles/:id` | DRIVER | — | — | — | détail véhicule |
| `POST` | `/vehicles` | SUPER_MANAGER | `can_create_vehicle` | `CreateVehicleDto` | — | véhicule créé |
| `PATCH` | `/vehicles/:id` | SUPER_MANAGER | `can_edit_vehicle` | `UpdateVehicleDto` | — | véhicule modifié |
| `POST` | `/vehicles/:id/assign-manager` | SUPER_MANAGER | `can_assign_vehicle` | `AssignManagerDto` | — | affectation manager |
| `PATCH` | `/vehicles/:id/status` | SUPER_MANAGER | — | — | `?status=` (VehicleStatus) | statut mis à jour |
| `DELETE` | `/vehicles/:id` | ADMIN | `can_delete_vehicle` | — | — | soft delete |

**Scoping :** MANAGER → ses véhicules uniquement · OWNER → ses véhicules uniquement · DRIVER → tous (lecture seule)

**Filtres `VehicleFiltersDto` :** `status` (enum VehicleStatus) · `search` (immatriculation, marque, modèle)

> ⚠️ **Gap G-04 :** `PATCH /vehicles/:id/status` passe le statut en **query param** (`?status=AVAILABLE`) et non en body — comportement non-standard. À gérer côté Flutter.

---

### 1.5 Drivers · `/drivers`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/drivers` | MANAGER | — | — | liste paginée (filtres: status, search) |
| `GET` | `/drivers/:id` | MANAGER | — | — | détail chauffeur + kyc + fieldValidation |
| `POST` | `/drivers` | SUPER_MANAGER | `can_create_driver` | `CreateDriverDto` | profil chauffeur créé |
| `PATCH` | `/drivers/:id` | MANAGER | — | `UpdateDriverDto` | chauffeur modifié |
| `PATCH` | `/drivers/:id/status` | SUPER_MANAGER | — | — | `?status=` (DriverStatus) |
| `POST` | `/drivers/:id/validate-kyc` | SUPER_MANAGER | `can_validate_kyc` | — | 204 No Content |
| `POST` | `/drivers/:id/validate-field` | MANAGER | `can_validate_field` | `ValidateFieldDto` | 204 No Content |
| `DELETE` | `/drivers/:id` | ADMIN | `can_manage_users` | — | soft delete |

> ⚠️ **Gap G-05 :** Pas d'endpoint `GET /drivers/:id/kyc` ni `GET /drivers/:id/field-validation` — Flutter ne peut pas afficher le statut KYC séparément du détail chauffeur. Le détail complet doit être lu via `GET /drivers/:id` (includes).

---

### 1.6 Contracts · `/contracts`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/contracts` | DRIVER | — | — | liste paginée (scopée rôle) |
| `GET` | `/contracts/:id` | DRIVER | — | — | détail contrat |
| `POST` | `/contracts` | SUPER_MANAGER | `can_create_contract` | `CreateContractDto` | contrat DRAFT |
| `PATCH` | `/contracts/:id` | SUPER_MANAGER | — | `UpdateContractDto` | contrat modifié |
| `DELETE` | `/contracts/:id` | ADMIN | — | — | soft delete (DRAFT uniquement) |
| `POST` | `/contracts/:id/activate` | SUPER_MANAGER | `can_activate_contract` | — | contrat ACTIVE |
| `POST` | `/contracts/:id/suspend` | SUPER_MANAGER | — | `{ reason: string }` | contrat SUSPENDED |
| `POST` | `/contracts/:id/close` | SUPER_MANAGER | — | — | contrat TERMINATED |

**Checklist activation (8 conditions, toutes bloquantes) :**
`kycValidated` · `fieldValidated` · `depositPaid` · `contractSigned` · `managerApproved` · `adminApproved` · `vehicle.status ∈ {AVAILABLE,ASSIGNED}` · `driver.status ∈ {APPROVED,ACTIVE}`

> ⚠️ **Gap G-06 :** Pas d'endpoint `GET /contracts/:id/checklist` — Flutter doit lire le contrat complet et déduire les conditions non remplies manuellement.

**Filtres `ContractFiltersDto` :** `vehicleId` · `driverId` · `managerId` · `status` · `type`

---

### 1.7 Daily Entries · `/daily-entries`

| Méthode | Route | Rôle min. | Permission | Query | Réponse |
|---------|-------|-----------|-----------|-------|---------|
| `GET` | `/daily-entries/contract/:contractId` | DRIVER | — | `DailyEntryFiltersDto` + page(default=60) | entrées paginées |
| `GET` | `/daily-entries/contract/:contractId/progress` | DRIVER | — | — | résumé progression |
| `GET` | `/daily-entries/contract/:contractId/next-unpaid` | MANAGER | `can_record_payment` | — | prochaine entrée non payée |

**Réponse progress :**
```json
{
  "validatedDays": 45,
  "targetDays": 365,
  "percentage": 12.33,
  "totalPaid": "1125000",
  "totalAmount": "9125000"
}
```

---

### 1.8 Payments · `/payments`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/payments` | MANAGER | — | — | liste paginée (MANAGER scopé à ses contrats) |
| `GET` | `/payments/:id` | MANAGER | — | — | détail paiement + entrées + contrat |
| `POST` | `/payments` | MANAGER | `can_record_payment` | `CreatePaymentDto` | paiement enregistré |
| `PATCH` | `/payments/:id/reject` | SUPER_MANAGER | — | `RejectPaymentDto` | paiement rejeté |

**`CreatePaymentDto` :**
```typescript
{
  contractId: string;    // UUID
  vehicleId: string;     // UUID
  driverId: string;      // UUID (Driver.id — pas User.id)
  amount: number;        // FCFA, > 0
  source: PaymentSource; // CASH | WAVE | ORANGE_MONEY | BANK_TRANSFER | OTHER
  paidAt: string;        // ISO 8601
  reference?: string;
  notes?: string;
}
```

**`RejectPaymentDto` :** `{ reason: string }`

**Filtres `PaymentFiltersDto` :** `contractId` · `vehicleId` · `driverId` · `from` · `to` (ISO 8601)

---

### 1.9 Charges · `/charges`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/charges` | MANAGER | — | — | liste paginée |
| `GET` | `/charges/:id` | MANAGER | — | — | détail charge |
| `POST` | `/charges` | MANAGER | `can_create_charge` | `CreateChargeDto` | charge DRAFT |
| `POST` | `/charges/:id/submit` | MANAGER | — | — | charge PENDING_VALIDATION |
| `POST` | `/charges/:id/validate` | SUPER_MANAGER | `can_validate_charge` | `ValidateChargeDto` | charge VALIDATED |
| `POST` | `/charges/:id/reject` | SUPER_MANAGER | `can_validate_charge` | `RejectChargeDto` | charge REJECTED |
| `POST` | `/charges/:id/add-to-contract` | SUPER_MANAGER | `can_validate_charge` | `AddToContractDto` | charge ADDED_TO_CONTRACT |

**Workflow :** DRAFT → PENDING_VALIDATION → VALIDATED/REJECTED → ADDED_TO_CONTRACT

---

### 1.10 Deposits · `/deposits`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/deposits/contract/:contractId` | MANAGER | — | — | caution du contrat |
| `GET` | `/deposits/:id` | MANAGER | — | — | détail caution |
| `POST` | `/deposits` | SUPER_MANAGER | `can_validate_deposit` | `CreateDepositDto` | caution créée |
| `POST` | `/deposits/:id/admin-validate` | ADMIN | — | `AdminValidateDepositDto` | validée (hors-barème D-13) |
| `POST` | `/deposits/:id/pay` | MANAGER | `can_validate_deposit` | `RecordDepositPaymentDto` | paiement enregistré |
| `POST` | `/deposits/:id/use` | SUPER_MANAGER | — | `UseDepositDto` | caution utilisée |
| `POST` | `/deposits/:id/refund` | SUPER_MANAGER | — | `RefundDepositDto` | caution remboursée |

> Règle R-06 : remboursement bloqué si contrat ACTIVE. Autorisé sur COMPLETED/TERMINATED.

---

### 1.11 Documents · `/documents`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/documents` | MANAGER | — | — | liste paginée |
| `GET` | `/documents/entity/:entityType/:entityId` | DRIVER | — | `?type=` optionnel | dernières versions |
| `GET` | `/documents/:id` | DRIVER | — | — | document + historique versions |
| `POST` | `/documents` | MANAGER | `can_manage_documents` | `CreateDocumentDto` | document créé |
| `PATCH` | `/documents/:id` | MANAGER | `can_manage_documents` | `UpdateDocumentDto` | document modifié |
| `POST` | `/documents/:id/archive` | SUPER_MANAGER | `can_manage_documents` | — | document archivé |

**Valeurs `entityType` :** `VEHICLE` · `DRIVER` · `CONTRACT` · `INCIDENT` · `ACCIDENT_CASE` · `INSPECTION` · `MAINTENANCE` · `DOCUMENT`

**Filtres `DocumentFiltersDto` :** `entityType` · `entityId` · `type` (DocumentType enum) · `status`

> ⚠️ **Gap G-07 :** `POST /documents` prend une référence vers un `mediaAssetId` dans son DTO, mais Flutter doit d'abord uploader le fichier via `POST /media/upload` pour obtenir l'`assetId`, puis créer le document. Flux en deux étapes — à bien documenter dans l'app.

---

### 1.12 Media · `/media`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `POST` | `/media/upload` | DRIVER | — | `UploadMediaDto` + fichier multipart | MediaAsset créé |
| `GET` | `/media/:id/url` | DRIVER | — | — | `{ url: string }` (URL signée, TTL 15 min) |
| `GET` | `/media/:id` | DRIVER | — | — | détail MediaAsset |
| `GET` | `/media` | MANAGER | — | — | liste paginée |
| `POST` | `/media/photos` | DRIVER | — | `CreatePhotoDto` | Photo créée |
| `POST` | `/media/photo-missions` | MANAGER | `can_create_photo_mission` | `CreatePhotoMissionDto` | mission créée |
| `GET` | `/media/photo-missions` | MANAGER | — | `PhotoMissionFiltersDto` + page/limit | missions paginées |
| `GET` | `/media/photo-missions/:id` | MANAGER | — | — | mission + photos |
| `POST` | `/media/photo-missions/:id/submit` | DRIVER | — | `SubmitPhotoMissionDto` | mission SUBMITTED |
| `POST` | `/media/photo-missions/:id/validate` | MANAGER | `can_validate_photo_mission` | — | mission VALIDATED |

> Voir section [4. Uploads / Media](#4-uploads--media) pour le détail du flux d'upload Flutter.

---

### 1.13 Inspections · `/inspections`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/inspections` | MANAGER | — | — | liste paginée |
| `GET` | `/inspections/:id` | DRIVER | — | — | inspection + items + photos + fuel |
| `GET` | `/inspections/:id/comparison` | MANAGER | — | — | comparaison remise/retour |
| `POST` | `/inspections` | MANAGER | `can_create_inspection` | `CreateInspectionDto` | inspection créée |
| `POST` | `/inspections/:id/add-item` | MANAGER | `can_create_inspection` | `AddInspectionItemDto` | item ajouté |
| `POST` | `/inspections/:id/driver-sign` | DRIVER | — | `SignInspectionDto` | DRIVER_SIGNED |
| `POST` | `/inspections/:id/manager-sign` | MANAGER | `can_sign_inspection` | `SignInspectionDto` | COMPLETED |
| `POST` | `/inspections/:id/link-return` | MANAGER | `can_create_inspection` | `LinkReturnInspectionDto` | lien établi |

**Filtres `InspectionFiltersDto` :** `vehicleId` · `contractId` · `type` · `status`

---

### 1.14 Incidents · `/incidents`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/incidents` | MANAGER | — | — | liste paginée |
| `GET` | `/incidents/:id` | MANAGER | — | — | incident + dossier + charges |
| `POST` | `/incidents` | MANAGER | `can_create_incident` | `CreateIncidentDto` | OPEN |
| `PATCH` | `/incidents/:id` | MANAGER | `can_manage_incident` | `UpdateIncidentDto` | modifié |
| `POST` | `/incidents/:id/in-progress` | MANAGER | `can_manage_incident` | — | IN_PROGRESS |
| `POST` | `/incidents/:id/resolve` | MANAGER | `can_manage_incident` | `ResolveIncidentDto` | RESOLVED |
| `POST` | `/incidents/:id/close` | SUPER_MANAGER | `can_manage_incident` | — | CLOSED |

**Filtres `IncidentFiltersDto` :** `vehicleId` · `driverId` · `type` · `status` · `severity`

---

### 1.15 Accidents · `/accidents`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/accidents` | MANAGER | — | — | liste paginée |
| `GET` | `/accidents/by-incident/:incidentId` | MANAGER | — | — | dossier accident |
| `GET` | `/accidents/:id` | MANAGER | — | — | dossier + étapes + dépenses |
| `POST` | `/accidents` | MANAGER | `can_create_accident` | `CreateAccidentCaseDto` | dossier créé |
| `POST` | `/accidents/:id/advance-step` | MANAGER | `can_advance_accident_step` | `AdvanceStepDto` | étape avancée |
| `POST` | `/accidents/:id/expenses` | MANAGER | `can_advance_accident_step` | `AddExpenseDto` | dépense ajoutée |
| `POST` | `/accidents/:id/expenses/:expenseId/validate` | SUPER_MANAGER | `can_validate_accident_expense` | `ValidateExpenseDto` | dépense validée/rejetée |
| `POST` | `/accidents/:id/expenses/:expenseId/sm-validate` | SUPER_MANAGER | `can_validate_accident_expense` | — | R-13 : ≥ seuil |
| `POST` | `/accidents/:id/close` | SUPER_MANAGER | `can_advance_accident_step` | `CloseAccidentCaseDto` | CLOSED/DISPUTED |

**Filtres `AccidentFiltersDto` :** `vehicleId` · `status` · `currentStep`

**Workflow 14 étapes :** REPORTED → POLICE_REPORT → TOWING → EXPERTISE → REPAIR_QUOTE → INSURANCE_CLAIM → REPAIR_STARTED → REPAIR_COMPLETED → BILLING → PAYMENT_PENDING → PAYMENT_RECEIVED → RESOLVED → CLOSED (+ DISPUTED)

---

### 1.16 Maintenance · `/maintenance`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/maintenance` | MANAGER | — | — | liste paginée |
| `GET` | `/maintenance/:id` | MANAGER | — | — | détail maintenance |
| `POST` | `/maintenance` | MANAGER | `can_manage_maintenance` | `CreateMaintenanceDto` | maintenance planifiée |
| `PATCH` | `/maintenance/:id` | MANAGER | `can_manage_maintenance` | `UpdateMaintenanceDto` | mise à jour |
| `POST` | `/maintenance/:id/complete` | MANAGER | `can_manage_maintenance` | `CompleteMaintenanceDto` | COMPLETED |
| `POST` | `/maintenance/:id/cancel` | MANAGER | `can_manage_maintenance` | — | CANCELLED |
| `GET` | `/maintenance/mileage/records` | MANAGER | — | — | relevés kilométriques paginés |
| `POST` | `/maintenance/mileage/records` | DRIVER | `can_validate_mileage` | `CreateMileageRecordDto` | relevé créé |
| `POST` | `/maintenance/mileage/records/:id/validate` | MANAGER | `can_validate_mileage` | — | relevé validé |

**Filtres `MaintenanceFiltersDto` :** `vehicleId` · `type` · `status`

---

### 1.17 Fuel · `/fuel`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/fuel` | MANAGER | — | — | liste paginée |
| `GET` | `/fuel/vehicle/:vehicleId/history` | MANAGER | — | `?limit=10` | historique + dernier delta |
| `GET` | `/fuel/:id` | MANAGER | — | — | détail transaction |
| `POST` | `/fuel` | MANAGER | `can_record_fuel` | `CreateFuelTransactionDto` | transaction enregistrée |
| `POST` | `/fuel/:id/validate` | MANAGER | `can_validate_mileage` | `ValidateFuelTransactionDto` | validée |

**Filtres `FuelFiltersDto` :** `vehicleId` · `contractId` · `type` · `unvalidatedOnly`

> R-08 : INITIAL_FULL_TANK obligatoire à la remise du véhicule (inspection HANDOVER).  
> R-09 : niveau < FULL au retour → charge automatique possible.

---

### 1.18 Availability · `/availability`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/availability` | MANAGER | — | — | liste paginée |
| `GET` | `/availability/vehicle/:vehicleId/active` | MANAGER | — | — | événement actif ou null |
| `GET` | `/availability/:id` | MANAGER | — | — | détail événement |
| `POST` | `/availability/:id/resolve` | MANAGER | — | `ResolveAvailabilityEventDto` | résolu |

**Filtres `AvailabilityFiltersDto` :** `vehicleId` · `type` · `active` (boolean string)

> Les événements sont créés automatiquement par ImmobilizationsService, MaintenanceService, IncidentsService (type BREAKDOWN), SpecialAbsencesService. Pas de création manuelle.

---

### 1.19 Immobilizations · `/immobilizations`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/immobilizations` | MANAGER | — | — | liste paginée |
| `GET` | `/immobilizations/:id` | MANAGER | — | — | détail |
| `POST` | `/immobilizations` | MANAGER | `can_manage_immobilization` | `CreateImmobilizationDto` | immobilisation démarrée |
| `POST` | `/immobilizations/:id/release` | MANAGER | `can_manage_immobilization` | `ReleaseImmobilizationDto` | véhicule libéré |

---

### 1.20 Special Absences · `/special-absences`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/special-absences` | MANAGER | — | — | liste paginée |
| `GET` | `/special-absences/:id` | DRIVER | — | — | détail absence |
| `POST` | `/special-absences` | DRIVER | `can_manage_special_absence` | `RequestSpecialAbsenceDto` | PENDING |
| `POST` | `/special-absences/:id/review` | MANAGER | `can_manage_special_absence` | `ReviewAbsenceDto` | APPROVED ou escaladé |
| `POST` | `/special-absences/:id/sm-validate` | SUPER_MANAGER | `can_approve_special_absence` | `SmValidateAbsenceDto` | APPROVED/REJECTED |
| `POST` | `/special-absences/:id/cancel` | DRIVER | — | — | CANCELLED |
| `POST` | `/special-absences/:id/close` | MANAGER | `can_manage_special_absence` | `CloseAbsenceDto` | CLOSED |

---

### 1.21 Contraventions · `/contraventions`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/contraventions` | MANAGER | — | — | liste paginée |
| `GET` | `/contraventions/:id` | MANAGER | — | — | détail |
| `POST` | `/contraventions` | MANAGER | `can_manage_incident` | `CreateContraventionDto` | contravention créée |
| `POST` | `/contraventions/:id/mark-paid` | MANAGER | — | `MarkPaidDto` | PAID |
| `POST` | `/contraventions/:id/convert-to-charge` | MANAGER | — | `ConvertToChargeDto` | charge créée |

> D-12 : responsabilité toujours DRIVER — `impactsProfit = false` dans les relevés.

**Filtres `ContraventionFiltersDto` :** `vehicleId` · `driverId` · `status`

---

### 1.22 Repossessions · `/repossessions`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/repossessions` | MANAGER | — | — | liste paginée |
| `GET` | `/repossessions/:id` | MANAGER | — | — | détail dossier |
| `POST` | `/repossessions` | MANAGER | `can_propose_repossession` | `CreateRepossessionDto` | PROPOSED |
| `POST` | `/repossessions/:id/sm-validate` | SUPER_MANAGER | `can_validate_repossession` | `SmValidateRepossessionDto` | SM_VALIDATED/REJECTED |
| `POST` | `/repossessions/:id/admin-approve` | ADMIN | `can_approve_repossession` | `AdminApproveRepossessionDto` | APPROVED → véhicule REPOSSESSED |

> R-14 : 3 niveaux obligatoires — Manager propose · SM valide · Admin approuve.

---

### 1.23 Owner Portal · `/owner-portal`

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/owner-portal/contracts/:contractId/visibility` | MANAGER | — | — | paramètres visibilité |
| `PATCH` | `/owner-portal/contracts/:contractId/visibility` | MANAGER | `can_configure_owner_visibility` | `UpdateVisibilitySettingsDto` | mis à jour |
| `GET` | `/owner-portal/contracts/:contractId/dashboard` | OWNER | `can_view_owner_portal` | — | tableau de bord propriétaire |
| `GET` | `/owner-portal/contracts/:contractId/financial-summary` | OWNER | `can_view_owner_portal` | — | résumé financier mensuel |
| `GET` | `/owner-portal/rental-payments` | MANAGER | — | — | versements SIMPLE_RENTAL paginés |
| `POST` | `/owner-portal/rental-payments` | MANAGER | `can_record_owner_payment` | `RecordRentalPaymentDto` | versement enregistré |
| `PATCH` | `/owner-portal/rental-payments/:id/status` | MANAGER | `can_record_owner_payment` | `UpdateRentalPaymentStatusDto` | statut mis à jour |

> D-16 : paramètres de visibilité par contrat (pas par propriétaire).  
> D-17 : SIMPLE_RENTAL utilise `OwnerRentalPayment`, pas `MonthlySettlement`.

**Query `GET /financial-summary` :** `year` (int, required) · `month` (int 1-12, required)

---

### 1.24 Notifications · `/notifications`

| Méthode | Route | Rôle min. | Permission | Query | Réponse |
|---------|-------|-----------|-----------|-------|---------|
| `GET` | `/notifications` | tout | — | page · limit · `unreadOnly=true` | notifications paginées |
| `GET` | `/notifications/unread-count` | tout | — | — | `{ count: number }` |
| `PATCH` | `/notifications/:id/read` | tout | — | — | notification avec `readAt` |
| `PATCH` | `/notifications/read-all` | tout | — | — | `{ message: string }` |

> Chaque utilisateur ne voit que ses propres notifications (scopé par JWT).  
> ADMIN ne reçoit que HIGH et CRITICAL (filtré à l'envoi).

> ⚠️ **Gap G-10 :** Pas de `GET /notifications/:id` — pour afficher le détail, Flutter utilise la liste.

---

### 1.25 Permissions · `/permissions` (Admin/SM)

| Méthode | Route | Rôle min. | Permission | Body DTO | Réponse |
|---------|-------|-----------|-----------|----------|---------|
| `GET` | `/permissions` | SUPER_MANAGER | — | — | liste paginée |
| `GET` | `/permissions/module/:module` | MANAGER | — | — | permissions du module |
| `GET` | `/permissions/roles/:role` | SUPER_MANAGER | — | — | permissions du rôle |
| `GET` | `/permissions/users/:userId/overrides` | SUPER_MANAGER | — | — | overrides de l'utilisateur |
| `POST` | `/permissions` | ADMIN | `can_manage_permissions` | `CreatePermissionDto` | permission créée |
| `POST` | `/permissions/users/:userId/grant` | ADMIN | `can_grant_permission` | `GrantPermissionDto` | override créé/modifié |
| `DELETE` | `/permissions/users/:userId/overrides/:permissionCode` | ADMIN | `can_revoke_permission` | — | override supprimé |

---

### 1.26 Audit · `/audit` (SM+)

| Méthode | Route | Rôle min. | Permission | Query | Réponse |
|---------|-------|-----------|-----------|-------|---------|
| `GET` | `/audit` | SUPER_MANAGER | `can_view_audit_logs` | page · limit · entityType · entityId · actorId · action | logs paginés |

---

### 1.27 Ledger · `/ledger` (SM+)

| Méthode | Route | Rôle min. | Permission | Query | Réponse |
|---------|-------|-----------|-----------|-------|---------|
| `GET` | `/ledger/contracts/:contractId` | SUPER_MANAGER | — | page · limit | grand livre paginé |

---

### 1.28 Modules Stubs

| Méthode | Route | Statut | Réponse |
|---------|-------|--------|---------|
| `GET` | `/tasks/status` | **501 Not Implemented** | `{ module, status: "not_implemented", plannedPhase }` |
| `GET` | `/settlements/status` | **501 Not Implemented** | `{ module, status: "not_implemented", plannedPhase }` |
| `GET` | `/scoring/health` | ⚠️ 200 (stub sans 501) | `{ module, status: "ready", phase: "Phase 4" }` |

> ⚠️ **Gap G-11 :** Le module Scoring retourne 200 mais n'a aucune donnée réelle. Flutter ne doit pas afficher de score à partir de cet endpoint tant que Phase 4 n'est pas implémentée.

---

## 2. Auth Flutter

### 2.1 Flux d'authentification complet

```
1. PREMIÈRE CONNEXION
   Flutter → POST /auth/login { email, password }
   Backend → { accessToken, refreshToken, expiresIn, user }
   Flutter → Stocker dans flutter_secure_storage :
             ACCESS_TOKEN_KEY  = accessToken
             REFRESH_TOKEN_KEY = refreshToken
             USER_ROLE_KEY     = user.role
             USER_ID_KEY       = user.id

2. REQUÊTE AUTHENTIFIÉE
   Flutter → Header: Authorization: Bearer {accessToken}
   Backend → 200 OK avec données
   ou
   Backend → 401 Unauthorized (token expiré)

3. TOKEN EXPIRÉ (401 reçu)
   Flutter intercepteur → POST /auth/refresh { refreshToken }
   Backend → nouveaux { accessToken, refreshToken } ou 401 (refresh révoqué)
   Si succès → mettre à jour stockage + rejouer la requête originale
   Si 401 sur refresh → rediriger vers écran de connexion

4. DÉCONNEXION
   Flutter → POST /auth/logout { refreshToken } (avec accessToken dans header)
   Backend → { message: "Déconnexion effectuée" }
   Flutter → Effacer flutter_secure_storage, rediriger login

5. DÉMARRAGE APP
   Flutter → Lire ACCESS_TOKEN_KEY du stockage sécurisé
   Si présent → GET /auth/me (valide le token)
   Si 401 → tenter refresh
   Si refresh échoue → écran login
```

### 2.2 Paramètres de configuration

| Paramètre | Valeur par défaut | Configurable via env |
|-----------|-----------------|---------------------|
| Access token TTL | `1d` (1 jour) | `JWT_ACCESS_EXPIRES_IN` |
| Refresh token TTL | `7d` (7 jours) | `JWT_REFRESH_EXPIRES_IN` |
| Rate limit login | 5 tentatives / 60 s | `AUTH_THROTTLE_LIMIT`, `AUTH_THROTTLE_TTL` |
| Rate limit global | 100 req / 60 s | `THROTTLE_LIMIT`, `THROTTLE_TTL` |

### 2.3 Gestion des erreurs auth

| Code HTTP | Cas | Action Flutter |
|-----------|-----|---------------|
| `401` | Token expiré | Tenter refresh automatique (1 fois max) |
| `401` | Refresh révoqué / invalide | Logout forcé → écran login |
| `401` | Compte SUSPENDED | Afficher message "Compte suspendu" |
| `429` | Trop de tentatives login | Afficher délai d'attente (60 s) |
| `403` | Permission insuffisante | Toast "Accès non autorisé" |

### 2.4 Stockage recommandé Flutter

```dart
// Utiliser flutter_secure_storage (AES sur Android, Keychain sur iOS)
const storage = FlutterSecureStorage();

// Clés recommandées
const kAccessToken  = 'fleet_access_token';
const kRefreshToken = 'fleet_refresh_token';
const kUserRole     = 'fleet_user_role';
const kUserId       = 'fleet_user_id';

// NE PAS stocker dans SharedPreferences (non chiffré)
// NE PAS logguer les tokens
```

### 2.5 Intercepteur Dio recommandé

```dart
// Ajouter automatiquement le Bearer token
// Intercepter les 401, tenter refresh, rejouer
// Sur échec refresh → naviguer vers /login
class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = storage.read(kAccessToken);
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final refreshed = await _tryRefresh();
      if (refreshed) {
        // Rejouer la requête originale
        handler.resolve(await _retry(err.requestOptions));
      } else {
        await _forceLogout();
        handler.reject(err);
      }
    } else {
      handler.next(err);
    }
  }
}
```

---

## 3. Rôles et permissions

### 3.1 Hiérarchie des rôles

```
ADMIN  (accès total + filtrage HIGH/CRITICAL notifications)
  └── SUPER_MANAGER  (gestion opérationnelle complète)
        └── MANAGER  (gestion terrain quotidienne)
              ├── DRIVER    (actions chauffeur uniquement)
              └── OWNER     (portail propriétaire uniquement)
```

> **Important :** `@Roles(UserRole.MANAGER)` signifie MANAGER **OU SUPÉRIEUR** — un SUPER_MANAGER ou ADMIN passe également.

### 3.2 Accès par rôle — Vue synthétique

| Module | ADMIN | SUPER_MANAGER | MANAGER | DRIVER | OWNER |
|--------|-------|--------------|---------|--------|-------|
| **Auth** (login/refresh/logout/me) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Users** (liste, détail) | ✅ tous | ✅ tous | ✅ ses drivers | ❌ | ❌ |
| **Users** (créer, suspendre) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Vehicles** (liste, détail) | ✅ tous | ✅ tous | ✅ ses véhicules | ✅ son véhicule | ✅ ses véhicules |
| **Vehicles** (créer, modifier) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Drivers** (liste, détail) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Contracts** (liste) | ✅ | ✅ | ✅ ses contrats | ✅ son contrat | ❌ |
| **Contracts** (créer, activer) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Daily Entries** (progress) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Payments** (enregistrer) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Payments** (rejeter) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Charges** (créer, soumettre) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Charges** (valider, rejeter) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Deposits** (créer) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Deposits** (payer) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Deposits** (admin-validate) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Documents** (lire) | ✅ | ✅ | ✅ | ✅ (ses docs) | ❌ |
| **Documents** (créer, modifier) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Media** (upload photo) | ✅ | ✅ | ✅ | ✅ (IN_APP_CAMERA seulement) | ❌ |
| **Media** (missions photo) | ✅ | ✅ | ✅ (créer/valider) | ✅ (soumettre) | ❌ |
| **Inspections** (lire) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Inspections** (créer, signer manager) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Inspections** (signer chauffeur) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Incidents** (déclarer) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Incidents** (clôturer) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Accidents** (gérer) | ✅ | ✅ | ✅ (avancer étapes) | ❌ | ❌ |
| **Accidents** (clôturer) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Maintenance** (tout) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Kilométrage** (déclarer) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Fuel** (enregistrer) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Availability** (lire) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Immobilizations** (tout) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Special Absences** (demander, annuler) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Special Absences** (valider) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Contraventions** (tout) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Repossessions** (proposer) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Repossessions** (SM validate) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Repossessions** (Admin approve) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Owner Portal** (dashboard) | ✅ | ✅ | ✅ | ❌ | ✅ (ses contrats) |
| **Notifications** (les siennes) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Audit** (lire) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Permissions** (gérer) | ✅ | ❌ | ❌ | ❌ | ❌ |

### 3.3 Permissions atomiques complètes

```
Véhicules    : can_create_vehicle · can_edit_vehicle · can_delete_vehicle · can_assign_vehicle
Chauffeurs   : can_create_driver · can_validate_kyc · can_validate_field · can_blacklist_driver
Contrats     : can_create_contract · can_activate_contract · can_suspend_contract · can_close_contract
Paiements    : can_record_payment · can_view_payments
Charges      : can_create_charge · can_validate_charge · can_reject_charge · can_add_charge_to_contract
Caution      : can_propose_deposit · can_validate_deposit · can_use_deposit
Documents    : can_manage_documents · can_upload_document
Incidents    : can_create_incident · can_manage_incident
Accidents    : can_create_accident · can_advance_accident_step · can_validate_accident_expense
Maintenance  : can_manage_maintenance
Inspections  : can_create_inspection · can_sign_inspection
Reprises     : can_propose_repossession · can_validate_repossession · can_approve_repossession
Relevés      : can_generate_settlement · can_approve_settlement · can_view_owner_finances
Utilisateurs : can_manage_users · can_manage_managers · can_manage_permissions
               can_grant_permission · can_revoke_permission
Audit        : can_view_audit_logs · can_view_analytics
Carburant    : can_record_fuel · can_validate_mileage
Disponibilité: can_manage_immobilization · can_manage_special_absence · can_approve_special_absence
Portail Owner: can_configure_owner_visibility · can_view_owner_portal · can_record_owner_payment
Médias       : can_create_photo_mission · can_validate_photo_mission
```

---

## 4. Uploads / Media

### 4.1 Flux upload Flutter (deux étapes obligatoires)

```
ÉTAPE 1 — Upload du fichier brut
POST /media/upload
Content-Type: multipart/form-data

Champs du formulaire :
  file        : <bytes du fichier>       [champ fichier multipart, nom = "file"]
  mediaType   : "PHOTO"                  [enum: PHOTO|VIDEO|DOCUMENT|AUDIO]
  source      : "IN_APP_CAMERA"          [enum: GALLERY|IN_APP_CAMERA|MANAGER_UPLOAD|SYSTEM]
  entityType  : "VEHICLE"                [optionnel: VEHICLE|DRIVER|CONTRACT|INCIDENT…]
  entityId    : "uuid-du-vehicule"       [optionnel, UUID]
  takenAt     : "2026-06-01T10:30:00Z"  [optionnel, ISO 8601]
  gpsLat      : "14.7167"               [optionnel, Decimal]
  gpsLng      : "-17.4677"              [optionnel, Decimal]

→ Retourne: { id: "uuid", fileUrl: "...", mimeType: "...", ... }

ÉTAPE 2 — Obtenir l'URL signée pour affichage
GET /media/:id/url
→ Retourne: { url: "https://storage/signed?token=...&expires=..." }

TTL URL signée : 15 minutes (à rafraîchir côté Flutter si nécessaire)
```

### 4.2 Formats acceptés et tailles

| Type MIME | MediaType | Usage |
|-----------|-----------|-------|
| `image/jpeg`, `image/png`, `image/webp` | `PHOTO` | Photos véhicule, KYC, accidents |
| `video/mp4`, `video/quicktime` | `VIDEO` | Vidéos inspection |
| `application/pdf` | `DOCUMENT` | Documents administratifs |
| `audio/mpeg`, `audio/mp4` | `AUDIO` | Rapports vocaux |

**Taille max :** 50 Mo par fichier

### 4.3 Règles anti-fraude — DRIVER

```
⚠️ CRITIQUE :
Les chauffeurs (role=DRIVER) NE PEUVENT uploader que via source=IN_APP_CAMERA.
Toute autre valeur de source → 403 ForbiddenException.
Le backend valide cela côté service (pas seulement côté client).

Implication Flutter :
- Cacher le sélecteur de galerie pour les utilisateurs DRIVER
- Forcer source="IN_APP_CAMERA" dans le DTO pour les DRIVERs
- Le serveur validera de toute façon même si Flutter tente de contourner
```

### 4.4 Flux complet Photo Mission (DRIVER)

```
1. Manager crée la mission
   POST /media/photo-missions { vehicleId, driverId, type, dueDate }
   
2. Chauffeur reçoit notification PHOTO_MISSION_REQUIRED

3. Chauffeur prend ses photos
   POST /media/upload (x N fois) → obtient N mediaAssetIds

4. Chauffeur crée les wrappers Photo
   POST /media/photos { mediaAssetId, missionId, captureContext }
   (x N fois)

5. Chauffeur soumet la mission
   POST /media/photo-missions/:id/submit { photoIds: [uuid1, uuid2, ...] }
   ⚠️ H-10 : le backend vérifie que chaque photo appartient au chauffeur connecté

6. Manager valide
   POST /media/photo-missions/:id/validate
```

### 4.5 Structure de stockage S3/Supabase

```
fleet-storage/
├── vehicles/{vehicleId}/documents/{documentId}/{filename}
├── vehicles/{vehicleId}/photos/{missionId}/{photoId}/{filename}
├── drivers/{driverId}/kyc/{filename}
├── contracts/{contractId}/documents/{filename}
├── incidents/{incidentId}/photos/{filename}
├── accidents/{accidentId}/photos/{filename}
├── inspections/{inspectionId}/photos/{filename}
└── misc/{entityType}/{entityId}/{filename}
```

---

## 5. Pagination et filtres

### 5.1 Paramètres de pagination

| Paramètre | Type | Défaut | Maximum (H-14) | Description |
|-----------|------|--------|----------------|-------------|
| `page` | integer | 1 | — | Numéro de page (1-based) |
| `limit` | integer | 20 | **100** | Entrées par page — valeurs > 100 automatiquement réduites à 100 |

> **H-14 :** `LimitCapInterceptor` global plafonne silencieusement `limit` à 100.  
> Une valeur de `?limit=500` sera traitée comme `?limit=100` sans erreur.  
> **Exception :** `GET /daily-entries/contract/:contractId` a un défaut de 60 (pour afficher 2 mois).

### 5.2 Filtres disponibles par module

| Module | Filtres |
|--------|---------|
| Users | `role` · `search` |
| Vehicles | `status` · `search` (immatriculation/marque) |
| Drivers | `status` · `search` |
| Contracts | `vehicleId` · `driverId` · `managerId` · `status` · `type` |
| Payments | `contractId` · `vehicleId` · `driverId` · `from` · `to` |
| Charges | `contractId` · `vehicleId` · `driverId` · `status` · `type` |
| Daily Entries | `status` (DayStatus) |
| Documents | `entityType` · `entityId` · `type` · `status` |
| Media | `entityType` · `entityId` · `mediaType` |
| Photo Missions | `vehicleId` · `driverId` · `status` |
| Inspections | `vehicleId` · `contractId` · `type` · `status` |
| Incidents | `vehicleId` · `driverId` · `type` · `status` · `severity` |
| Accidents | `vehicleId` · `status` · `currentStep` |
| Maintenance | `vehicleId` · `type` · `status` |
| Mileage Records | `vehicleId` · `driverId` · `source` |
| Fuel | `vehicleId` · `contractId` · `type` · `unvalidatedOnly` |
| Availability | `vehicleId` · `type` · `active` |
| Immobilizations | `vehicleId` · `contractId` · `status` |
| Special Absences | `driverId` · `contractId` · `status` |
| Contraventions | `vehicleId` · `driverId` · `status` |
| Repossessions | `vehicleId` · `status` |
| Rental Payments | `contractId` · `ownerId` · `status` · `periodYear` · `periodMonth` |
| Audit | `entityType` · `entityId` · `actorId` · `action` |
| Notifications | `unreadOnly` (boolean string `"true"`) |

### 5.3 Format de réponse paginée standard

```json
{
  "success": true,
  "data": [
    { "id": "uuid-1", ... },
    { "id": "uuid-2", ... }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 47
  }
}
```

---

## 6. Format standard des réponses

### 6.1 Succès — Entité unique

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "ACTIVE",
    "amount": "25000.00",
    "createdAt": "2026-06-01T08:00:00.000Z"
  }
}
```

### 6.2 Succès — Liste paginée

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### 6.3 Succès — Action métier (pas de retour de données)

```json
{
  "success": true,
  "data": { "message": "Déconnexion effectuée" }
}
```

### 6.4 Erreur — Format standard

```json
{
  "success": false,
  "error": {
    "code": "HTTP_404",
    "message": "Paiement abc123 introuvable",
    "details": {}
  },
  "timestamp": "2026-06-01T10:30:00.000Z",
  "path": "/api/v1/payments/abc123"
}
```

### 6.5 Erreur — Validation DTO (400)

```json
{
  "success": false,
  "error": {
    "code": "HTTP_400",
    "message": ["amount must be a positive number", "contractId must be a UUID"],
    "details": {}
  }
}
```

> ⚠️ Quand la validation échoue, `message` peut être un **tableau de strings** (issu de class-validator).  
> Flutter doit gérer les deux cas : `string` et `string[]`.

### 6.6 Erreurs Prisma mappées

| Code Prisma | HTTP | Code retourné | Message |
|-------------|------|---------------|---------|
| P2002 | 409 Conflict | `PRISMA_P2002` | Contrainte d'unicité |
| P2025 | 404 Not Found | `PRISMA_P2025` | Enregistrement introuvable |
| P2003 | 400 Bad Request | `PRISMA_P2003` | Référence invalide |

### 6.7 Codes HTTP utilisés

| Code | Signification |
|------|--------------|
| 200 | Succès standard |
| 201 | Création réussie (POST sans `@HttpCode`) |
| 204 | Succès sans corps (`validate-kyc`, `validate-field`) |
| 400 | BadRequestException — données invalides, règle métier violée |
| 401 | UnauthorizedException — token absent, expiré, révoqué |
| 403 | ForbiddenException — rôle ou permission insuffisant |
| 404 | NotFoundException — entité introuvable |
| 409 | ConflictException — unicité violée |
| 429 | TooManyRequestsException — rate limit atteint |
| 500 | Erreur serveur interne |
| 501 | Not Implemented — module stub |

### 6.8 Types de données importants

| Champ | Type JSON | Notes Flutter |
|-------|-----------|---------------|
| `id` | `string` (UUID v4) | Identifiant unique immuable |
| `amount` | `string` (Decimal) | **Jamais un float** — utiliser `Decimal` / `BigDecimal` Flutter |
| `createdAt`, `updatedAt` | `string` (ISO 8601 UTC) | Parser avec `DateTime.parse()` |
| `paidAt`, `dueDate` | `string` (ISO 8601) | Idem |
| `status` | `string` (enum) | Comparer avec les constantes enum |
| Montants FCFA | `string` | Afficher avec séparateur de milliers, devise = XOF |

> ⚠️ **CRITIQUE :** Tous les montants financiers (`amount`, `dailyAmount`, `paidAmount`, etc.) sont des **strings Decimal** dans les réponses JSON (ex: `"25000.00"`). Flutter **ne doit jamais** les parser en `double` pour des calculs financiers — utiliser un package Decimal (`decimal` ou `big_decimal`).

---

## 7. Modules prioritaires Flutter

### Priorité 1 — Critique (bloquant pour tout utilisateur)

| Écran | Rôle cible | Endpoints clés | Complexité |
|-------|-----------|----------------|------------|
| **Auth / Login** | Tous | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | Faible |
| **Mon Profil** | Tous | `GET /auth/me`, `PATCH /users/:id/password` | Faible |
| **Notifications** | Tous | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read` | Faible |

### Priorité 2 — Core Manager (valeur métier principale)

| Écran | Rôle cible | Endpoints clés | Complexité |
|-------|-----------|----------------|------------|
| **Liste Véhicules** | MANAGER+ | `GET /vehicles` | Faible |
| **Détail Véhicule** | MANAGER+ | `GET /vehicles/:id`, `GET /availability/vehicle/:id/active` | Faible |
| **Liste Chauffeurs** | MANAGER+ | `GET /drivers` | Faible |
| **Détail Chauffeur** | MANAGER+ | `GET /drivers/:id`, `GET /contracts` (filtré) | Faible |
| **Liste Contrats** | MANAGER+ | `GET /contracts` | Faible |
| **Détail Contrat** | MANAGER+ | `GET /contracts/:id`, `GET /daily-entries/contract/:id/progress` | Moyenne |
| **Enregistrer Paiement** | MANAGER+ | `POST /payments`, `GET /daily-entries/contract/:id/next-unpaid` | Moyenne |
| **Historique Paiements** | MANAGER+ | `GET /payments` | Faible |

### Priorité 3 — Core Driver (app chauffeur)

| Écran | Rôle cible | Endpoints clés | Complexité |
|-------|-----------|----------------|------------|
| **Mon Contrat / Progression** | DRIVER | `GET /contracts`, `GET /daily-entries/contract/:id/progress` | Faible |
| **Mes Paiements** | DRIVER | `GET /daily-entries/contract/:id` | Faible |
| **Upload Photo** | DRIVER | `POST /media/upload`, `POST /media/photos` | Moyenne |
| **Mes Missions Photo** | DRIVER | `GET /media/photo-missions` (filtré driverId), `POST /media/photo-missions/:id/submit` | Moyenne |
| **Déclarer Kilométrage** | DRIVER | `POST /maintenance/mileage/records` | Faible |
| **Demander Absence** | DRIVER | `POST /special-absences`, `GET /special-absences/:id` | Faible |

### Priorité 4 — Opérationnel terrain

| Écran | Rôle cible | Endpoints clés | Complexité |
|-------|-----------|----------------|------------|
| **Inspection Remise/Retour** | MANAGER+DRIVER | `POST /inspections`, `POST /inspections/:id/driver-sign`, `POST /inspections/:id/manager-sign` | Haute |
| **Déclarer Incident** | MANAGER | `POST /incidents`, `POST /incidents/:id/in-progress` | Moyenne |
| **Dossier Accident** | MANAGER+ | `GET /accidents`, `POST /accidents/:id/advance-step` | Haute |
| **Maintenance** | MANAGER | `GET /maintenance`, `POST /maintenance`, `POST /maintenance/:id/complete` | Moyenne |
| **Carburant** | MANAGER | `POST /fuel`, `GET /fuel/vehicle/:id/history` | Faible |
| **Immobilisation** | MANAGER | `POST /immobilizations`, `POST /immobilizations/:id/release` | Faible |

### Priorité 5 — Gestion administrative (SM/Admin)

| Écran | Rôle cible | Endpoints clés | Complexité |
|-------|-----------|----------------|------------|
| **Validation KYC** | SUPER_MANAGER | `POST /drivers/:id/validate-kyc` | Faible |
| **Validation Terrain** | MANAGER | `POST /drivers/:id/validate-field` | Faible |
| **Activation Contrat** | SUPER_MANAGER | `POST /contracts/:id/activate` (checklist) | Haute |
| **Gestion Charges** | SUPER_MANAGER | `POST /charges/:id/validate`, `POST /charges/:id/add-to-contract` | Moyenne |
| **Gestion Caution** | SUPER_MANAGER | `POST /deposits`, `POST /deposits/:id/pay` | Moyenne |
| **Reprises** | MANAGER/SM/ADMIN | `POST /repossessions`, `POST /repossessions/:id/sm-validate` | Haute |
| **Contraventions** | MANAGER | `POST /contraventions`, `POST /contraventions/:id/convert-to-charge` | Faible |

### Priorité 6 — Portail Propriétaire

| Écran | Rôle cible | Endpoints clés | Complexité |
|-------|-----------|----------------|------------|
| **Dashboard Owner** | OWNER | `GET /owner-portal/contracts/:id/dashboard` | Faible |
| **Résumé Financier** | OWNER | `GET /owner-portal/contracts/:id/financial-summary?year=&month=` | Faible |
| **Versements** | OWNER | `GET /owner-portal/rental-payments` | Faible |

### Priorité 7 — Administration pure (Admin app)

| Écran | Rôle cible | Endpoints clés |
|-------|-----------|----------------|
| Documents | MANAGER+ | `/documents` |
| Audit Log | SM+ | `GET /audit` |
| Grand Livre | SM+ | `GET /ledger/contracts/:id` |
| Gestion Users | Admin/SM | `/users` CRUD |
| Permissions | Admin | `/permissions` |

---

## 8. Gaps API avant Flutter

### Gaps BLOQUANTS (à corriger avant génération client Flutter)

| ID | Module | Description | Impact | Correction recommandée |
|----|--------|-------------|--------|----------------------|
| **G-01** | Users | `PATCH /users/:id/password` lance `new Error('Non autorisé')` au lieu de `throw new ForbiddenException()` → retourne **HTTP 500 au lieu de 403** | Flutter reçoit une erreur serveur impossible à distinguer d'un vrai crash | Remplacer `throw new Error('Non autorisé')` par `throw new ForbiddenException('Non autorisé')` dans `users.controller.ts:66` |
| **G-02** | Vehicles | `PATCH /vehicles/:id/status` et `PATCH /drivers/:id/status` passent le statut en **query param** (`?status=VALUE`) et non en body — convention non-standard REST | Oblige Flutter à construire une URL spéciale, incompatible avec les générateurs de client HTTP standard | Déplacer `status` dans le body `{ status: VehicleStatus }` |
| **G-03** | Media | Route `GET /media/photo-missions` déclarée APRÈS `GET /media/:id` dans le contrôleur — NestJS résout `/photo-missions` comme `:id` = `"photo-missions"` → **routing conflict** | `GET /media/photo-missions` peut retourner 404 NotFoundException si l'ordre des routes NestJS cause une collision | Réordonner les routes dans `MediaController` : les routes avec segment fixe avant les routes avec `:id` |

### Gaps IMPORTANTS (dégradent UX Flutter)

| ID | Module | Description | Impact |
|----|--------|-------------|--------|
| **G-04** | Contracts | Pas d'endpoint `GET /contracts/:id/checklist` — Flutter doit déduire l'état de la checklist en lisant le contrat complet et en vérifiant les 8 champs | Logique métier dupliquée côté Flutter |
| **G-05** | Drivers | Pas d'endpoint `GET /drivers/:id/kyc` — le statut KYC n'est visible qu'en lisant `GET /drivers/:id` (include complet) | Surcharge réseau si Flutter n'a besoin que du statut KYC |
| **G-06** | Scoring | `GET /scoring/health` retourne HTTP 200 avec `status:"ready"` au lieu de 501 comme les autres stubs | Flutter pourrait croire que le scoring est opérationnel — risque d'afficher des données vides ou trompeuses |
| **G-07** | Documents | Le flux en deux étapes (upload média → créer document) n'est pas documenté dans Swagger — Flutter doit le déduire | Risque d'intégration incorrecte |
| **G-08** | Notifications | Pas de `GET /notifications/:id` pour le détail d'une notification | Mineur — on peut utiliser la liste |
| **G-09** | Daily Entries | Pas de limite max documentée sur `GET /daily-entries/contract/:id` (défaut 60) — peut retourner 2 mois de données non paginées pour contrats longs | Performances Flutter sur contrats > 60 jours |

### Gaps MINEURS (peuvent attendre)

| ID | Module | Description |
|----|--------|-------------|
| **G-10** | Tous | Pas d'endpoint `GET /[resource]/:id` pour certains modules secondaires (mileage records, rental payments individuels) |
| **G-11** | Contraventions | Permission `can_manage_incident` réutilisée — pas de code dédié `can_manage_contravention` |
| **G-12** | Owner Portal | L'endpoint `GET /owner-portal/contracts/:contractId/financial-summary` est documenté "SIMPLE_RENTAL uniquement" mais aucun guard n'empêche l'appel sur un contrat OWNERSHIP_PROGRAM (retournera des données vides) |
| **G-13** | Repossessions | Le filtre `status` dans `RepossessionFiltersDto` n'est pas documenté avec les valeurs possibles de l'enum |

### Réponses non standardisées

| Endpoint | Problème | Attendu |
|----------|----------|---------|
| `POST /auth/login` | Retourne l'objet `AuthResponseDto` brut sans enveloppe `{ success, data }` — le TransformInterceptor devrait l'envelopper automatiquement | Vérifier que `{ success: true, data: { accessToken, ... } }` est bien le format reçu en production |
| `POST /drivers/:id/validate-kyc` | Retourne HTTP 204 No Content (corps vide) | Flutter doit gérer le cas `body == null` |
| `POST /drivers/:id/validate-field` | Idem 204 | Idem |

---

## 9. Recommandation finale

### ✅ Backend prêt pour Flutter : **OUI, avec 3 corrections bloquantes**

Le backend Fleet Platform Phase 4-C est **fonctionnel et intégrable** avec Flutter. La structure d'authentification, le RBAC, la pagination, les formats de réponse et les 100+ endpoints sont opérationnels. Cependant, **3 bugs bloquants** doivent être corrigés avant de générer le client Dart/Flutter :

---

### Ce qu'il faut corriger AVANT de générer le client Flutter

| Priorité | ID | Correction | Fichier | Effort |
|----------|----|-----------| --------|--------|
| 🔴 P0 | G-01 | `throw new ForbiddenException()` au lieu de `throw new Error()` dans `users.controller.ts:66` | `users.controller.ts` | 5 min |
| 🔴 P0 | G-03 | Réordonner les routes `GET /media` et `GET /media/photo-missions` avant `GET /media/:id` dans `MediaController` | `media.controller.ts` | 5 min |
| 🟠 P1 | G-02 | Déplacer `status` de query param vers body sur `PATCH /vehicles/:id/status` et `PATCH /drivers/:id/status` | `vehicles.controller.ts` · `drivers.controller.ts` | 30 min |
| 🟠 P1 | G-06 | `GET /scoring/health` → retourner HTTP 501 comme les autres stubs | `scoring.controller.ts` | 5 min |

---

### Ce qui peut attendre (Phase 5+)

- **G-04** (endpoint checklist) : Flutter peut calculer les conditions côté client
- **G-05** (endpoint KYC dédié) : lire `GET /drivers/:id` suffit
- **G-07** (documentation Swagger deux étapes) : formation équipe Flutter
- **G-08 à G-13** : UX mineure, pas bloquant pour MVP
- **Modules stub** : Tasks, Settlements, Scoring — afficher "disponible prochainement" dans l'UI
- **Tests E2E** : supertest avec vraie DB — à faire en Phase 6

---

### Résumé capacité par app Flutter

| App Flutter | Modules utilisables aujourd'hui | Modules manquants |
|-------------|--------------------------------|------------------|
| **App Manager** | Auth · Véhicules · Chauffeurs · Contrats · Paiements · Charges · Dépôts · Documents · Media · Inspections · Incidents · Accidents · Maintenance · Carburant · Availability · Immobilisations · Absences · Contraventions · Reprises · Notifications | Settlements · Scoring |
| **App Driver** | Auth · Mon Contrat · Ma Progression · Paiements (lecture) · Photos · Kilométrage · Absences Spéciales · Notifications | — |
| **App Owner** | Auth · Dashboard · Résumé Financier · Versements · Notifications | Settlements automatiques |
| **App Admin** | Tous les modules ci-dessus + Audit · Ledger · Permissions | Scoring · Settlements |

---

### Checklist avant lancement Flutter

- [ ] Corriger G-01 (`ForbiddenException` dans users.controller)
- [ ] Corriger G-03 (ordre routes MediaController)
- [ ] Corriger G-02 (status → body sur vehicles et drivers)
- [ ] Corriger G-06 (scoring stub → 501)
- [ ] Configurer `.env` production : `ALLOWED_ORIGINS`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`
- [ ] Exécuter `npx prisma migrate deploy` (créer les migrations depuis `db push`)
- [ ] Vérifier la présence du provider storage S3/Supabase pour `STORAGE_PROVIDER`
- [ ] Tester `POST /auth/login` depuis l'app Flutter (CORS + throttling)
- [ ] Confirmer que `flutter_secure_storage` est configuré pour Android Keystore et iOS Keychain
- [ ] Vérifier le format `Decimal` des montants financiers dans les modèles Dart

---

*Document généré automatiquement depuis l'analyse du code source.*  
*Source de vérité : contrôleurs NestJS + schéma Prisma + BACKEND_CONVENTIONS.md*  
*Mettre à jour après chaque modification d'endpoint ou de DTO.*
