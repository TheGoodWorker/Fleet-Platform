# Logique de calcul — Relevé mensuel Gestion Flotte Partenaire

## Vue d'ensemble

Le relevé mensuel (`MonthlySettlement`) est le document financier central qui
réconcilie, pour chaque véhicule en `PARTNER_FLEET`, ce que la société de
gestion doit reverser au propriétaire à la fin de chaque mois.

---

## Formule de calcul

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RELEVÉ MENSUEL — FORMULE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  (+) TOTAL RECETTES (totalRevenue)                                      │
│      = somme des Payment.amount validés sur le véhicule ce mois         │
│                                                                         │
│  (-) DÉPENSES IMPACTANT LE BÉNÉFICE (totalExpenses)                    │
│      = ownerExpenses + companyExpenses + maintenanceCosts               │
│                                                                         │
│      ┌──────────────────────────────────────────────────────────┐      │
│      │ ownerExpenses    = Charge.amount où responsible = OWNER   │      │
│      │ companyExpenses  = Charge.amount où responsible = COMPANY │      │
│      │ maintenanceCosts = MaintenanceRecord.cost complétés       │      │
│      │ driverExpenses   = Charge.amount où responsible = DRIVER  │      │
│      │                    (suivi uniquement, NE réduit PAS)      │      │
│      └──────────────────────────────────────────────────────────┘      │
│                                                                         │
│  (=) BÉNÉFICE NET (grossProfit)                                         │
│      = totalRevenue - totalExpenses                                     │
│                                                                         │
│  (-) COMMISSION DE GESTION (managementCommission)                       │
│      Voir formules ci-dessous selon MgmtFeeType                        │
│                                                                         │
│  (=) MONTANT DÛ AU PROPRIÉTAIRE (ownerAmountDue)                       │
│      = grossProfit - managementCommission                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Formules de commission

### Type FIXED
```
commission = mgmtFeeFixed
```
> Exemple : 50 000 FCFA / mois, quel que soit le bénéfice.

### Type PERCENTAGE (base = NET_PROFIT)
```
commission = grossProfit × (mgmtFeePercentage / 100)
```
> Exemple : 15% × 400 000 FCFA bénéfice net = 60 000 FCFA

### Type PERCENTAGE (base = GROSS_REVENUE)
```
commission = totalRevenue × (mgmtFeePercentage / 100)
```
> Exemple : 10% × 600 000 FCFA recettes brutes = 60 000 FCFA

### Type MIXED (base = NET_PROFIT)
```
commission = mgmtFeeFixed + (grossProfit × mgmtFeePercentage / 100)
```
> Exemple : 15 000 FCFA fixe + 8% × 400 000 FCFA = 15 000 + 32 000 = 47 000 FCFA

### Type MIXED (base = GROSS_REVENUE)
```
commission = mgmtFeeFixed + (totalRevenue × mgmtFeePercentage / 100)
```

---

## Exemple complet (mois de mai 2026)

**Contrat** : PARTNER_FLEET, MIXED, 15 000 FCFA fixe + 10% du bénéfice net

| Poste | Montant |
|-------|---------|
| Recettes totales (3 chauffeurs × ~200 000) | 620 000 FCFA |
| Charges OWNER (réparation moteur) | - 80 000 FCFA |
| Charges COMPANY (vidange) | - 15 000 FCFA |
| Charges DRIVER (amende × 2) | 30 000 FCFA *(non déduit)* |
| **Bénéfice net** | **525 000 FCFA** |
| Commission fixe | - 15 000 FCFA |
| Commission % (10% × 525 000) | - 52 500 FCFA |
| **Commission totale** | **67 500 FCFA** |
| **Montant dû au propriétaire** | **457 500 FCFA** |

---

## Périmètre des dépenses

| Source | Responsable | Réduit le bénéfice ? |
|--------|-------------|---------------------|
| Charge (franchise, réparation…) | DRIVER | ❌ Non |
| Charge (réparation, autre…) | OWNER | ✅ Oui |
| Charge (maintenance, autre…) | COMPANY | ✅ Oui |
| MaintenanceRecord (vidange, VT…) | — (société) | ✅ Oui |
| Contravention | DRIVER toujours | ❌ Non |
| DepositTransaction (usage caution) | — | Cas par cas |

---

## Workflow du relevé

```
DRAFT
  │  (Manager ou système génère le relevé en fin de mois)
  ▼
PENDING_APPROVAL
  │  (Super Manager ou Admin valide les chiffres)
  ▼
APPROVED  ← chiffres figés définitivement à ce moment
  │
  ├─→ SENT_TO_OWNER  (email + portail propriétaire)
  │       │
  │       ▼
  │   OWNER_ACKNOWLEDGED
  │       │
  │  [si contestation]
  │       └─→ DISPUTED  (notes + correction possible en DRAFT)
  │
  └─→ PAID (règlement complet, via 1 ou N OwnerSettlementPayment)
      ou PARTIALLY_PAID (en attente solde)
```

---

## Règles importantes

1. **Snapshot** : les paramètres de commission (`mgmtFeeTypeSnapshot`, etc.) sont
   copiés dans le relevé à la génération. Toute modification ultérieure du
   contrat n'affecte PAS les relevés déjà générés.

2. **Immuabilité** : dès que le statut passe à `APPROVED`, les montants sont figés.
   Toute correction passe par un nouveau relevé ou un avoir manuel.

