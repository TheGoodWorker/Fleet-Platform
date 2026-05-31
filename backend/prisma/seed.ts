import { PrismaClient, UserRole, PermissionModule } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  // VEHICLES
  { code: 'can_create_vehicle', name: 'Créer un véhicule', module: PermissionModule.VEHICLES },
  { code: 'can_edit_vehicle', name: 'Modifier un véhicule', module: PermissionModule.VEHICLES },
  { code: 'can_delete_vehicle', name: 'Supprimer un véhicule', module: PermissionModule.VEHICLES },
  { code: 'can_assign_vehicle', name: 'Affecter un véhicule', module: PermissionModule.VEHICLES },

  // DRIVERS
  { code: 'can_create_driver', name: 'Créer un chauffeur', module: PermissionModule.DRIVERS },
  { code: 'can_validate_kyc', name: 'Valider le KYC chauffeur', module: PermissionModule.DRIVERS },
  { code: 'can_validate_field', name: 'Valider la validation terrain', module: PermissionModule.DRIVERS },
  { code: 'can_blacklist_driver', name: 'Blacklister un chauffeur', module: PermissionModule.DRIVERS },

  // CONTRACTS
  { code: 'can_create_contract', name: 'Créer un contrat', module: PermissionModule.CONTRACTS },
  { code: 'can_activate_contract', name: 'Activer un contrat', module: PermissionModule.CONTRACTS },
  { code: 'can_suspend_contract', name: 'Suspendre un contrat', module: PermissionModule.CONTRACTS },
  { code: 'can_close_contract', name: 'Clôturer un contrat', module: PermissionModule.CONTRACTS },

  // PAYMENTS
  { code: 'can_record_payment', name: 'Enregistrer un paiement', module: PermissionModule.PAYMENTS },
  { code: 'can_view_payments', name: 'Voir les paiements', module: PermissionModule.PAYMENTS },

  // CHARGES
  { code: 'can_create_charge', name: 'Créer une charge', module: PermissionModule.CHARGES },
  { code: 'can_validate_charge', name: 'Valider une charge', module: PermissionModule.CHARGES },
  { code: 'can_reject_charge', name: 'Rejeter une charge', module: PermissionModule.CHARGES },
  { code: 'can_add_charge_to_contract', name: 'Ajouter charge au contrat', module: PermissionModule.CHARGES },

  // DEPOSITS
  { code: 'can_propose_deposit', name: 'Proposer une caution', module: PermissionModule.DEPOSITS },
  { code: 'can_validate_deposit', name: 'Valider une caution', module: PermissionModule.DEPOSITS },
  { code: 'can_use_deposit', name: 'Utiliser la caution', module: PermissionModule.DEPOSITS },

  // DOCUMENTS
  { code: 'can_manage_documents', name: 'Gérer les documents', module: PermissionModule.DOCUMENTS },
  { code: 'can_upload_document', name: 'Uploader un document', module: PermissionModule.DOCUMENTS },

  // INCIDENTS
  { code: 'can_create_incident', name: 'Déclarer un incident', module: PermissionModule.INCIDENTS },
  { code: 'can_manage_incident', name: 'Gérer un incident', module: PermissionModule.INCIDENTS },

  // ACCIDENTS
  { code: 'can_create_accident', name: 'Créer un dossier accident', module: PermissionModule.ACCIDENTS },
  { code: 'can_advance_accident_step', name: 'Avancer étape accident', module: PermissionModule.ACCIDENTS },
  { code: 'can_validate_accident_expense', name: 'Valider dépense accident', module: PermissionModule.ACCIDENTS },

  // MAINTENANCE
  { code: 'can_manage_maintenance', name: 'Gérer la maintenance', module: PermissionModule.MAINTENANCE },

  // INSPECTIONS
  { code: 'can_create_inspection', name: 'Créer une inspection', module: PermissionModule.INSPECTIONS },
  { code: 'can_sign_inspection', name: 'Signer une inspection', module: PermissionModule.INSPECTIONS },

  // REPOSSESSIONS
  { code: 'can_propose_repossession', name: 'Proposer une reprise', module: PermissionModule.REPOSSESSIONS },
  { code: 'can_validate_repossession', name: 'Valider une reprise (SM)', module: PermissionModule.REPOSSESSIONS },
  { code: 'can_approve_repossession', name: 'Approuver une reprise (Admin)', module: PermissionModule.REPOSSESSIONS },

  // SETTLEMENTS
  { code: 'can_generate_settlement', name: 'Générer un relevé mensuel', module: PermissionModule.SETTLEMENTS },
  { code: 'can_approve_settlement', name: 'Approuver un relevé mensuel', module: PermissionModule.SETTLEMENTS },
  { code: 'can_view_owner_finances', name: 'Voir les finances propriétaire', module: PermissionModule.SETTLEMENTS },

  // USERS
  { code: 'can_manage_users', name: 'Gérer les utilisateurs', module: PermissionModule.USERS },
  { code: 'can_manage_managers', name: 'Gérer les managers', module: PermissionModule.MANAGERS },

  // PERMISSIONS
  { code: 'can_manage_permissions', name: 'Gérer les permissions', module: PermissionModule.USERS },
  { code: 'can_grant_permission', name: 'Accorder une permission', module: PermissionModule.USERS },
  { code: 'can_revoke_permission', name: 'Révoquer une permission', module: PermissionModule.USERS },

  // AUDIT
  { code: 'can_view_audit_logs', name: 'Voir les logs d\'audit', module: PermissionModule.AUDIT },
  { code: 'can_view_analytics', name: 'Voir les analytics', module: PermissionModule.ANALYTICS },
] as const;

