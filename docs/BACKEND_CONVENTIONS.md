# Conventions Backend — Fleet Platform V2
# NestJS Modular Monolith · PostgreSQL · Prisma 7 · 45 modèles

---

## 1. Conventions API REST

### Structure des URLs

```
/api/v1/{resource}
```

### Nomenclature des routes

| Méthode | Pattern | Description |
|---------|---------|-------------|
| GET | `/vehicles` | Liste paginée |
| GET | `/vehicles/:id` | Détail |
| POST | `/vehicles` | Création |
| PATCH | `/vehicles/:id` | Mise à jour partielle |
| DELETE | `/vehicles/:id` | Soft delete (jamais hard delete sur entités métier) |
| POST | `/vehicles/:id/assign-manager` | Action métier spécifique |
| PATCH | `/vehicles/:id/status` | Changement d'état |

### Actions métier (verbes explicites — exemples par domaine)

```
# Contrats
POST /contracts/:id/activate
POST /contracts/:id/suspend
POST /contracts/:id/close

# Charges
POST /charges/:id/submit              → DRAFT → PENDING_VALIDATION
POST /charges/:id/validate            → PENDING_VALIDATION → VALIDATED
POST /charges/:id/reject
POST /charges/:id/add-to-contract     → VALIDATED → ADDED_TO_CONTRACT

# Reprises
POST /repossessions/:id/sm-validate
POST /repossessions/:id/admin-approve

# Accidents
POST /accidents/:id/next-step

# Inspections (double signature obligatoire)
POST /inspections/:id/driver-sign
POST /inspections/:id/manager-sign

# Relevés mensuels
POST /settlements/generate
POST /settlements/:id/approve
POST /settlements/:id/send-to-owner
POST /settlements/:id/record-payment
POST /settlements/:id/dispute

# Portail propriétaire (lecture seule)
GET  /owner-portal/settlements
PATCH /owner-portal/settlements/:id/acknowledge

# Caution
POST /deposits/:id/admin-approve      → montant non-standard uniquement

# Permissions (Admin)
POST /permissions/:userId/grant
POST /permissions/:userId/revoke
```

### Structure réponse API standard

```json
// Succès liste
{
  "success": true,
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 150 }
}

// Succès entité
{
  "success": true,
  "data": { ... }
}

// Erreur
{
  "success": false,
  "error": {
    "code": "CHARGE_VALIDATION_FAILED",
    "message": "Vous n'avez pas la permission de valider cette charge.",
    "details": {}
  }
}
```

### Pagination systématique

```
GET /vehicles?page=1&limit=20&status=ACTIVE&sort=createdAt&order=desc
```

Tous les filtres disponibles sont documentés dans chaque controller via Swagger.

---

## 2. Conventions Permissions (RBAC)

### Hiérarchie des rôles

```
ADMIN
  └── SUPER_MANAGER
        └── MANAGER
              ├── DRIVER
              └── OWNER
```

### Moteur de permissions — 2 niveaux

**Niveau 1 — Rôle** : `RolePermission` définit les permissions par défaut pour chaque rôle.

**Niveau 2 — Override individuel** : `UserPermissionOverride` permet à l'Admin de :
- Accorder une permission précise à un utilisateur spécifique (`isGranted = true`)
- Révoquer une permission normalement accordée par son rôle (`isGranted = false`)
- Avec une expiration optionnelle (`expiresAt`)

**Algorithme de résolution** :
```typescript
async checkPermission(userId: string, code: string): Promise<boolean> {
  // 1. Override individuel prend toujours la priorité
  const override = await this.findOverride(userId, code);
  if (override && (!override.expiresAt || override.expiresAt > new Date())) {
    return override.isGranted;
  }
  // 2. Sinon: permission par défaut du rôle
  const user = await this.findUser(userId);
  const rolePermission = await this.findRolePermission(user.role, code);
  return rolePermission?.isGranted ?? false;
}
```

### Matrice de permissions MVP

