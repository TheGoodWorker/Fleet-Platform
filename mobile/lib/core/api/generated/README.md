# Client OpenAPI généré — Fleet Platform

Ce dossier contiendra le client Dart généré depuis `docs/swagger.json`.

## Génération

### Prérequis

```bash
npm install -g @openapitools/openapi-generator-cli
```

### Commande (depuis la racine du monorepo)

```bash
openapi-generator-cli generate \
  -i docs/swagger.json \
  -g dart-dio \
  -o mobile/lib/core/api/generated/ \
  --additional-properties=pubName=fleet_api,pubVersion=2.0.0,nullableFields=true \
  --global-property=models,apis \
  --skip-validate-spec
```

### Ou depuis le serveur backend en live (port 3000)

```bash
openapi-generator-cli generate \
  -i http://localhost:3000/api-json \
  -g dart-dio \
  -o mobile/lib/core/api/generated/
```

## Contenu généré

Après génération, ce dossier contiendra :
- `lib/` — modèles Dart + clients API par tag (auth, vehicles, drivers, etc.)
- `doc/` — documentation des endpoints
- `test/` — tests générés

## Modèles clés attendus

| Modèle | Correspond à |
|--------|-------------|
| `LoginDto` | POST /auth/login |
| `AuthResponseDto` | Réponse login/refresh |
| `AuthUserDto` | Profil utilisateur dans la réponse auth |
| `RefreshTokenDto` | POST /auth/refresh |
| `LogoutDto` | POST /auth/logout |
| `CreateVehicleDto` | POST /vehicles |
| `UpdateVehicleStatusDto` | PATCH /vehicles/:id/status |
| `CreateDriverDto` | POST /drivers |
| `UpdateDriverStatusDto` | PATCH /drivers/:id/status |

## Note

En attendant la génération, les modèles métier sont définis manuellement
dans `features/*/data/models/`.
