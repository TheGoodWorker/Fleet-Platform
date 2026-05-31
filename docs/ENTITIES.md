# ÉTAPE 1 — Analyse complète des entités métier

## Vision architecturale

Le système est centré sur 5 agrégats principaux qui ne doivent JAMAIS être mélangés :

```
PROPRIÉTAIRE → VÉHICULE ← CONTRAT → CHAUFFEUR
                                  ↘
                               MANAGER (superviseur)
```

---

## GROUPE 1 — Identité & Accès

### `User` (Base de tous les utilisateurs)
**Responsabilité** : Authentification, rôle, coordonnées, token FCM.  
**Relations** : 1:1 Driver, 1:1 Owner. N notifications, N audit_logs.  
**Rôles** : ADMIN, SUPER_MANAGER, MANAGER, DRIVER, OWNER.

### `Driver` (Profil chauffeur étendu)
**Responsabilité** : KYC, statut, score, contrats, véhicules conduits.  
**Relations** : 1:1 User, 1:1 DriverKYC, 1:1 DriverFieldValidation, N Contract, N VehicleDriverAssignment.

### `DriverKYC`
**Responsabilité** : Vérification documents d'identité, permis, photo, téléphone.  
**Relations** : 1:1 Driver.

### `DriverFieldValidation`
**Responsabilité** : Visite domicile, GPS, personne ressource, contacts famille, commentaire Manager.  
**Relations** : 1:1 Driver.

### `Owner` (Propriétaire/Investisseur)
**Responsabilité** : Entité propriétaire (interne ou externe), lie les véhicules.  
**Relations** : 1:1 User (optionnel), N Vehicle, N Contract.

---

## GROUPE 2 — Véhicule & Affectations

### `Vehicle` (Véhicule de la flotte)
**Responsabilité** : Plaque, VIN, marque, état courant, mileage, score, lien propriétaire.  
**Champs dénormalisés** : currentManagerId, currentDriverId, currentContractId (pour performance).  
**Relations** : N:1 Owner, N VehicleManagerAssignment, N VehicleDriverAssignment, N Contract, N Incident, N Immobilization, N MaintenanceRecord, N MileageRecord, N PhotoMission, N Inspection, N Document (polymorphique), N Contravention.

### `VehicleManagerAssignment`
**Responsabilité** : Historique complet des affectations Manager → Véhicule.  
**Règle** : Un seul actif à la fois (isActive). Motif de changement obligatoire.  
**Relations** : N:1 Vehicle, N:1 User(Manager).

### `VehicleDriverAssignment`
**Responsabilité** : Affectation Chauffeur → Véhicule avec source (CARCUL/MANAGER/ADMIN_CORRECTION).  
**Règle** : 1 chauffeur pour Programme Propriété. N chauffeurs pour Flotte Partenaire/Location.  
**Relations** : N:1 Vehicle, N:1 Driver, N:1 Contract.

---

## GROUPE 3 — Contrat (cœur du système financier)

### `Contract`
**Responsabilité** : Contrat entre chauffeur/propriétaire et la société. Type, montant journalier, jours cibles, caution, statut, règles.  
**3 types** : OWNERSHIP_PROGRAM (Drive-to-Own), PARTNER_FLEET, SIMPLE_RENTAL.  
**Relations** : N:1 Vehicle, N:1 Driver, N:1 Owner, N Payment, N DailyEntry, N Charge, 1:1 Deposit, N Immobilization, N Inspection, N SpecialAbsence, 1 VehicleRepossession.  
**Succession** : parentContractId pour chaîner les contrats successifs sur un même véhicule.

### `Payment` (Paiement journalier/multiple)
**Responsabilité** : Enregistrement d'un paiement. Calcul automatique du nombre de jours couverts. Source : MANUAL, WAVE, ORANGE_MONEY.  
**Relations** : N:1 Contract, N:1 Driver, N DailyEntry.

### `DailyEntry` (Suivi jour par jour)
**Responsabilité** : Représente un jour calendaire pour un contrat. Statut : VALIDATED, PARTIALLY_PAID, UNPAID, REST_DAY, IMMOBILIZED, EXCUSED, BLOCKED.  
**C'est la base de la progression visuelle (voitures).**  
**Contrainte** : unique(contractId, date).  
**Relations** : N:1 Contract, N:1 Payment (optionnel).

---

## GROUPE 4 — Charges & Caution

