# Décisions Architecturales — Fleet Platform V2
# Référence technique avant Phase 2 — NE PAS DÉBUTER le scaffold sans validation humaine

---

## 1. Décisions prises et figées

### D-01 · Modular Monolith (pas de microservices au MVP)

**Décision** : Architecture NestJS Modular Monolith unique — tous les modules dans un seul process.

**Pourquoi** : La flotte cible du MVP (<100 véhicules) ne justifie pas la complexité opérationnelle des microservices. Le monolith modulaire permet une extraction future vers des services si la charge l'exige, sans refactoring massif dès le départ.

**Limite** : Si la charge dépasse 500 requêtes/seconde ou si la flotte dépasse 500 véhicules, réévaluer le découpage `settlements` et `analytics` en services indépendants.

---

### D-02 · PostgreSQL + Prisma 7 (url DB hors schema.prisma)

**Décision** : `prisma/prisma.config.ts` gère l'URL de connexion. `schema.prisma` ne contient que `datasource db { provider = "postgresql" }` sans champ `url`.

**Pourquoi** : Breaking change de Prisma 7 — la propriété `url` dans le bloc `datasource` n'est plus supportée.

**Règle** : Ne jamais remettre `url = env("DATABASE_URL")` dans `schema.prisma`.

---

### D-03 · Associations polymorphiques via (entityType + entityId)

**Décision** : Les relations "un-vers-plusieurs-types" (Document → Vehicle|Driver|Contract|..., Notification, AuditLog, LedgerEntry, MediaAsset, VehicleAvailabilityEvent, DriverScoreEvent) utilisent une paire `entityType String` + `entityId String` avec un index composite `@@index([entityType, entityId])`.

**Pourquoi** : Prisma ne supporte pas les FK polymorphiques natives. L'alternative (tables de jonction par type) créerait 10+ tables supplémentaires avec des joins complexes. La paire string+string est lisible, extensible et performante avec l'index.

**Règle** : Les valeurs `entityType` sont des constantes définies dans `common/constants/entity-types.ts`, pas des strings libres.

---

### D-04 · Deux relations nommées Vehicle ↔ Contract

**Décision** :
- `"ContractVehicle"` : relation 1:N historique (`Vehicle.contracts` ↔ `Contract.vehicle`)
- `"VehicleCurrentContract"` : relation 0:1 dénormalisée (`Vehicle.currentContract` ↔ `Contract.currentForVehicle`) avec `@unique` sur `currentContractId`

**Pourquoi** : Prisma exige des noms explicites quand deux modèles ont plus d'une relation entre eux. L'`@unique` est nécessaire car un même contrat ne peut être "courant" que d'un seul véhicule.

**Règle** : `currentContractId` est mis à jour par le service `ContractsService.activate()` et `ContractsService.close()` uniquement — jamais directement via Prisma client.

---

### D-05 · Soft delete limité à 5 entités

**Décision** : Soft delete (`deletedAt DateTime?`) uniquement sur : `User`, `Driver`, `Owner`, `Vehicle`, `Contract`.

**Pourquoi** : Éviter la complexité d'un filtre global sur 45 modèles. Les entités transactionnelles (Payment, DailyEntry, Charge, etc.) sont immuables par nature — elles ne sont jamais supprimées, même logiquement.

**Règle** : `AuditLog` et `LedgerEntry` sont immuables absolus — zéro soft delete, zéro update.

---

### D-06 · MediaAsset comme store central de fichiers

**Décision** : `MediaAsset` centralise toutes les métadonnées fichier (url, hash, GPS, timestamp serveur, source, MIME). `Photo` et `Document` sont des wrappers sémantiques référençant `MediaAsset` via `mediaAssetId @unique`.

**Pourquoi** : Évite de dupliquer la logique fichier dans chaque modèle. Le hash perceptuel (`hash`) permet de détecter les doublons. Le `serverTimestamp` pris côté serveur invalide les tentatives de manipulation de timestamp appareil.

**Règle anti-fraude** : `MediaSource.IN_APP_CAMERA` est la seule source autorisée pour les drivers. Validé dans `MediaAssetsService.validateUpload()` — jamais dans le controller.

---

### D-07 · Snapshot des paramètres commission dans MonthlySettlement

**Décision** : Les champs `mgmtFeeTypeSnapshot`, `mgmtFeeBaseSnapshot`, `mgmtFeePercentageSnapshot`, `mgmtFeeFixedSnapshot` copient les règles du contrat au moment de la génération du relevé.

**Pourquoi** : Toute modification ultérieure des termes du contrat ne doit pas rétroactivement modifier les relevés déjà générés. L'immuabilité des relevés approuvés est une exigence comptable.

