# Fleet Platform — Flutter Bootstrap

> Phase 7 — Squelette Flutter connecté au backend Fleet Platform V2  
> Date : 2026-06-01

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Installation](#2-installation)
3. [Configuration .env](#3-configuration-env)
4. [Génération client OpenAPI](#4-génération-client-openapi)
5. [Lancer l'application](#5-lancer-lapplication)
6. [Architecture](#6-architecture)
7. [Tests](#7-tests)
8. [Prochaines étapes](#8-prochaines-étapes)

---

## 1. Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Flutter SDK | 3.3.0+ |
| Dart SDK | 3.3.0+ (inclus dans Flutter) |
| Xcode | 15+ (iOS) |
| Android Studio | Hedgehog+ (Android) |
| CocoaPods | 1.13+ (iOS) |

### Installer Flutter

```bash
# macOS — via homebrew
brew install flutter

# Ou via fvm (recommandé pour gérer plusieurs versions)
dart pub global activate fvm
fvm install 3.22.0
fvm use 3.22.0

# Vérification
flutter doctor
```

---

## 2. Installation

```bash
# Depuis la racine du monorepo
cd mobile/

# Installer les dépendances
flutter pub get

# Vérification analyse statique
flutter analyze

# Lancer les tests
flutter test
```

---

## 3. Configuration .env

Le fichier `.env` est inclus dans les assets Flutter (`pubspec.yaml → assets`).

```bash
# Copier l'exemple
cp mobile/.env.example mobile/.env

# Éditer avec vos valeurs
nano mobile/.env
```

Contenu minimal :

```dotenv
# URL du backend Fleet Platform (sans slash final)
API_BASE_URL=http://localhost:3000/api/v1

# Timeout requêtes HTTP (secondes)
API_TIMEOUT_SECONDS=30

# Environnement : development | staging | production
ENV=development
```

### Environnements

| ENV | API_BASE_URL recommandée |
|-----|--------------------------|
| `development` | `http://localhost:3000/api/v1` |
| `staging` | `https://staging.fleet-platform.com/api/v1` |
| `production` | `https://api.fleet-platform.com/api/v1` |

> **Note Android Emulator :** Remplacer `localhost` par `10.0.2.2` pour atteindre le host machine.

---

## 4. Génération client OpenAPI

Le dossier `lib/core/api/generated/` est préparé pour recevoir le client généré depuis `docs/swagger.json`.

### Prérequis

```bash
# Installer OpenAPI Generator (nécessite Java 11+)
npm install -g @openapitools/openapi-generator-cli

# Ou via Homebrew
brew install openapi-generator
```

### Commande de génération

```bash
# Depuis la racine du monorepo
openapi-generator-cli generate \
  -i docs/swagger.json \
  -g dart-dio \
  -o mobile/lib/core/api/generated/ \
  --additional-properties=pubName=fleet_api,pubVersion=2.0.0,nullableFields=true \
  --global-property=models,apis \
  --skip-validate-spec
```

### Depuis le backend en live

```bash
# Démarrer le backend d'abord
cd backend && npm run start:dev

# Générer depuis le serveur
openapi-generator-cli generate \
  -i http://localhost:3000/api-json \
  -g dart-dio \
  -o mobile/lib/core/api/generated/
```

### Après génération

Ajouter la dépendance dans `pubspec.yaml` :

```yaml
dependencies:
  fleet_api:
    path: lib/core/api/generated/
```

Les modèles manuels dans `features/*/data/models/` pourront être remplacés progressivement par les modèles générés.

---

## 5. Lancer l'application

### iOS Simulator

```bash
# Ouvrir le simulateur iOS
open -a Simulator

# Lancer l'app
cd mobile && flutter run

# Ou en mode release
flutter run --release
```

### Android Emulator

```bash
# Lancer un émulateur AVD
emulator -avd Pixel_7_API_34

# Lancer l'app
cd mobile && flutter run
```

### Device physique

```bash
# Lister les devices disponibles
flutter devices

# Lancer sur un device spécifique
flutter run -d <device-id>
```

### Hot reload / Hot restart

| Commande | Action |
|----------|--------|
| `r` | Hot reload (garde l'état) |
| `R` | Hot restart (recharge tout) |
| `q` | Quitter |

---

## 6. Architecture

```
mobile/lib/
├── main.dart                    # Entry point — chargement .env + DI
├── app.dart                     # FleetApp + router init
├── core/
│   ├── api/
│   │   ├── api_client.dart      # Dio configuré avec interceptors
│   │   ├── auth_interceptor.dart # Gestion auto tokens + refresh
│   │   ├── api_exception.dart   # Exceptions typées (401, 403, 429...)
│   │   └── generated/           # Client OpenAPI généré (voir §4)
│   ├── config/
│   │   └── app_config.dart      # Variables .env → AppConfig
│   ├── constants/
│   │   └── api_constants.dart   # Tous les endpoints API
│   ├── di/
│   │   └── injection.dart       # GetIt service locator
│   ├── models/
│   │   ├── api_response.dart    # Wrapper { statusCode, message, data }
│   │   └── paginated_response.dart  # { data, meta }
│   └── storage/
│       └── token_storage.dart   # SecureStorage tokens JWT
├── features/
│   ├── auth/
│   │   ├── data/                # AuthRemoteDataSource, AuthRepositoryImpl
│   │   ├── domain/              # User entity, AuthRepository, usecases
│   │   └── presentation/        # AuthBloc, LoginPage
│   ├── dashboard/
│   │   └── presentation/pages/  # DashboardPage
│   ├── vehicles/                # Placeholder Phase 8
│   └── drivers/                 # Placeholder Phase 8
├── navigation/
│   └── app_router.dart          # GoRouter + routes + redirect auth
└── shared/
    ├── permissions/
    │   ├── user_role.dart       # UserRole enum + hiérarchie
    │   └── permission_helper.dart  # canAccessModule(), visibleForRoles()
    ├── theme/
    │   └── app_theme.dart       # AppTheme.light + AppColors
    └── widgets/
        ├── app_button.dart      # Bouton réutilisable (4 variantes)
        ├── app_text_field.dart  # Champ texte avec toggle password
        ├── loading_view.dart    # Indicateur de chargement centré
        ├── error_view.dart      # Vue d'erreur avec retry
        └── empty_state.dart     # État vide avec icône + action
```

### Flux Auth

```
App start
  └── AuthCheckRequested
        ├── token absent → AuthUnauthenticated → /login
        └── token présent → GET /auth/me
              ├── 200 → AuthAuthenticated(user) → /dashboard
              └── 401 → AuthUnauthenticated → /login

Login
  └── AuthLoginRequested(email/phone, password)
        ├── POST /auth/login
        │     ├── 200 → save tokens → AuthAuthenticated → /dashboard
        │     ├── 401 → AuthError("Identifiants incorrects")
        │     └── 429 → AuthError("Trop de tentatives")
        └── Network error → AuthError("Connexion indisponible")

Intercepteur (auto-refresh)
  └── Toute requête → inject Bearer header
        └── 401 response → POST /auth/refresh
              ├── 200 → save new tokens → retry request
              └── 401 → clearTokens → onLogout → /login
```

### Rôles et modules

| Rôle | Dashboard | Véhicules | Chauffeurs | Contrats | Owner Portal |
|------|-----------|-----------|------------|---------|--------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ❌ |
| SUPER_MANAGER | ✅ | ✅ | ✅ | ✅ | ❌ |
| MANAGER | ✅ | ✅ | ✅ | ✅ | ❌ |
| DRIVER | ✅ | ✅ | ❌ | ❌ | ❌ |
| OWNER | ✅ | ✅ | ❌ | ❌ | ✅ |

---

## 7. Tests

```bash
cd mobile

# Tous les tests
flutter test

# Avec couverture
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html

# Un test spécifique
flutter test test/core/token_storage_test.dart
flutter test test/features/auth/data/auth_repository_test.dart
```

### Tests inclus

| Fichier | Coverage |
|---------|----------|
| `test/core/token_storage_test.dart` | SecureTokenStorage (7 tests) |
| `test/core/auth_interceptor_test.dart` | AuthInterceptor request/error (3 tests) |
| `test/features/auth/data/auth_repository_test.dart` | AuthRepositoryImpl (6 tests) |
| `test/features/auth/domain/login_usecase_test.dart` | LoginUseCase (2 tests) |
| `test/shared/permission_helper_test.dart` | PermissionHelper + UserRole (15 tests) |

---

## 8. Prochaines étapes

### Phase 8 — Modules métier

Implémenter les modules dans cet ordre (basé sur `docs/API_CONTRACT_FLUTTER.md`) :

1. **Véhicules** — Liste + détail + changement statut
   - `GET /api/v1/vehicles` (filtres, pagination)
   - `GET /api/v1/vehicles/:id`
   - `PATCH /api/v1/vehicles/:id/status` (body `UpdateVehicleStatusDto`)

2. **Chauffeurs** — Liste + KYC
   - `GET /api/v1/drivers`
   - `POST /api/v1/drivers/:id/validate-kyc`

3. **Contrats** — Liste + création + signature

4. **Paiements** — Tableau de bord financier

5. **Notifications** — Liste + mark as read

6. **Documents** — Alerte expirations

### Phase 9 — Finitions

- Tests d'intégration (Supertest ou Playwright)
- Push notifications (Firebase Phase 3+)
- Upload photos (MediaService)
- Mode offline (Hive cache)
- Localisation (fr / en)

### Commandes utiles

```bash
# Build APK release
flutter build apk --release

# Build iOS release
flutter build ios --release

# Analyser la taille du bundle
flutter build apk --analyze-size

# Mettre à jour les dépendances
flutter pub upgrade
```

---

*Fleet Platform V2 — Phase 7 Flutter Bootstrap*