| Action | ADMIN | SUPER_MANAGER | MANAGER | DRIVER | OWNER |
|--------|-------|---------------|---------|--------|-------|
| Créer véhicule | ✅ | ✅ | ❌ | ❌ | ❌ |
| Voir véhicules | ✅ tous | ✅ tous | ✅ ses véhicules | ❌ | ✅ ses véhicules |
| Créer/activer contrat | ✅ | ✅ | ❌ | ❌ | ❌ |
| Enregistrer paiement | ✅ | ✅ | ✅ | ❌ | ❌ |
| Créer charge | ✅ | ✅ | ✅ | ❌ | ❌ |
| Valider charge | ✅ | ✅ | ❌ | ❌ | ❌ |
| Créer immobilisation | ✅ | ✅ | ✅ | ❌ | ❌ |
| Proposer caution | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approuver montant caution hors-barème | ✅ | ❌ | ❌ | ❌ | ❌ |
| Proposer reprise | ✅ | ✅ | ✅ | ❌ | ❌ |
| Valider reprise (SM) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approuver reprise (Admin) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Créer incident | ✅ | ✅ | ✅ | ✅ | ❌ |
| Avancer étape accident | ✅ | ✅ | ✅ | ❌ | ❌ |
| Soumettre photo | ✅ | ✅ | ✅ | ✅ | ❌ |
| Enregistrer carburant | ✅ | ✅ | ✅ | ❌ | ❌ |
| Générer relevé mensuel | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approuver relevé mensuel | ✅ | ✅ | ❌ | ❌ | ❌ |
| Voir portail propriétaire | ✅ | ❌ | ❌ | ❌ | ✅ ses véhicules |
| Gérer managers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gérer permissions | ✅ | ❌ | ❌ | ❌ | ❌ |
| Voir audit logs | ✅ | ✅ | ❌ | ❌ | ❌ |

### Implémentation NestJS

```typescript
// Décorateur rôle (coarse-grained)
@Roles(UserRole.SUPER_MANAGER, UserRole.ADMIN)
@Post(':id/validate')
async validateCharge(@Param('id') id: string, @CurrentUser() user: User) {}

// Décorateur permission atomique (fine-grained)
@RequirePermission('can_approve_repossession')
@Post(':id/admin-approve')
async approveRepossession() {}

// Guards globaux dans app.module.ts
APP_GUARD: JwtAuthGuard       → vérifie JWT valide
APP_GUARD: RolesGuard         → vérifie rôle minimum
APP_GUARD: PermissionsGuard   → vérifie permission atomique si @RequirePermission

// Ownership check: le Manager ne voit QUE ses véhicules — dans le service, pas le guard
async findAll(user: User, filters: VehicleFiltersDto) {
  if (user.role === UserRole.MANAGER) filters.managerId = user.id;
  if (user.role === UserRole.OWNER)   filters.ownerId = user.ownerId;
}
```

---

## 3. Conventions Notifications

### Enum NotificationType (exhaustif — extension par migration uniquement)