### `Charge` (Charge additionnelle universelle)
**Responsabilité** : Franchise, réparation, contravention, pénalité, remorquage, pneu, batterie, accessoire, nettoyage, autre.  
**Workflow** : DRAFT → PENDING_VALIDATION → VALIDATED/REJECTED → PAID/PARTIALLY_PAID/ADDED_TO_CONTRACT.  
**Responsable financier** : proposé par Manager, validé par Super Manager.  
**Relations** : N:1 Vehicle, N:1 Contract, N:1 Driver, N:1 Incident, N Document (polymorphique).

### `Deposit` (Caution)
**Responsabilité** : Caution avec montant recommandé, demandé, validé, payé, utilisé, remboursé.  
**Règle** : 2 jours de recette ou 50 000 FCFA par défaut. Ajusté par Super Manager, validé par Admin.  
**Relations** : 1:1 Contract, N DepositTransaction.

### `DepositTransaction`
**Responsabilité** : Chaque mouvement sur la caution (paiement, utilisation, remboursement, ajustement).  
**Relations** : N:1 Deposit.

### `Contravention`
**Responsabilité** : Historique des contraventions. Source : CARCUL ou MANUAL. Toujours à la charge du chauffeur.  
**Relations** : N:1 Vehicle, N:1 Driver, N Document (polymorphique).

---

## GROUPE 5 — Opérations terrain

### `Immobilization`
**Responsabilité** : Immobilisation véhicule (responsable ou non responsable chauffeur). Gèle le contrat si non responsable.  
**Relations** : N:1 Vehicle, N:1 Contract, N:1 User(créateur), N:1 Incident, N Document.

### `SpecialAbsence`
**Responsabilité** : Demande d'absence spéciale par chauffeur (maladie, deuil, etc.). Workflow Manager.  
**Relations** : N:1 Driver, N:1 Contract.

### `MaintenanceRecord`
**Responsabilité** : Vidange, réparation, visite technique, etc. Suivi coût, kilométrage, garage.  
**Relations** : N:1 Vehicle, N Document.

### `MileageRecord`
**Responsabilité** : Relevé kilométrique (photo tableau de bord). Source : DRIVER/MANAGER/CARCUL.  
**Relations** : N:1 Vehicle, N:1 Driver.

---

## GROUPE 6 — Incidents & Accidents

### `Incident`
**Responsabilité** : Entité parente de tout incident (BREAKDOWN, ACCIDENT, OTHER). Sévérité, localisation, statut.  
**Relations** : N:1 Vehicle, N:1 Driver, N Charge, N Immobilization, 1:1 AccidentCase, N Document.

### `AccidentCase` (Dossier accident complet)
**Responsabilité** : Timeline des 14 étapes accident. Numéro dossier assurance, remorquage, expert.  
**14 étapes** : DECLARED → PHOTOS_RECEIVED → MANAGER_ARRIVED → TOWING_REQUESTED → VEHICLE_TOWED → INSURANCE_DECLARED → EXPERT_VISITED → REPAIR_QUOTE_RECEIVED → GARAGE_STARTED → REPAIR_IN_PROGRESS → REPAIR_COMPLETED → EXPERT_VALIDATION → EXIT_PERMIT_RECEIVED → VEHICLE_RETURNED.  
**Relations** : 1:1 Incident, N AccidentStepHistory, N AccidentExpense, N Document.

### `AccidentStepHistory`
**Responsabilité** : Audit de chaque étape franchie : qui, quand, notes, document.  
**Relations** : N:1 AccidentCase.

### `AccidentExpense`
**Responsabilité** : Dépenses liées à l'accident (constat, remorquage, transport, parking, frais dossier, assistance).  
**Relations** : N:1 AccidentCase.

---

## GROUPE 7 — Photos & Inspections

### `PhotoMission`
**Responsabilité** : Mission photo assignée au chauffeur (régulière véhicule 2x/sem, kilométrage 1x/sem, panne, accident). Anti-fraude : in-app only, pas de galerie.  
**Relations** : N:1 Vehicle, N:1 Driver, N Photo.

### `Photo`
**Responsabilité** : Photo avec GPS, horodatage serveur, hash anti-doublon. Source = IN_APP obligatoire.  
**Relations** : N:1 PhotoMission (ou N:1 Inspection).

### `Inspection`
**Responsabilité** : Inspection remise/reprise véhicule (double validation Manager + Chauffeur). Checklist standardisée.  
**Relations** : N:1 Vehicle, N:1 Contract, N InspectionItem, N Photo.