**Règle** : Dès `status = APPROVED`, tous les champs financiers de `MonthlySettlement` sont figés. Toute correction passe par un nouveau relevé ou un avoir manuel tracé dans `LedgerEntry`.

---

### D-08 · DailyEntry comme unité de progression (jamais une date fixe)

**Décision** : La progression `OWNERSHIP_PROGRAM` = `validatedDays / targetDays`. La date de fin de contrat n'est jamais fixe — elle se prolonge automatiquement.

**Pourquoi** : Un chauffeur qui rate des jours de paiement ne se retrouve pas "en retard" sur une date, il prolonge simplement son contrat. La logique est centrée sur les jours payés, pas sur un calendrier.

**Règle** : `validatedDays` n'est incrémenté que par `DailyEntriesService` quand une `DailyEntry` passe à `VALIDATED`. Jamais mis à jour directement.

---

### D-09 · Permission engine — code en snake_case string (pas enum)

**Décision** : `Permission.code` est un `String @unique` (ex: `"can_validate_charge"`) plutôt qu'une enum Prisma.

**Pourquoi** : Ajouter une nouvelle permission ne nécessite pas de migration de schéma — seulement un `INSERT` dans la table `permissions`. Les enums nécessitent une migration et un redéploiement.

**Règle** : Les codes sont définis comme constantes TypeScript dans `common/constants/permissions.ts` et sont la source de vérité. Tout nouveau code doit y être déclaré avant d'être utilisé dans un guard.

---

### D-10 · LedgerEntry — alimentation applicative (pas de trigger DB)

**Décision** : Les entrées de grand livre sont créées par `LedgerService.createEntry()` appelé explicitement dans chaque service financier (PaymentsService, ChargesService, DepositsService, SettlementsService).

**Pourquoi** : Les triggers PostgreSQL sont difficiles à tester, à versionner et à déboguer. L'alimentation applicative est traçable dans le code et testable unitairement.

**Limite** : Si un service financier appelle `createEntry()` dans un bloc try/catch mal géré, une entrée peut manquer. Mitiger via une transaction Prisma englobante.

---

### D-11 · Score chauffeur/véhicule — valeur initiale 100.0

**Décision** : `Driver.scoreValue` et `Vehicle.scoreValue` démarrent à `100.0`. Les événements `DriverScoreEvent` et `VehicleScoreEvent` tracent chaque variation avec `scoreBefore` et `scoreAfter`.

**Pourquoi** : Permet de reconstruire l'historique complet du score depuis l'origine. Le score courant dans `Driver.scoreValue` est une dénormalisation pour la performance des dashboards.

**Point à arbitrer** : La formule de calcul du score n'est pas encore définie (voir section 3).

---

### D-12 · Contravention — responsable toujours DRIVER

**Décision** : Une `Contravention` est toujours à la charge du chauffeur. Elle ne réduit pas le bénéfice du propriétaire dans les relevés `PARTNER_FLEET`.

**Pourquoi** : Règle métier de la société — le chauffeur est responsable de ses infractions, indépendamment du contrat.

**Implémentation** : `SettlementExpenseLine.responsible = DRIVER` + `impactsProfit = false` pour les contraventions éventuellement incluses dans un relevé.

---

### D-13 · Caution — validation Admin si montant hors-barème

**Décision** : `Deposit.isStandardAmount = false` déclenche le workflow de validation Admin obligatoire. Le barème standard est 2 jours de recette OU 50 000 FCFA.

**Pourquoi** : Protéger contre les montants arbitraires de caution fixés sans contrôle. Le Super Manager peut proposer un montant différent (urgence, profil risqué) mais l'Admin doit valider.

---

### D-14 · Document — versioning via parentDocId

**Décision** : Quand un document est renouvelé, l'ancien reçoit `isLatest = false` et le nouveau a `parentDocId` pointant vers l'ancien, `version` incrémenté, `isLatest = true`.

**Pourquoi** : Conservation de l'historique documentaire complet sans supprimer les versions précédentes. Exigence réglementaire pour les documents d'assurance et cartes grises.

---

### D-15 · VehicleAvailabilityEvent — alimentation par les services métier

**Décision** : Chaque service qui crée une non-disponibilité (ImmobilizationsService, SpecialAbsencesService, AccidentsService, MaintenanceService) appelle `AvailabilityService.recordEvent()` en fin de traitement.

**Pourquoi** : Source de vérité unique pour expliquer pourquoi un véhicule n'est pas en service. Permet les rapports de taux de disponibilité par véhicule, par manager, par mois.

---

## 2. Points encore à arbitrer