```typescript
// Synchronisé avec le schéma Prisma NotificationType
// Toute nouvelle valeur nécessite: 1. migration Prisma, 2. mise à jour ici

enum NotificationType {
  // ── Chauffeur ──────────────────────────────────────────────────
  PAYMENT_RECEIVED           // Paiement enregistré
  PAYMENT_INCOMPLETE         // Paiement partiel reçu
  VEHICLE_BLOCKED            // Véhicule bloqué (Carcul ou Admin)
  PHOTO_MISSION_REQUIRED     // Nouvelle mission photo
  PHOTO_MISSION_OVERDUE      // Mission photo en retard
  VEHICLE_RETURNED_TO_DRIVER // Véhicule remis après réparation
  CONTRACT_ACTIVATED         // Contrat activé
  CONTRACT_SUSPENDED         // Contrat suspendu
  SPECIAL_ABSENCE_APPROVED   // Absence spéciale approuvée
  SPECIAL_ABSENCE_REJECTED   // Absence spéciale refusée

  // ── Manager ────────────────────────────────────────────────────
  APPOINTMENT_CREATED        // Rendez-vous créé dans son planning
  MAINTENANCE_DUE_SOON       // Vidange bientôt nécessaire
  TECHNICAL_VISIT_DUE_SOON   // Visite technique bientôt nécessaire
  DOCUMENT_EXPIRING_SOON     // Document expire dans ≤30 jours
  DOCUMENT_EXPIRED           // Document expiré
  ACCIDENT_DECLARED          // Accident déclaré par chauffeur
  BREAKDOWN_DECLARED         // Panne déclarée par chauffeur
  CHARGE_PENDING_VALIDATION  // Charge à valider
  CHARGE_VALIDATED           // Charge validée par SM
  SPECIAL_ABSENCE_REQUESTED  // Absence spéciale demandée
  KYC_VALIDATED              // KYC chauffeur validé
  VEHICLE_IMMOBILIZED        // Véhicule immobilisé
  VEHICLE_RELEASED           // Véhicule libéré de l'immobilisation
  DEPOSIT_VALIDATION_REQUIRED // Caution hors-barème à valider

  // ── Super Manager ──────────────────────────────────────────────
  PENALTY_VALIDATED          // Pénalité validée
  REPOSSESSION_REQUESTED     // Reprise proposée par Manager
  REPOSSESSION_APPROVED      // Reprise approuvée par Admin

  // ── Propriétaire ───────────────────────────────────────────────
  OWNER_SETTLEMENT_READY     // Relevé mensuel disponible
  OWNER_SETTLEMENT_PAID      // Relevé mensuel réglé

  // ── Admin (HIGH/CRITICAL uniquement — voir règle de filtrage) ──
  CRITICAL_ACCIDENT          // Accident critique (priority = CRITICAL)
  FRAUD_ALERT                // Alerte fraude photo (priority = CRITICAL)
  LARGE_UNPAID               // Gros impayé détecté (priority = HIGH)
}
```

### Règles de distribution

```typescript
async send(dto: CreateNotificationDto): Promise<void> {
  const user = await this.prisma.user.findUniqueOrThrow({ where: { id: dto.userId } });

  // L'Admin ne reçoit que HIGH et CRITICAL — jamais de spam opérationnel
  if (user.role === UserRole.ADMIN && dto.priority < NotificationPriority.HIGH) {
    return;
  }

  // 1. Persister en base
  const notification = await this.prisma.notification.create({ data: dto });

  // 2. Push FCM si token disponible
  if (user.fcmToken) {
    await this.fcmService.send(user.fcmToken, {
      title: dto.title,
      body: dto.message,
      data: { entityType: dto.entityType ?? '', entityId: dto.entityId ?? '' },
    });
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { fcmSent: true, sentAt: new Date() },
    });
  }
}
```

---

## 4. Conventions Base de Données

### Champs obligatoires sur toutes les entités

```prisma
id        String   @id @default(uuid())
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

### Soft delete — périmètre exact

Entités avec `deletedAt DateTime?` : **User, Driver, Owner, Vehicle, Contract** uniquement.

Entités immuables (jamais de suppression) : Payment, DailyEntry, AuditLog, Photo, MediaAsset, DriverScoreEvent, VehicleScoreEvent, LedgerEntry.

```typescript
// Middleware dans PrismaService — appliqué automatiquement
prisma.$use(async (params, next) => {
  const softDeleteModels = ['User', 'Driver', 'Owner', 'Vehicle', 'Contract'];
  if (softDeleteModels.includes(params.model ?? '')) {
    if (['findMany', 'findFirst', 'findFirstOrThrow'].includes(params.action)) {
      params.args.where = { ...params.args.where, deletedAt: null };
    }
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }
  }
  return next(params);
});
```

### Montants financiers

```prisma
// Toujours Decimal, JAMAIS Float pour l'argent
amount Decimal @db.Decimal(12, 2)
// Devise par défaut : XOF (Franc CFA Ouest-Africain)
currency String @default("XOF")
```

### Statuts et types

```prisma
// Toujours des enums typés, JAMAIS des String libres pour les statuts
status ContractStatus @default(DRAFT)
type   ChargeType
```

### Index systématiques

- Toutes les colonnes FK (`vehicleId`, `driverId`, `contractId`, etc.)
- Colonnes de statut fréquemment filtrées (`status`, `isActive`)
- `createdAt` et `date` sur entités volumineuses (`payments`, `daily_entries`, `audit_logs`)
- Index composites `(entityType, entityId)` pour associations polymorphiques
- Index composites sur clés de requêtes fréquentes : `(contractId, date)`, `(vehicleId, status)`

---

## 5. Calcul des jours validés (règle fondamentale)

```typescript
// src/common/utils/days-calculator.ts

