# Fleet Platform — Backend NestJS

API REST de la plateforme de gestion de flotte VTC.  
Stack : NestJS 10 · PostgreSQL 16 · Prisma 7 · TypeScript 5

---

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | 20.x LTS |
| npm | 10.x |
| Docker + Docker Compose | 24.x |
| Prisma CLI | 7.x (installé via npm) |

---

## 1. Variables d'environnement

```bash
cp .env.example .env
```

Édite `.env` et renseigne au minimum :

```dotenv
DATABASE_URL="postgresql://fleet_user:fleet_password@localhost:5432/fleet_platform"

JWT_ACCESS_SECRET=change_me_access_secret_at_least_32_chars
JWT_REFRESH_SECRET=change_me_refresh_secret_at_least_32_chars
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

BCRYPT_ROUNDS=12
NODE_ENV=development
PORT=3000
```

---

## 2. Lancer PostgreSQL (Docker)

```bash
# Démarrer PostgreSQL uniquement
docker compose up -d postgres

# Optionnel — pgAdmin sur http://localhost:5050
docker compose --profile tools up -d pgadmin
```

Attendre que PostgreSQL soit healthy (environ 10 secondes) :

```bash
docker compose ps
# postgres doit afficher "(healthy)"
```

---

## 3. Installer les dépendances

```bash
npm install
```

---

## 4. Générer le client Prisma et créer la base

Toutes les commandes Prisma doivent être exécutées **depuis le dossier `backend/`** car `prisma.config.ts` y est situé.

```bash
# Générer le client TypeScript
npm run db:generate

# Créer et appliquer les migrations (crée les tables)
npm run db:migrate
# → Nom suggéré quand Prisma demande : "init_fleet_platform_v2"

# Peupler : 45 permissions + rôles + compte Admin
npm run db:seed
```

Compte Admin créé par le seed :

```
Email    : admin@fleet.local
Password : Admin@Fleet2026!
```

---

## 5. Démarrer le serveur

```bash
# Développement (hot-reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

L'API est disponible sur `http://localhost:3000/api/v1`

---

## 6. Documentation Swagger

Disponible uniquement en `NODE_ENV=development` :

```
http://localhost:3000/docs
```

Utilise le bouton **Authorize** avec un Bearer token obtenu via `POST /api/v1/auth/login`.

---

## 7. Endpoints principaux

### Auth (public)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/v1/auth/login` | Connexion email/téléphone + password |
| POST | `/api/v1/auth/refresh` | Renouveler les tokens |
| GET | `/api/v1/auth/me` | Profil de l'utilisateur connecté |

### Exemple de connexion

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fleet.local","password":"Admin@Fleet2026!"}'
```

Réponse :

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": "1d",
    "user": { "id": "...", "role": "ADMIN", ... }
  }
}
```

---

## 8. Lancer les tests

```bash
# Tous les tests unitaires
npm test

# Avec couverture
npm run test:cov

# Tests e2e
npm run test:e2e
```

Tests unitaires présents :

- `src/modules/auth/auth.service.spec.ts` — login, refresh, cas d'erreur
- `src/modules/permissions/permissions.service.spec.ts` — algorithme checkPermission (override / expiration / rôle)
- `src/prisma/prisma.service.spec.ts` — middleware soft-delete

---

## 9. Structure des modules

```
src/
├── common/
│   ├── constants/        # Perm (codes de permission)
│   ├── decorators/       # @CurrentUser, @Roles, @RequirePermission, @Public
│   ├── filters/          # HttpExceptionFilter (Prisma + HTTP)
│   ├── guards/           # JwtAuthGuard, RolesGuard, PermissionsGuard
│   └── interceptors/     # TransformInterceptor ({ success, data, meta })
├── prisma/               # PrismaService (soft-delete middleware)
└── modules/
    ├── auth/             # JWT login/refresh, stratégie Passport
    ├── permissions/      # checkPermission, overrides, RolePermission
    ├── users/            # CRUD utilisateurs + suspend/activate
    ├── owners/           # CRUD propriétaires
    ├── vehicles/         # CRUD véhicules + assignManager
    ├── drivers/          # CRUD chauffeurs + KYC auto
    ├── contracts/        # CRUD contrats (DRAFT only editable)
    ├── audit/            # AuditService.log() (fire-and-forget)
    ├── ledger/           # LedgerService.createEntry() (fire-and-forget)
    ├── notifications/    # send + markAsRead + countUnread
    │
    # ── Modules Phase 3+ (skeletons prêts) ──
    ├── payments/
    ├── charges/
    ├── deposits/
    ├── documents/
    ├── media/
    ├── inspections/
    ├── incidents/
    ├── accidents/
    ├── maintenance/
    ├── tasks/
    ├── scoring/
    └── settlements/
```

---

## 10. RBAC — Hiérarchie des rôles

| Rôle | Niveau | Description |
|------|--------|-------------|
| ADMIN | 5 | Accès total |
| SUPER_MANAGER | 4 | Gestion opérationnelle complète |
| MANAGER | 3 | Gestion de son parc uniquement |
| DRIVER | 2 | Lecture de ses propres données |
| OWNER | 1 | Lecture de ses véhicules |

Les routes utilisent `@Roles(UserRole.DRIVER)` pour définir le **niveau minimum** requis.  
Les permissions fines utilisent `@RequirePermission(Perm.CREATE_CONTRACT)`.

---

## 11. Format de réponse uniforme

```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 150 }
}
```

Erreur :

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Contrainte d'unicité violée",
    "details": { "field": "plateNumber" }
  }
}
```

---

## 12. Commandes utiles

```bash
# Réinitialiser la base (DANGER — efface tout)
docker compose down -v && docker compose up -d postgres
npm run db:migrate && npm run db:seed

# Ouvrir Prisma Studio
npx prisma studio

# Vérifier le schéma
npx prisma validate

# Inspecter les logs PostgreSQL
docker compose logs -f postgres
```

---

## Modules à développer en Phase 3

| Priorité | Modules |
|----------|---------|
| P0 | payments, charges, deposits |
| P1 | documents, media, inspections |
| P2 | incidents, accidents, maintenance |
| P3 | tasks, scoring, settlements |