3. **Unicité** : contrainte `@@unique([contractId, year, month])` — un seul relevé
   par contrat par mois. Générer à nouveau remplace le DRAFT existant.

4. **Charges driver** : les charges à la charge du chauffeur sont incluses dans
   `SettlementExpenseLine` avec `impactsProfit = false` pour traçabilité et
   transparence propriétaire, mais ne réduisent pas `ownerAmountDue`.

5. **Accès propriétaire** : le portail propriétaire affiche le relevé en lecture
   seule dès `SENT_TO_OWNER`. Il peut envoyer une contestation (→ `DISPUTED`).

---

## Service NestJS — Points d'implémentation

```typescript
// settlements/settlement-calculator.service.ts

async generateMonthlySettlement(
  contractId: string,
  year: number,
  month: number,
  generatedById: string,
): Promise<MonthlySettlement> {

  const contract = await this.prisma.contract.findUniqueOrThrow({
    where: { id: contractId },
    include: { vehicle: true, owner: true },
  });

  // Vérification type de contrat
  if (contract.type !== ContractType.PARTNER_FLEET) {
    throw new BadRequestException('Relevé mensuel disponible uniquement pour PARTNER_FLEET');
  }

  const periodStart = startOfMonth(new Date(year, month - 1));
  const periodEnd   = endOfMonth(new Date(year, month - 1));

  // 1. Recettes : paiements validés sur la période
  const payments = await this.prisma.payment.findMany({
    where: {
      contractId,
      status: PaymentStatus.VALIDATED,
      paidAt: { gte: periodStart, lte: periodEnd },
    },
  });
  const totalRevenue = payments.reduce((s, p) => s.add(p.amount), new Decimal(0));

  // 2. Dépenses : charges validées sur la période
  const charges = await this.prisma.charge.findMany({
    where: {
      vehicleId: contract.vehicleId,
      status: { in: [ChargeStatus.VALIDATED, ChargeStatus.PAID, ChargeStatus.ADDED_TO_CONTRACT] },
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  });

  // 3. Maintenance complétée sur la période
  const maintenances = await this.prisma.maintenanceRecord.findMany({
    where: {
      vehicleId: contract.vehicleId,
      status: MaintenanceStatus.COMPLETED,
      completedAt: { gte: periodStart, lte: periodEnd },
    },
  });

  // 4. Calcul par responsable
  const ownerExpenses   = sumWhere(charges, c => c.validatedResponsible === 'OWNER');
  const companyExpenses = sumWhere(charges, c => c.validatedResponsible === 'COMPANY');
  const driverExpenses  = sumWhere(charges, c => c.validatedResponsible === 'DRIVER');
  const maintenanceCosts = sumDecimal(maintenances.map(m => m.cost ?? 0));

  const totalExpenses = ownerExpenses.add(companyExpenses).add(maintenanceCosts);
  const grossProfit   = totalRevenue.sub(totalExpenses);

  // 5. Commission
  const commission = this.calculateCommission(
    contract.mgmtFeeType,
    contract.mgmtFeeBase,
    contract.mgmtFeeFixed,
    contract.mgmtFeePercentage,
    grossProfit,
    totalRevenue,
  );

  const ownerAmountDue = grossProfit.sub(commission);

  // 6. Persistence (upsert DRAFT)
  return this.prisma.monthlySettlement.upsert({
    where: { contractId_year_month: { contractId, year, month } },
    create: { /* tous les champs */ },
    update: { /* mise à jour si DRAFT */ },
  });
}

private calculateCommission(
  type: MgmtFeeType,
  base: MgmtFeeBase,
  fixed: Decimal | null,
  percentage: Decimal | null,
  netProfit: Decimal,
  grossRevenue: Decimal,
): Decimal {
  const calcBase = base === MgmtFeeBase.NET_PROFIT ? netProfit : grossRevenue;

  switch (type) {
    case MgmtFeeType.FIXED:
      return fixed ?? new Decimal(0);

    case MgmtFeeType.PERCENTAGE:
      return calcBase.mul(percentage ?? 0).div(100);

    case MgmtFeeType.MIXED:
      return (fixed ?? new Decimal(0)).add(
        calcBase.mul(percentage ?? 0).div(100)
      );
  }
}
```

---

## APIs REST à prévoir

```
# Génération / consultation
POST   /api/v1/settlements/generate              → génère le relevé du mois
GET    /api/v1/settlements/:id                   → détail complet
GET    /api/v1/owners/:ownerId/settlements        → tous les relevés d'un propriétaire
GET    /api/v1/vehicles/:vehicleId/settlements    → historique par véhicule

# Workflow validation
POST   /api/v1/settlements/:id/approve           → Super Manager/Admin approuve
POST   /api/v1/settlements/:id/send-to-owner     → envoie au propriétaire
POST   /api/v1/settlements/:id/dispute           → propriétaire conteste

# Règlement
POST   /api/v1/settlements/:id/record-payment    → enregistre un versement au propriétaire
GET    /api/v1/settlements/:id/payments          → liste des versements

# Portail propriétaire
GET    /api/v1/owner-portal/settlements          → vue propriétaire (READ ONLY)
PATCH  /api/v1/owner-portal/settlements/:id/acknowledge → propriétaire confirme réception
```