// RÈGLE : 1 jour validé = dailyAmount intégralement payé
// Jamais de date de fin fixe — la progression s'étend naturellement

function calculateValidatedDays(amount: Decimal, dailyAmount: Decimal): number {
  if (dailyAmount.isZero()) return 0;
  return Math.floor(amount.div(dailyAmount).toNumber());
}

// Exemple: 75 000 FCFA / 25 000 FCFA par jour → 3 jours validés

// Jours ne comptant PAS dans validatedDays :
// - REST_DAY    : jour de repos contractuel
// - IMMOBILIZED : véhicule immobilisé (contrat gelé)
// - EXCUSED     : absence spéciale approuvée

// Progression OWNERSHIP_PROGRAM = validatedDays / targetDays
// Dès validatedDays === targetDays → contrat COMPLETED
```

---

## 6. Conventions Carburant

```typescript
// RÈGLE MÉTIER INVIOLABLE :
// Le véhicule est TOUJOURS remis au chauffeur avec le plein (FuelLevel.FULL).
// Toute remise génère un FuelTransaction de type INITIAL_FULL_TANK.
// Toute reprise génère un FuelTransaction de type RETURN_CHECK.
// Si fuelLevel < FULL au retour → charge possible sur le chauffeur (DRIVER).

// Points de contrôle :
// 1. Inspection VEHICLE_DELIVERY → FuelTransaction INITIAL_FULL_TANK (fuelLevel = FULL)
// 2. Inspection VEHICLE_RETURN   → FuelTransaction RETURN_CHECK
// 3. Si RETURN_CHECK.fuelLevel ≠ FULL → service crée une Charge de type CLEANING ou OTHER

// Anti-fraude carburant :
// Toute transaction carburant par un Manager requiert une photo (photoUrl obligatoire)
// pour les types REFILL et RETURN_CHECK.
```

---

## 7. Conventions Relevé Mensuel (PARTNER_FLEET)

```typescript
// Formule de calcul (voir docs/SETTLEMENT_LOGIC.md pour détails complets)

totalExpenses    = ownerExpenses + companyExpenses + maintenanceCosts
// NB: driverExpenses tracées mais n'impactent PAS le bénéfice propriétaire

grossProfit      = totalRevenue - totalExpenses
commission       = calculateCommission(type, base, fixed, %, grossProfit, totalRevenue)
ownerAmountDue   = grossProfit - commission

// Snapshot : les paramètres commission sont copiés dans MonthlySettlement à la génération.
// Toute modification ultérieure du contrat n'affecte PAS les relevés existants.

// Unicité : @@unique([contractId, year, month])
// Un seul relevé par contrat par mois. Régénérer remplace le DRAFT existant.

// Immuabilité : dès statut APPROVED → les chiffres sont figés.
// Correction → nouveau relevé ou avoir manuel uniquement.
```

---

## 8. Convention Médias (MediaAsset)

```typescript
// RÈGLE ANTI-FRAUDE :
// Les chauffeurs ne peuvent uploader que via IN_APP_CAMERA (src = MediaSource.IN_APP_CAMERA).
// Vérification dans MediaAssetsService.validateUpload():

async validateUpload(userId: string, source: MediaSource): Promise<void> {
  const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.role === UserRole.DRIVER && source !== MediaSource.IN_APP_CAMERA) {
    throw new ForbiddenException('Les chauffeurs doivent utiliser l\'appareil photo de l\'app.');
  }
}

// Horodatage serveur (serverTimestamp) prend toujours la priorité sur le timestamp appareil.

// Signed URLs : les URLs fichiers ne sont JAMAIS exposées directement dans les réponses API.
// Toujours via getSignedUrl() avec TTL court (15 min par défaut).