| # | Sujet | Options | Impact | Priorité |
|---|-------|---------|--------|----------|
| **A** | **Formule de score chauffeur/véhicule** | Définie par événement (poids fixe par catégorie) vs. ML (Ollama local) | Complexité initiale vs. pertinence scores | Avant Phase 3 |
| **B** | **LedgerEntry — granularité** | Entrée par paiement individuel vs. résumé journalier | Volume table vs. précision comptable | Avant Phase 2 (Payments) |
| **C** | **OwnerSettlementPayment.paymentMethod** | 4 valeurs actuelles (BANK_TRANSFER, CASH, MOBILE_MONEY, CHECK, OTHER) suffisent-elles ? Ou ajouter WAVE, ORANGE_MONEY comme valeurs distinctes ? | Si intégration Wave/Orange Money en Phase 5, migration enum nécessaire | Avant Phase 2 (Settlements) |
| **D** | **UserPermissionOverride.expiresAt** | Nullable actuel (permission permanente par défaut) vs. toujours obligatoire avec date lointaine | Sécurité : forcer l'expiration des surcharges ? | Avant Phase 2 (Auth) |
| **E** | **Audit log — périmètre complet** | Actuel : actions financières et sensibles listées. Élargir à tous les CRUD ? | Volume DB (chaque update = 2 JSON blobs) | Avant Phase 2 |
| **F** | **MgmtFeeBase sur contrat FIXED** | Quand `mgmtFeeType = FIXED`, le champ `mgmtFeeBase` est sans effet — le rendre nullable selon le type ou garder simple ? | Clarté schema vs. overhead UX | Avant Phase 2 (Settlements) |
| **G** | **Score — reset mensuel ou cumulatif** | Score cumulatif depuis le début (décision actuelle) vs. reset mensuel pour un "fresh start" | Motivation chauffeur vs. historique long terme | Avant Phase 3 |
| **H** | **Génération relevé — automatique ou manuelle** | Cron le 1er de chaque mois (génère DRAFT auto) vs. toujours manuelle par Manager | Confort opérationnel vs. contrôle | Avant Phase 2 (Settlements) |

---

## 3. Règles métier critiques — inviolables

Ces règles doivent être vérifiées côté **service backend**, pas seulement dans l'UI.

### Progression et jours

```
R-01 : validatedDays ne peut qu'augmenter, jamais diminuer.
R-02 : targetDays est fixé à la création du contrat OWNERSHIP_PROGRAM. Non modifiable après activation.
R-03 : Un jour REST_DAY, IMMOBILIZED ou EXCUSED ne compte pas dans validatedDays.
R-04 : La date de fin de contrat n'est JAMAIS fixe — progression = validatedDays / targetDays.
```

### Caution

```
R-05 : Un contrat ne peut pas être activé si depositPaid = false.
R-06 : La caution est remboursée uniquement après ContractStatus.COMPLETED ou TERMINATED.
R-07 : Tout usage (USAGE) de la caution doit être justifié par une ChargeId ou une note.
```

### Carburant

```
R-08 : Toute remise véhicule (Inspection VEHICLE_DELIVERY) → FuelTransaction INITIAL_FULL_TANK obligatoire.
R-09 : Si FuelLevel au retour ≠ FULL → le service doit créer une charge chauffeur automatiquement.
R-10 : Les photos chauffeurs → MediaSource.IN_APP_CAMERA uniquement (vérification serveur).
```

### Accident (14 étapes strictement ordonnées)

```
R-11 : Les étapes AccidentStep sont ordonnées. On ne peut avancer que d'une étape à la fois.
R-12 : La photo de remorquage doit avoir la plaque du véhicule visible (towingPlateVisible = true).
R-13 : Les dépenses accident (AccidentExpense) ≥ seuil défini → validation Super Manager obligatoire.
```

### Reprise véhicule

```
R-14 : Workflow 3 niveaux obligatoire : Manager (PROPOSED) → Super Manager (SM_VALIDATED) → Admin (ADMIN_APPROVED).
R-15 : Aucun contrat ne peut être créé sur un véhicule en statut REPOSSESSED.
```

### Relevé mensuel

```
R-16 : Un seul relevé par (contractId, year, month). Contrainte DB + vérification service.
R-17 : Après APPROVED → zéro modification des montants. Toute correction = nouveau relevé ou avoir.
R-18 : Les charges DRIVER sont incluses dans le relevé (SettlementExpenseLine) mais impactsProfit = false.
R-19 : Les snapshots commission sont copiés à la génération — non modifiables après.
```

### Notifications

```
R-20 : L'Admin ne reçoit que les notifications de priorité HIGH et CRITICAL.
R-21 : Le propriétaire ne peut voir les relevés qu'à partir du statut SENT_TO_OWNER.
```

### Documents

```
R-22 : Un document expiré bloquant (isCritical = true) doit notifier l'Admin, pas seulement les Managers.
R-23 : Les rappels d'expiration (30j, 15j, 7j, 1j) ne sont envoyés qu'une seule fois chacun.
```