// Permissions accordées par rôle
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: PERMISSIONS.map((p) => p.code), // Admin a tout

  SUPER_MANAGER: [
    'can_create_vehicle', 'can_edit_vehicle', 'can_assign_vehicle',
    'can_create_driver', 'can_validate_kyc', 'can_validate_field', 'can_blacklist_driver',
    'can_create_contract', 'can_activate_contract', 'can_suspend_contract', 'can_close_contract',
    'can_record_payment', 'can_view_payments',
    'can_create_charge', 'can_validate_charge', 'can_reject_charge', 'can_add_charge_to_contract',
    'can_propose_deposit', 'can_validate_deposit', 'can_use_deposit',
    'can_manage_documents', 'can_upload_document',
    'can_create_incident', 'can_manage_incident',
    'can_create_accident', 'can_advance_accident_step', 'can_validate_accident_expense',
    'can_manage_maintenance',
    'can_create_inspection', 'can_sign_inspection',
    'can_propose_repossession', 'can_validate_repossession',
    'can_generate_settlement', 'can_approve_settlement', 'can_view_owner_finances',
    'can_manage_managers',
    'can_view_audit_logs',
    'can_view_analytics',
  ],

  MANAGER: [
    'can_assign_vehicle',
    'can_validate_field', // La visite terrain est effectuée par le Manager de terrain
    'can_record_payment', 'can_view_payments',
    'can_create_charge',
    'can_upload_document',
    'can_create_incident', 'can_manage_incident',
    'can_create_accident', 'can_advance_accident_step',
    'can_manage_maintenance',
    'can_create_inspection', 'can_sign_inspection',
    'can_propose_repossession',
  ],

  DRIVER: [
    'can_create_incident',
    'can_create_accident',
    'can_sign_inspection',
    'can_upload_document',
  ],

  OWNER: [
    'can_view_owner_finances',
  ],
};

async function main() {
  console.log('🌱 Début du seed Fleet Platform...');

  // 1. Upsert toutes les permissions
  console.log('📋 Création des permissions...');
  const permissionMap = new Map<string, string>();

  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, module: perm.module },
      create: { code: perm.code, name: perm.name, module: perm.module },
    });
    permissionMap.set(perm.code, created.id);
  }
  console.log(`  ✅ ${PERMISSIONS.length} permissions upsertées`);

  // 2. Configurer les RolePermission
  console.log('🔐 Configuration des permissions par rôle...');
  let rolePermCount = 0;

  for (const [role, codes] of Object.entries(ROLE_PERMISSIONS) as [UserRole, string[]][]) {
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId } },
        update: { isGranted: true },
        create: { role, permissionId, isGranted: true },
      });
      rolePermCount++;
    }
  }
  console.log(`  ✅ ${rolePermCount} role-permissions configurées`);

  // 3. Créer l'utilisateur Admin par défaut
  console.log('👤 Création du compte Admin par défaut...');
  const passwordHash = await bcrypt.hash('Admin@Fleet2026!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleet.local' },
    update: {},
    create: {
      email: 'admin@fleet.local',
      firstName: 'Admin',
      lastName: 'Fleet',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });
  console.log(`  ✅ Admin créé: ${admin.email} (ID: ${admin.id})`);
  console.log(`  ⚠️  Changer le mot de passe Admin en production!`);

  console.log('\n✅ Seed terminé avec succès!');
  console.log('\n📝 Comptes par défaut:');
  console.log('   Admin: admin@fleet.local / Admin@Fleet2026!');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