// Structure S3/Supabase Storage
// fleet-storage/
// ├── vehicles/{vehicleId}/
// │   ├── documents/{documentId}/{filename}
// │   └── photos/{missionId}/{photoId}/{filename}
// ├── drivers/{driverId}/kyc/{filename}
// ├── contracts/{contractId}/documents/{filename}
// ├── incidents/{incidentId}/photos/{filename}
// └── inspections/{inspectionId}/photos/{filename}
```

---

## 9. Convention Audit Log

Toutes les actions sensibles génèrent un `AuditLog` automatiquement.

```typescript
// Déclencheur : @Audit('ACTION_NAME') sur le controller → AuditLogInterceptor

// Actions auditées obligatoirement :
// Contrats:     CONTRACT_CREATED · ACTIVATED · SUSPENDED · CLOSED
// Charges:      CHARGE_VALIDATED · REJECTED · ADDED_TO_CONTRACT
// Caution:      DEPOSIT_VALIDATED · USED · REFUNDED
// Reprises:     REPOSSESSION_PROPOSED · SM_VALIDATED · ADMIN_APPROVED
// Véhicule:     VEHICLE_STATUS_CHANGED · VEHICLE_IMMOBILIZED · VEHICLE_RELEASED
// Chauffeur:    DRIVER_STATUS_CHANGED · DRIVER_BLACKLISTED · DRIVER_KYC_VALIDATED
// Finance:      PAYMENT_RECORDED · PENALTY_VALIDATED
// Permissions:  PERMISSION_GRANTED · PERMISSION_REVOKED
// Relevés:      SETTLEMENT_APPROVED · SETTLEMENT_PAID

// Format AuditLog.action : SCREAMING_SNAKE_CASE, constantes dans common/constants/audit-actions.ts
```

---

## 10. Convention Cron Jobs

```typescript
// documents/document-expiry.service.ts
// Tâche quotidienne 08h00 : reminders + mise à jour statuts documents
@Cron('0 8 * * *')
async checkDocumentExpiry() {
  // Rappels : 30j → reminder30SentAt, 15j → reminder15SentAt,
  //           7j  → reminder7SentAt,  1j  → reminder1SentAt
  // Chaque rappel n'est envoyé qu'une seule fois (champ null → envoyer, non-null → ignorer)
  // Si isCritical = true → notifier aussi l'Admin (DOCUMENT_EXPIRED, priority = HIGH)
}

// maintenance/mileage.service.ts
// Alerte vidange si kilométrage > (dernière vidange + 9 500 km)
@Cron('0 9 * * *')
async checkOilChangeNeeded() {}

// photos/photos.service.ts
// Rappels missions photo non complétées (REGULAR_VEHICLE: 2x/semaine, DASHBOARD: 1x/semaine)
@Cron('0 10 * * *')
async sendPhotoMissionReminders() {}

// settlements/settlement-calculator.service.ts
// Génération automatique des relevés PARTNER_FLEET en fin de mois (optionnel)
@Cron('0 6 1 * *') // 1er de chaque mois à 06h00
async generateMonthlySettlements() {
  // Pour chaque contrat PARTNER_FLEET actif → upsert DRAFT si inexistant
  // Ne génère pas si un DRAFT ou plus existe déjà pour ce mois
}

// scoring/scoring.service.ts
// Recalcul des scores (si calcul périodique plutôt qu'événementiel)
@Cron('0 3 * * *')
async refreshScores() {}
```

---

## 11. Convention LedgerEntry

```typescript
// Chaque service financier appelle LedgerService.createEntry() avant de retourner.
// Jamais de LedgerEntry créée directement depuis un controller.

// Exemple dans PaymentsService :
async recordPayment(dto: CreatePaymentDto, actor: User): Promise<Payment> {
  const payment = await this.prisma.payment.create({ data: dto });

  await this.ledgerService.createEntry({
    contractId: dto.contractId,
    vehicleId:  dto.vehicleId,
    entryType:  LedgerEntryType.DAILY_REVENUE,
    direction:  LedgerDirection.CREDIT,
    amount:     dto.amount,
    sourceType: 'PAYMENT',
    sourceId:   payment.id,
    recordedById: actor.id,
    occurredAt: dto.paidAt,
  });

  return payment;
}
```