### `InspectionItem`
**Responsabilité** : Élément de la checklist (extérieur, pneus, roue secours, cric, gilet, triangle, extincteur, etc.). Statut : OK/MISSING/DAMAGED.  
**Relations** : N:1 Inspection.

---

## GROUPE 8 — Documents

### `Document` (Gestion documentaire universelle)
**Responsabilité** : Tous les documents (assurance, carte grise, permis, etc.) avec versioning, dates d'expiration, statut. Polymorphique via entityType + entityId.  
**Statuts** : VALID, EXPIRING_SOON, EXPIRED, ALWAYS_VALID, ARCHIVED.  
**Versioning** : parentDocId pour chaîner les versions. isLatest = true sur la version courante.  
**Relations** : polymorphique sur Vehicle, Driver, Contract, Owner, Incident, AccidentCase, Charge, Maintenance, Immobilization, Contravention.

---

## GROUPE 9 — Reprise véhicule

### `VehicleRepossession`
**Responsabilité** : Workflow de reprise en 3 validations (Manager → Super Manager → Admin). Lié à contrat et véhicule.  
**Statuts** : PROPOSED → SM_VALIDATED → ADMIN_APPROVED → MISSION_ONGOING → INSPECTION_DONE → CHARGES_CALCULATED → CONTRACT_CLOSED → VEHICLE_AVAILABLE.  
**Relations** : N:1 Vehicle, 1:1 Contract.

---

## GROUPE 10 — Tâches & Notifications

### `Task`
**Responsabilité** : Tâches internes (TASK), rendez-vous (APPOINTMENT), rappels automatiques (REMINDER). Lien polymorphique sur n'importe quelle entité.  
**Relations** : N:1 User(créateur), N:1 User(assigné).

### `Notification`
**Responsabilité** : Notification push Firebase. Priorité : LOW, NORMAL, HIGH, CRITICAL. Lien entité polymorphique.  
**Relations** : N:1 User.

---

## GROUPE 11 — Scoring & Audit

### `DriverScoreEvent`
**Responsabilité** : Chaque événement impactant le score chauffeur (paiement, photo manquée, accident, contravention, etc.).  
**Relations** : N:1 Driver.

### `VehicleScoreEvent`
**Responsabilité** : Chaque événement impactant le score véhicule (immobilisation, coût, panne, disponibilité).  
**Relations** : N:1 Vehicle.

### `AuditLog`
**Responsabilité** : Audit complet de toutes les actions sensibles. Avant/après JSON, IP, user-agent.  
**Relations** : N:1 User(actor).

---

## Résumé des entités (30 modèles)

| # | Entité | Groupe | Critique |
|---|--------|--------|---------|
| 1 | User | Identité | ✅ |
| 2 | Driver | Identité | ✅ |
| 3 | DriverKYC | Identité | ✅ |
| 4 | DriverFieldValidation | Identité | ✅ |
| 5 | Owner | Identité | ✅ |
| 6 | Vehicle | Véhicule | ✅ |
| 7 | VehicleManagerAssignment | Affectation | ✅ |
| 8 | VehicleDriverAssignment | Affectation | ✅ |
| 9 | Contract | Contrat | ✅ |
| 10 | Payment | Finance | ✅ |
| 11 | DailyEntry | Finance | ✅ |
| 12 | Charge | Finance | ✅ |
| 13 | Deposit | Finance | ✅ |
| 14 | DepositTransaction | Finance | ✅ |
| 15 | Contravention | Finance | ✅ |
| 16 | Immobilization | Opérations | ✅ |
| 17 | SpecialAbsence | Opérations | ✅ |
| 18 | MaintenanceRecord | Opérations | ✅ |
| 19 | MileageRecord | Opérations | ✅ |
| 20 | Incident | Incidents | ✅ |
| 21 | AccidentCase | Incidents | ✅ |
| 22 | AccidentStepHistory | Incidents | ✅ |
| 23 | AccidentExpense | Incidents | ✅ |
| 24 | PhotoMission | Photos | ✅ |
| 25 | Photo | Photos | ✅ |
| 26 | Inspection | Inspections | ✅ |
| 27 | InspectionItem | Inspections | ✅ |
| 28 | Document | Documents | ✅ |
| 29 | VehicleRepossession | Reprise | ✅ |
| 30 | Task | Tâches | ✅ |
| 31 | Notification | Notifications | ✅ |
| 32 | DriverScoreEvent | Scoring | ✅ |
| 33 | VehicleScoreEvent | Scoring | ✅ |
| 34 | AuditLog | Audit | ✅ |