---

## 4. Limites du MVP

Ces limites sont conscientes et acceptées pour la Phase 1-2.

| Limite | Description | Phase cible |
|--------|-------------|-------------|
| **Pas d'intégration Wave/Orange Money** | Les paiements sont enregistrés manuellement. PaymentSource.WAVE est prévu dans le schéma mais pas encore connecté à l'API Wave. | Phase 5 |
| **Pas d'intégration Carcul GPS** | `carculVehicleId` et `carculRef` sont présents. Le module `gps-carcul` existe mais sans implementation. Contraventions et kilométrages source CARCUL sont enregistrables mais non remontés automatiquement. | Phase 5 |
| **Pas d'OCR documents** | Les documents sont uploadés manuellement. L'extraction automatique des dates d'expiration par OCR (Ollama local) n'est pas implémentée. | Phase 5 |
| **LedgerEntry préparatoire** | Le grand livre est structuré et alimenté mais pas exposé en API ni utilisé pour de la comptabilité réelle. | Phase 4 |
| **Scoring sans formule finalisée** | Les modèles `DriverScoreEvent` et `VehicleScoreEvent` sont prêts. La formule de calcul des impacts par catégorie n'est pas encore définie. | Avant Phase 3 |
| **Analytics** | Le module `analytics` existe mais sans implementation. Aucun rapport n'est généré. | Phase 4 |
| **Portail propriétaire** | Le schéma et les routes sont définis. L'interface Next.js n'est pas développée. | Phase 4 |
| **App chauffeur Flutter** | Non développée. Les endpoints API sont conçus pour la supporter. | Phase 3 |

---

## 5. Modules à ne pas développer en Phase 2

La Phase 2 se limite au **scaffold NestJS** et aux **modules fondamentaux**. Les modules suivants sont exclus jusqu'à validation explicite.

### Exclus de la Phase 2

| Module | Raison |
|--------|--------|
| `gps-carcul/` | Dépend d'une API externe Carcul — à intégrer en Phase 5 |
| `analytics/` | Nécessite des données réelles accumulées — à développer en Phase 4 |
| `ledger/` (exposition API) | Préparatoire — alimenter en silence, pas d'endpoint public avant Phase 4 |
| `scoring/` (formule complète) | Formule non finalisée (voir point A dans arbitrages) |
| App Flutter chauffeur | Phase 3 |
| Portail propriétaire Next.js | Phase 4 |

### Modules Phase 2 (dans l'ordre)

```
Priorité 1 — Fondations
  1. prisma/ (migrations initiales)
  2. auth/ (JWT, login multi-app)
  3. users/ (CRUD + gestion compte)
  4. permissions/ (moteur RBAC)

Priorité 2 — Véhicule & Chauffeur
  5. owners/
  6. vehicles/
  7. drivers/ (avec kyc + field-validation)
  8. manager-assignments/
  9. driver-assignments/

Priorité 3 — Contrats & Finance
  10. contracts/ (avec checklist pré-activation)
  11. deposits/
  12. payments/ + daily-entries/
  13. charges/

Priorité 4 — Opérations
  14. immobilizations/
  15. special-absences/
  16. contraventions/
  17. availability/ (VehicleAvailabilityEvent)

Priorité 5 — Médias & Documents
  18. media-assets/ (S3/Supabase upload)
  19. documents/ + document-expiry (cron)
  20. photos/ + photo-missions/
  21. inspections/
  22. fuel/

Priorité 6 — Incidents (Phase 3)
  23. incidents/
  24. accidents/ + accident-steps/
  25. repossessions/
  26. maintenance/ + mileage/

Priorité 7 — Relevés & Propriétaire (Phase 3-4)
  27. settlements/ (calcul + workflow)
  28. tasks/ + notifications/
  29. scoring/
  30. ledger/ (API exposition)
```

---

## 6. Conventions de développement Phase 2

```
├── Chaque module NestJS :
│   ├── *.module.ts            → imports, providers, exports, controllers
│   ├── *.controller.ts        → routes, @Roles, @RequirePermission, @Audit
│   ├── *.service.ts           → logique métier, PrismaService
│   ├── dto/
│   │   ├── create-*.dto.ts    → class-validator, @ApiProperty
│   │   └── update-*.dto.ts    → PartialType(CreateDto)
│   └── *.service.spec.ts      → tests unitaires (Prisma mocké par défaut)
│
├── Aucun test end-to-end avant Phase 3
├── Swagger activé en DEV uniquement (NODE_ENV !== 'production')
├── Toutes les dates : UTC côté serveur, conversion client-side
├── Tous les IDs : UUID v4 (uuid())
└── Aucune logique métier dans les controllers — services uniquement
```
