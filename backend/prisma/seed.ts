import 'dotenv/config'; // charge backend/.env avant tout accès à process.env
import {
  PrismaClient, UserRole, PermissionModule,
  VehicleStatus, DriverStatus, ContractType, ContractStatus,
  PaymentSource, PaymentStatus,
  DocumentType, DocumentStatus, DocumentEntityType,
  OwnerType, OwnerStatus, MgmtFeeType, MgmtFeeBase, OwnerPaymentFrequency,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

// Prisma 7 engine type "client" requiert un driver adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

  // FUEL — Suivi carburant & kilométrage
  { code: 'can_record_fuel', name: 'Enregistrer transaction carburant', module: PermissionModule.FUEL },
  { code: 'can_validate_mileage', name: 'Valider le kilométrage déclaré', module: PermissionModule.FUEL },

  // AVAILABILITY — Immobilisations & absences spéciales
  { code: 'can_manage_immobilization', name: 'Gérer les immobilisations véhicule', module: PermissionModule.AVAILABILITY },
  { code: 'can_manage_special_absence', name: 'Gérer les absences spéciales chauffeur', module: PermissionModule.AVAILABILITY },
  { code: 'can_approve_special_absence', name: 'Approuver une absence spéciale (SM)', module: PermissionModule.AVAILABILITY },

  // OWNER_PORTAL — Portail propriétaire & versements SIMPLE_RENTAL
  { code: 'can_configure_owner_visibility', name: 'Configurer visibilité portail propriétaire', module: PermissionModule.OWNER_PORTAL },
  { code: 'can_view_owner_portal', name: 'Accéder au portail propriétaire', module: PermissionModule.OWNER_PORTAL },
  { code: 'can_record_owner_payment', name: 'Enregistrer un versement propriétaire SIMPLE_RENTAL', module: PermissionModule.OWNER_PORTAL },

  // INSPECTIONS (extensions)
  { code: 'can_create_photo_mission', name: 'Créer une mission photo', module: PermissionModule.INSPECTIONS },
  { code: 'can_validate_photo_mission', name: 'Valider une mission photo', module: PermissionModule.INSPECTIONS },
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
    // FUEL
    'can_record_fuel', 'can_validate_mileage',
    // AVAILABILITY
    'can_manage_immobilization', 'can_manage_special_absence', 'can_approve_special_absence',
    // OWNER_PORTAL
    'can_configure_owner_visibility', 'can_view_owner_portal', 'can_record_owner_payment',
    // INSPECTIONS extensions
    'can_create_photo_mission', 'can_validate_photo_mission',
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
    // FUEL
    'can_record_fuel',
    // AVAILABILITY
    'can_manage_immobilization', 'can_manage_special_absence',
    // OWNER_PORTAL (lecture seule — voir les véhicules de sa flotte)
    'can_view_owner_portal',
    // INSPECTIONS extensions
    'can_create_photo_mission',
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

// =============================================================================
// DONNÉES SEED — Phase 8-F
// =============================================================================

// Checklist complète pour contrats ACTIVE
const ACTIVE_CHECKLIST = {
  kycValidated: true,
  fieldValidated: true,
  depositPaid: true,
  contractSigned: true,
  managerApproved: true,
  adminApproved: true,
};

async function main() {
  console.log('🌱 Début du seed Fleet Platform...');

  // ─── 1. Permissions ──────────────────────────────────────────────────────────
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

  // ─── 2. Role permissions ──────────────────────────────────────────────────────
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

  // ─── 3. Admin par défaut ──────────────────────────────────────────────────────
  console.log('👤 Création du compte Admin par défaut...');
  const adminHash = await bcrypt.hash('Admin@Fleet2026!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleet.local' },
    update: {},
    create: {
      email: 'admin@fleet.local',
      firstName: 'Admin',
      lastName: 'Fleet',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
    },
  });
  console.log(`  ✅ Admin: ${admin.email} (ID: ${admin.id})`);

  // ─── 4. Staff (SuperManagers + Managers) ─────────────────────────────────────
  console.log('👥 Création du staff (SuperManagers + Managers)...');
  const staffHash = await bcrypt.hash('Staff@Fleet2026!', 10);

  const staffData = [
    { email: 'cheikh.traore@fleet.local',  firstName: 'Cheikh',    lastName: 'Traoré',  role: UserRole.SUPER_MANAGER },
    { email: 'mareme.faye@fleet.local',    firstName: 'Marème',    lastName: 'Faye',    role: UserRole.SUPER_MANAGER },
    { email: 'omar.bamba@fleet.local',     firstName: 'Omar',      lastName: 'Bamba',   role: UserRole.MANAGER },
    { email: 'fatou.diallo@fleet.local',   firstName: 'Fatou',     lastName: 'Diallo',  role: UserRole.MANAGER },
    { email: 'ibra.ndiaye@fleet.local',    firstName: 'Ibrahima',  lastName: 'Ndiaye',  role: UserRole.MANAGER },
  ];

  const staffUsers: { id: string; email: string }[] = [];
  for (const u of staffData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, firstName: u.firstName, lastName: u.lastName, passwordHash: staffHash, role: u.role },
    });
    staffUsers.push({ id: user.id, email: user.email! });
  }
  console.log(`  ✅ ${staffUsers.length} comptes staff créés`);

  // staffUsers[0] = cheikh.traore (SuperManager, utilisé comme managerId des contrats)
  // staffUsers[2-4] = managers (utilisés comme createdById des paiements)
  const managerId = staffUsers[0].id;

  // ─── 5. Propriétaires (Owner users + Owner records) ──────────────────────────
  console.log('🏢 Création des propriétaires...');
  const ownerHash = await bcrypt.hash('Owner@Fleet2026!', 10);

  const ownerData = [
    { email: 'papa.diop@fleet.local',     firstName: 'Papa',     lastName: 'Diop',    name: 'Papa Diop',           type: OwnerType.INDIVIDUAL },
    { email: 'moussa.fall@fleet.local',   firstName: 'Moussa',   lastName: 'Fall',    name: 'Moussa Fall',         type: OwnerType.INDIVIDUAL },
    { email: 'aminata.dieng@fleet.local', firstName: 'Aminata',  lastName: 'Dieng',   name: 'Aminata Dieng',       type: OwnerType.INDIVIDUAL },
    { email: 'alioune.sow@fleet.local',   firstName: 'Alioune',  lastName: 'Sow',     name: 'Transport Sow & Fils', type: OwnerType.COMPANY    },
    { email: 'mamadou.ba@fleet.local',    firstName: 'Mamadou',  lastName: 'Ba',      name: 'Mamadou Ba',          type: OwnerType.INDIVIDUAL },
  ];

  const owners: { id: string; name: string }[] = [];
  for (const o of ownerData) {
    const user = await prisma.user.upsert({
      where: { email: o.email },
      update: {},
      create: { email: o.email, firstName: o.firstName, lastName: o.lastName, passwordHash: ownerHash, role: UserRole.OWNER },
    });
    const owner = await prisma.owner.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, type: o.type, name: o.name, email: o.email, status: OwnerStatus.ACTIVE },
    });
    owners.push({ id: owner.id, name: owner.name });
  }
  console.log(`  ✅ ${owners.length} propriétaires créés`);

  // ─── 6. Chauffeurs (Driver users + Driver records) ───────────────────────────
  console.log('🚗 Création des chauffeurs...');
  const driverHash = await bcrypt.hash('Driver@Fleet2026!', 10);

  // 30 chauffeurs sénégalais avec statuts variés
  // [0-7]  ACTIVE         — utilisés dans les contrats actifs
  // [8-9]  APPROVED       — contrats DRAFT en attente
  // [10-11] SUSPENDED     — contrats SUSPENDED/COMPLETED
  // [12]   SUSPENDED
  // [13-14] AT_RISK
  // [15-19] PENDING_FIELD_VALIDATION
  // [20-29] PENDING_KYC
  const driverData = [
    { email: 'abdou.seck@fleet.local',       firstName: 'Abdou',      lastName: 'Seck',    phone: '+221771234501', status: DriverStatus.ACTIVE },
    { email: 'modou.diop@fleet.local',       firstName: 'Modou',      lastName: 'Diop',    phone: '+221771234502', status: DriverStatus.ACTIVE },
    { email: 'serigne.fall@fleet.local',     firstName: 'Serigne',    lastName: 'Fall',    phone: '+221771234503', status: DriverStatus.ACTIVE },
    { email: 'babacar.ndiaye@fleet.local',   firstName: 'Babacar',    lastName: 'Ndiaye',  phone: '+221771234504', status: DriverStatus.ACTIVE },
    { email: 'pape.diallo@fleet.local',      firstName: 'Pape',       lastName: 'Diallo',  phone: '+221771234505', status: DriverStatus.ACTIVE },
    { email: 'lamine.kane@fleet.local',      firstName: 'Lamine',     lastName: 'Kane',    phone: '+221771234506', status: DriverStatus.ACTIVE },
    { email: 'oumar.faye@fleet.local',       firstName: 'Oumar',      lastName: 'Faye',    phone: '+221771234507', status: DriverStatus.ACTIVE },
    { email: 'alassane.mbaye@fleet.local',   firstName: 'Alassane',   lastName: 'Mbaye',   phone: '+221771234508', status: DriverStatus.ACTIVE },
    { email: 'moustapha.sy@fleet.local',     firstName: 'Moustapha',  lastName: 'Sy',      phone: '+221771234509', status: DriverStatus.APPROVED },
    { email: 'ibrahima.lo@fleet.local',      firstName: 'Ibrahima',   lastName: 'Lo',      phone: '+221771234510', status: DriverStatus.APPROVED },
    { email: 'samba.diallo@fleet.local',     firstName: 'Samba',      lastName: 'Diallo',  phone: '+221771234511', status: DriverStatus.SUSPENDED },
    { email: 'boubacar.fall@fleet.local',    firstName: 'Boubacar',   lastName: 'Fall',    phone: '+221771234512', status: DriverStatus.SUSPENDED },
    { email: 'seydou.gaye@fleet.local',      firstName: 'Seydou',     lastName: 'Gaye',    phone: '+221771234513', status: DriverStatus.SUSPENDED },
    { email: 'malick.niang@fleet.local',     firstName: 'Malick',     lastName: 'Niang',   phone: '+221771234514', status: DriverStatus.AT_RISK },
    { email: 'awa.diop@fleet.local',         firstName: 'Awa',        lastName: 'Diop',    phone: '+221771234515', status: DriverStatus.AT_RISK },
    { email: 'ndeye.fall@fleet.local',       firstName: 'Ndèye',      lastName: 'Fall',    phone: '+221771234516', status: DriverStatus.PENDING_FIELD_VALIDATION },
    { email: 'cheikh.mbaye@fleet.local',     firstName: 'Cheikh',     lastName: 'Mbaye',   phone: '+221771234517', status: DriverStatus.PENDING_FIELD_VALIDATION },
    { email: 'aminata.sy@fleet.local',       firstName: 'Aminata',    lastName: 'Sy',      phone: '+221771234518', status: DriverStatus.PENDING_FIELD_VALIDATION },
    { email: 'fatou.ndiaye@fleet.local',     firstName: 'Fatou',      lastName: 'Ndiaye',  phone: '+221771234519', status: DriverStatus.PENDING_FIELD_VALIDATION },
    { email: 'omar.sarr@fleet.local',        firstName: 'Omar',       lastName: 'Sarr',    phone: '+221771234520', status: DriverStatus.PENDING_FIELD_VALIDATION },
    { email: 'aissatou.ba@fleet.local',      firstName: 'Aïssatou',   lastName: 'Ba',      phone: '+221771234521', status: DriverStatus.PENDING_KYC },
    { email: 'biram.diagne@fleet.local',     firstName: 'Biram',      lastName: 'Diagne',  phone: '+221771234522', status: DriverStatus.PENDING_KYC },
    { email: 'coumba.kane@fleet.local',      firstName: 'Coumba',     lastName: 'Kane',    phone: '+221771234523', status: DriverStatus.PENDING_KYC },
    { email: 'daouda.ndiaye@fleet.local',    firstName: 'Daouda',     lastName: 'Ndiaye',  phone: '+221771234524', status: DriverStatus.PENDING_KYC },
    { email: 'elhadji.diop@fleet.local',     firstName: 'El Hadji',   lastName: 'Diop',    phone: '+221771234525', status: DriverStatus.PENDING_KYC },
    { email: 'fatoumata.diallo@fleet.local', firstName: 'Fatoumata',  lastName: 'Diallo',  phone: '+221771234526', status: DriverStatus.PENDING_KYC },
    { email: 'gora.faye@fleet.local',        firstName: 'Gora',       lastName: 'Faye',    phone: '+221771234527', status: DriverStatus.PENDING_KYC },
    { email: 'hassan.sow@fleet.local',       firstName: 'Hassan',     lastName: 'Sow',     phone: '+221771234528', status: DriverStatus.PENDING_KYC },
    { email: 'ibou.lo@fleet.local',          firstName: 'Ibou',       lastName: 'Lo',      phone: '+221771234529', status: DriverStatus.PENDING_KYC },
    { email: 'jean.mendy@fleet.local',       firstName: 'Jean',       lastName: 'Mendy',   phone: '+221771234530', status: DriverStatus.PENDING_KYC },
  ];

  const driverRecords: { id: string; userId: string }[] = [];
  for (const d of driverData) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        passwordHash: driverHash,
        role: UserRole.DRIVER,
      },
    });
    const driver = await prisma.driver.upsert({
      where: { userId: user.id },
      update: { status: d.status },
      create: { userId: user.id, status: d.status },
    });
    driverRecords.push({ id: driver.id, userId: user.id });
  }
  console.log(`  ✅ ${driverRecords.length} chauffeurs créés`);

  // ─── 7. Véhicules (sans currentContractId — lié après les contrats) ──────────
  console.log('🚙 Création des véhicules...');

  // [0-7]  ASSIGNED        — recevront un contrat ACTIVE
  // [8-11] IN_SERVICE      — utilisés dans des contrats DRAFT
  // [12-14] AVAILABLE      — pas de contrats actifs
  // [15]   IMMOBILIZED
  // [16]   IN_REPAIR
  // [17]   ACCIDENTED
  // [18]   PENDING_INSPECTION
  // [19]   AVAILABLE
  const vehicleData = [
    { plateNumber: 'DK 1001 AA', brand: 'Toyota',      model: 'HiAce',       year: 2021, color: 'Blanc',   status: VehicleStatus.ASSIGNED,            ownerId: owners[0].id },
    { plateNumber: 'DK 1002 AB', brand: 'Toyota',      model: 'HiAce',       year: 2020, color: 'Blanc',   status: VehicleStatus.ASSIGNED,            ownerId: owners[0].id },
    { plateNumber: 'DK 1003 AC', brand: 'Toyota',      model: 'Land Cruiser',year: 2022, color: 'Gris',    status: VehicleStatus.ASSIGNED,            ownerId: owners[1].id },
    { plateNumber: 'DK 1004 AD', brand: 'Renault',     model: 'Kangoo',      year: 2020, color: 'Blanc',   status: VehicleStatus.ASSIGNED,            ownerId: owners[2].id },
    { plateNumber: 'DK 1005 AE', brand: 'Renault',     model: 'Kangoo',      year: 2021, color: 'Blanc',   status: VehicleStatus.ASSIGNED,            ownerId: owners[2].id },
    { plateNumber: 'DK 1006 AF', brand: 'Mitsubishi',  model: 'L200',        year: 2019, color: 'Noir',    status: VehicleStatus.ASSIGNED,            ownerId: owners[3].id },
    { plateNumber: 'DK 1007 AG', brand: 'Toyota',      model: 'HiAce',       year: 2021, color: 'Blanc',   status: VehicleStatus.ASSIGNED,            ownerId: owners[3].id },
    { plateNumber: 'DK 1008 AH', brand: 'Nissan',      model: 'Cabstar',     year: 2020, color: 'Blanc',   status: VehicleStatus.ASSIGNED,            ownerId: owners[4].id },
    { plateNumber: 'DK 2001 BA', brand: 'Toyota',      model: 'HiAce',       year: 2019, color: 'Jaune',   status: VehicleStatus.IN_SERVICE,          ownerId: owners[0].id },
    { plateNumber: 'DK 2002 BB', brand: 'Toyota',      model: 'Prado',       year: 2018, color: 'Blanc',   status: VehicleStatus.IN_SERVICE,          ownerId: owners[1].id },
    { plateNumber: 'DK 2003 BC', brand: 'Mercedes',    model: 'Sprinter',    year: 2020, color: 'Blanc',   status: VehicleStatus.IN_SERVICE,          ownerId: owners[2].id },
    { plateNumber: 'DK 2004 BD', brand: 'Renault',     model: 'Master',      year: 2021, color: 'Blanc',   status: VehicleStatus.IN_SERVICE,          ownerId: owners[3].id },
    { plateNumber: 'DK 3001 CA', brand: 'Toyota',      model: 'HiAce',       year: 2022, color: 'Blanc',   status: VehicleStatus.AVAILABLE,           ownerId: owners[4].id },
    { plateNumber: 'DK 3002 CB', brand: 'Toyota',      model: 'Corolla',     year: 2021, color: 'Argent',  status: VehicleStatus.AVAILABLE,           ownerId: owners[0].id },
    { plateNumber: 'DK 3003 CC', brand: 'Mitsubishi',  model: 'Pajero',      year: 2019, color: 'Blanc',   status: VehicleStatus.AVAILABLE,           ownerId: owners[1].id },
    { plateNumber: 'DK 4001 DA', brand: 'Toyota',      model: 'HiAce',       year: 2018, color: 'Blanc',   status: VehicleStatus.IMMOBILIZED,         ownerId: owners[2].id },
    { plateNumber: 'DK 4002 DB', brand: 'Renault',     model: 'Kangoo',      year: 2019, color: 'Blanc',   status: VehicleStatus.IN_REPAIR,           ownerId: owners[3].id },
    { plateNumber: 'DK 4003 DC', brand: 'Toyota',      model: 'HiAce',       year: 2020, color: 'Blanc',   status: VehicleStatus.ACCIDENTED,          ownerId: owners[4].id },
    { plateNumber: 'DK 4004 DD', brand: 'Nissan',      model: 'Patrol',      year: 2021, color: 'Noir',    status: VehicleStatus.PENDING_INSPECTION,  ownerId: owners[0].id },
    { plateNumber: 'DK 4005 DE', brand: 'Toyota',      model: 'Land Cruiser',year: 2023, color: 'Blanc',   status: VehicleStatus.AVAILABLE,           ownerId: owners[1].id },
  ];

  const vehicles: { id: string; plateNumber: string }[] = [];
  for (const v of vehicleData) {
    const vehicle = await prisma.vehicle.upsert({
      where: { plateNumber: v.plateNumber },
      update: { status: v.status },
      create: v,
    });
    vehicles.push({ id: vehicle.id, plateNumber: vehicle.plateNumber });
  }
  console.log(`  ✅ ${vehicles.length} véhicules créés`);

  // ─── 8. Contrats ──────────────────────────────────────────────────────────────
  console.log('📄 Création des contrats...');

  // Attention FK circulaire : Vehicle.currentContractId → Contract
  // → créer les contrats sans lier Vehicle.currentContractId ici
  // → la mise à jour des véhicules se fait à l'étape suivante
  const contractsData = [
    // ── OWNERSHIP_PROGRAM ACTIVE (0-2) ──────────────────────────────────────────
    {
      contractNumber: 'CTR-OP-2025-001',
      type: ContractType.OWNERSHIP_PROGRAM, status: ContractStatus.ACTIVE,
      vehicleId: vehicles[0].id, driverId: driverRecords[0].id, ownerId: owners[0].id, managerId,
      dailyAmount: 15000, targetDays: 1500, validatedDays: 240, restDay: 0,
      startDate: new Date('2025-01-15'), activatedAt: new Date('2025-01-15'),
      ...ACTIVE_CHECKLIST,
    },
    {
      contractNumber: 'CTR-OP-2025-002',
      type: ContractType.OWNERSHIP_PROGRAM, status: ContractStatus.ACTIVE,
      vehicleId: vehicles[1].id, driverId: driverRecords[1].id, ownerId: owners[0].id, managerId,
      dailyAmount: 15000, targetDays: 1500, validatedDays: 180, restDay: 0,
      startDate: new Date('2025-03-01'), activatedAt: new Date('2025-03-01'),
      ...ACTIVE_CHECKLIST,
    },
    {
      contractNumber: 'CTR-OP-2025-003',
      type: ContractType.OWNERSHIP_PROGRAM, status: ContractStatus.ACTIVE,
      vehicleId: vehicles[2].id, driverId: driverRecords[2].id, ownerId: owners[1].id, managerId,
      dailyAmount: 18000, targetDays: 1800, validatedDays: 90, restDay: 0,
      startDate: new Date('2025-09-01'), activatedAt: new Date('2025-09-01'),
      ...ACTIVE_CHECKLIST,
    },
    // ── PARTNER_FLEET ACTIVE (3-5) ───────────────────────────────────────────────
    {
      contractNumber: 'CTR-PF-2025-001',
      type: ContractType.PARTNER_FLEET, status: ContractStatus.ACTIVE,
      vehicleId: vehicles[3].id, driverId: driverRecords[3].id, ownerId: owners[2].id, managerId,
      dailyAmount: 12000, validatedDays: 0,
      mgmtFeeType: MgmtFeeType.PERCENTAGE, mgmtFeePercentage: 15, mgmtFeeBase: MgmtFeeBase.NET_PROFIT,
      startDate: new Date('2025-02-01'), activatedAt: new Date('2025-02-01'),
      ...ACTIVE_CHECKLIST,
    },
    {
      contractNumber: 'CTR-PF-2025-002',
      type: ContractType.PARTNER_FLEET, status: ContractStatus.ACTIVE,
      vehicleId: vehicles[4].id, driverId: driverRecords[4].id, ownerId: owners[2].id, managerId,
      dailyAmount: 12000, validatedDays: 0,
      mgmtFeeType: MgmtFeeType.PERCENTAGE, mgmtFeePercentage: 15, mgmtFeeBase: MgmtFeeBase.NET_PROFIT,
      startDate: new Date('2025-04-01'), activatedAt: new Date('2025-04-01'),
      ...ACTIVE_CHECKLIST,
    },
    {
      contractNumber: 'CTR-PF-2025-003',
      type: ContractType.PARTNER_FLEET, status: ContractStatus.ACTIVE,
      vehicleId: vehicles[5].id, driverId: driverRecords[5].id, ownerId: owners[3].id, managerId,
      dailyAmount: 10000, validatedDays: 0,
      mgmtFeeType: MgmtFeeType.FIXED, mgmtFeeFixed: 150000, mgmtFeeBase: MgmtFeeBase.NET_PROFIT,
      startDate: new Date('2025-05-01'), activatedAt: new Date('2025-05-01'),
      ...ACTIVE_CHECKLIST,
    },
    // ── SIMPLE_RENTAL ACTIVE (6-7) ───────────────────────────────────────────────
    {
      contractNumber: 'CTR-SR-2025-001',
      type: ContractType.SIMPLE_RENTAL, status: ContractStatus.ACTIVE,
      vehicleId: vehicles[6].id, driverId: driverRecords[6].id, ownerId: owners[3].id, managerId,
      dailyAmount: 8000, validatedDays: 0,
      simpleRentalMonthlyAmount: 240000, ownerPaymentFrequency: OwnerPaymentFrequency.MONTHLY,
      startDate: new Date('2025-06-01'), activatedAt: new Date('2025-06-01'),
      ...ACTIVE_CHECKLIST,
    },
    {
      contractNumber: 'CTR-SR-2025-002',
      type: ContractType.SIMPLE_RENTAL, status: ContractStatus.ACTIVE,
      vehicleId: vehicles[7].id, driverId: driverRecords[7].id, ownerId: owners[4].id, managerId,
      dailyAmount: 8500, validatedDays: 0,
      simpleRentalMonthlyAmount: 255000, ownerPaymentFrequency: OwnerPaymentFrequency.MONTHLY,
      startDate: new Date('2025-07-01'), activatedAt: new Date('2025-07-01'),
      ...ACTIVE_CHECKLIST,
    },
    // ── DRAFT (8-11) ─────────────────────────────────────────────────────────────
    {
      contractNumber: 'CTR-OP-2026-001',
      type: ContractType.OWNERSHIP_PROGRAM, status: ContractStatus.DRAFT,
      vehicleId: vehicles[8].id, driverId: driverRecords[8].id, ownerId: owners[0].id, managerId,
      dailyAmount: 15000, targetDays: 1500, validatedDays: 0,
    },
    {
      contractNumber: 'CTR-OP-2026-002',
      type: ContractType.OWNERSHIP_PROGRAM, status: ContractStatus.DRAFT,
      vehicleId: vehicles[9].id, driverId: driverRecords[9].id, ownerId: owners[1].id, managerId,
      dailyAmount: 18000, targetDays: 1800, validatedDays: 0,
    },
    {
      contractNumber: 'CTR-PF-2026-001',
      type: ContractType.PARTNER_FLEET, status: ContractStatus.DRAFT,
      vehicleId: vehicles[10].id, driverId: null, ownerId: owners[2].id, managerId,
      dailyAmount: 12000, validatedDays: 0,
      mgmtFeeType: MgmtFeeType.PERCENTAGE, mgmtFeePercentage: 15, mgmtFeeBase: MgmtFeeBase.NET_PROFIT,
    },
    {
      contractNumber: 'CTR-SR-2026-001',
      type: ContractType.SIMPLE_RENTAL, status: ContractStatus.DRAFT,
      vehicleId: vehicles[11].id, driverId: null, ownerId: owners[3].id, managerId,
      dailyAmount: 7000, validatedDays: 0,
      simpleRentalMonthlyAmount: 210000, ownerPaymentFrequency: OwnerPaymentFrequency.MONTHLY,
    },
    // ── SUSPENDED (12) ───────────────────────────────────────────────────────────
    {
      contractNumber: 'CTR-OP-2025-004',
      type: ContractType.OWNERSHIP_PROGRAM, status: ContractStatus.SUSPENDED,
      vehicleId: vehicles[12].id, driverId: driverRecords[10].id, ownerId: owners[4].id, managerId,
      dailyAmount: 15000, targetDays: 1500, validatedDays: 120, restDay: 0,
      startDate: new Date('2025-01-01'), activatedAt: new Date('2025-01-01'),
      ...ACTIVE_CHECKLIST,
    },
    // ── TERMINATED (13) ──────────────────────────────────────────────────────────
    {
      contractNumber: 'CTR-PF-2024-001',
      type: ContractType.PARTNER_FLEET, status: ContractStatus.TERMINATED,
      vehicleId: vehicles[13].id, driverId: null, ownerId: owners[0].id, managerId,
      dailyAmount: 10000, validatedDays: 0,
      mgmtFeeType: MgmtFeeType.PERCENTAGE, mgmtFeePercentage: 12, mgmtFeeBase: MgmtFeeBase.NET_PROFIT,
      startDate: new Date('2024-01-01'), activatedAt: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'), closedAt: new Date('2024-12-31'),
      ...ACTIVE_CHECKLIST,
    },
    // ── COMPLETED (14) ───────────────────────────────────────────────────────────
    {
      contractNumber: 'CTR-SR-2024-001',
      type: ContractType.SIMPLE_RENTAL, status: ContractStatus.COMPLETED,
      vehicleId: vehicles[14].id, driverId: driverRecords[11].id, ownerId: owners[1].id, managerId,
      dailyAmount: 7500, validatedDays: 0,
      simpleRentalMonthlyAmount: 225000, ownerPaymentFrequency: OwnerPaymentFrequency.MONTHLY,
      startDate: new Date('2024-06-01'), activatedAt: new Date('2024-06-01'),
      endDate: new Date('2025-05-31'), closedAt: new Date('2025-05-31'),
      ...ACTIVE_CHECKLIST,
    },
  ];

  // Upsert contracts — stocker les IDs pour les paiements
  const contracts: { id: string; contractNumber: string; vehicleId: string; driverId: string | null }[] = [];
  for (const c of contractsData) {
    const contract = await prisma.contract.upsert({
      where: { contractNumber: c.contractNumber },
      update: { status: c.status, validatedDays: c.validatedDays ?? 0 },
      create: c as Parameters<typeof prisma.contract.create>[0]['data'],
      select: { id: true, contractNumber: true, vehicleId: true, driverId: true },
    });
    contracts.push(contract);
  }
  console.log(`  ✅ ${contracts.length} contrats créés`);

  // ─── 9. Lier les véhicules actifs à leur contrat ───────────────────────────────
  console.log('🔗 Liaison véhicules ↔ contrats actifs...');

  // Les 8 premiers contrats (indices 0-7) sont ACTIVE
  // Mettre à jour Vehicle : currentContractId, currentDriverId, currentManagerId
  for (let i = 0; i < 8; i++) {
    const contract = contracts[i];
    await prisma.vehicle.update({
      where: { id: contract.vehicleId },
      data: {
        currentContractId: contract.id,
        currentDriverId: contract.driverId,
        currentManagerId: managerId,
      },
    });
  }
  console.log('  ✅ 8 véhicules liés à leur contrat actif');

  // ─── 10. Paiements (deleteMany + createMany pour idempotence) ─────────────────
  console.log('💰 Création des paiements...');

  await prisma.payment.deleteMany({ where: { notes: 'fleet-seed-2026' } });

  // 50 paiements répartis sur les 8 contrats actifs
  // Contrats 0-1 : 7 paiements chacun → 14
  // Contrats 2-7 : 6 paiements chacun → 36
  // Total : 50
  const paymentDist = [7, 7, 6, 6, 6, 6, 6, 6];

  // Montants journaliers par contrat (CFA)
  const dailyAmounts = [15000, 15000, 18000, 12000, 12000, 10000, 8000, 8500];

  // Dates de début de paiement par contrat (env. 5 jours après le début du contrat)
  const paymentStartDates = [
    new Date('2025-01-20'), new Date('2025-03-06'), new Date('2025-09-06'),
    new Date('2025-02-06'), new Date('2025-04-06'), new Date('2025-05-06'),
    new Date('2025-06-06'), new Date('2025-07-06'),
  ];

  const paymentsData: Parameters<typeof prisma.payment.createMany>[0]['data'] = [];
  for (let ci = 0; ci < 8; ci++) {
    const contract = contracts[ci];
    const count = paymentDist[ci];
    const baseAmount = dailyAmounts[ci];
    const startDate = paymentStartDates[ci];
    const staffCreatorId = staffUsers[2 + (ci % 3)].id; // alternance omar/fatou/ibra

    for (let pi = 0; pi < count; pi++) {
      const paidAt = new Date(startDate);
      paidAt.setDate(paidAt.getDate() + pi * 10); // tous les 10 jours

      // Montant = 3 à 5 jours selon l'index
      const days = 3 + (pi % 3); // 3, 4, 5, 3, 4, 5, 3
      const amount = baseAmount * days;

      const sources = [PaymentSource.WAVE, PaymentSource.ORANGE_MONEY, PaymentSource.MANUAL];
      const source = sources[pi % 3];

      // Dernier paiement de chaque contrat → PENDING, sinon VALIDATED
      const status = pi === count - 1 ? PaymentStatus.PENDING : PaymentStatus.VALIDATED;

      paymentsData.push({
        contractId: contract.id,
        vehicleId: contract.vehicleId,
        driverId: contract.driverId!,
        amount,
        source,
        status,
        paidAt,
        reference: `PAY-${contract.contractNumber}-${String(pi + 1).padStart(2, '0')}`,
        notes: 'fleet-seed-2026',
        createdById: staffCreatorId,
        validatedDaysCount: status === PaymentStatus.VALIDATED ? days : 0,
      });
    }
  }

  await prisma.payment.createMany({ data: paymentsData });
  console.log(`  ✅ ${paymentsData.length} paiements créés`);

  // ─── 11. Documents (deleteMany + createMany pour idempotence) ─────────────────
  console.log('📁 Création des documents...');

  await prisma.document.deleteMany({ where: { notes: 'fleet-seed-2026' } });

  const now = new Date('2026-06-02');
  const uploaderIds = [staffUsers[2].id, staffUsers[3].id, staffUsers[4].id]; // managers

  // Dates d'expiration variées pour créer des statuts différents
  const dates = {
    expired:      new Date('2025-12-31'),     // EXPIRED — expiré
    expiringSoon: new Date('2026-06-20'),      // EXPIRING_SOON — expire dans 18 jours
    valid1y:      new Date('2027-06-02'),      // VALID — valide 1 an
    valid2y:      new Date('2028-06-02'),      // VALID — valide 2 ans
    past:         new Date('2024-01-01'),      // validFrom pour documents anciens
  };

  const documentsData: Parameters<typeof prisma.document.createMany>[0]['data'] = [];

  // ── 15 documents véhicule ───────────────────────────────────────────────────
  // Assurances pour les 8 véhicules ASSIGNED + quelques documents GRAY_CARD
  const vehicleDocSpecs = [
    // [véhicleIndex, type, status, validFrom, validUntil, isCritical]
    [0, DocumentType.INSURANCE,       DocumentStatus.VALID,          '2025-07-01', dates.valid1y,      true  ],
    [1, DocumentType.INSURANCE,       DocumentStatus.EXPIRING_SOON,  '2025-06-15', dates.expiringSoon, true  ],
    [2, DocumentType.INSURANCE,       DocumentStatus.VALID,          '2025-10-01', dates.valid1y,      true  ],
    [3, DocumentType.TECHNICAL_VISIT, DocumentStatus.VALID,          '2025-03-01', dates.valid1y,      false ],
    [4, DocumentType.TECHNICAL_VISIT, DocumentStatus.EXPIRED,        '2024-04-01', dates.expired,      false ],
    [5, DocumentType.INSURANCE,       DocumentStatus.VALID,          '2025-06-01', dates.valid1y,      true  ],
    [6, DocumentType.INSURANCE,       DocumentStatus.VALID,          '2025-07-01', dates.valid2y,      true  ],
    [7, DocumentType.TECHNICAL_VISIT, DocumentStatus.VALID,          '2025-08-01', dates.valid1y,      false ],
    [8, DocumentType.GRAY_CARD,       DocumentStatus.ALWAYS_VALID,   '2020-01-01', null,               false ],
    [9, DocumentType.GRAY_CARD,       DocumentStatus.ALWAYS_VALID,   '2019-01-01', null,               false ],
    [0, DocumentType.GRAY_CARD,       DocumentStatus.ALWAYS_VALID,   '2021-01-01', null,               false ],
    [1, DocumentType.STICKER,         DocumentStatus.EXPIRED,        '2025-01-01', dates.expired,      false ],
    [2, DocumentType.PARKING_CARD,    DocumentStatus.VALID,          '2025-09-01', dates.valid1y,      false ],
    [3, DocumentType.INSURANCE,       DocumentStatus.ARCHIVED,       dates.past,   dates.expired,      false ],
    [5, DocumentType.STICKER,         DocumentStatus.VALID,          '2026-01-01', dates.valid1y,      false ],
  ] as const;

  for (let idx = 0; idx < vehicleDocSpecs.length; idx++) {
    const [vi, type, status, validFromStr, validUntil, isCritical] = vehicleDocSpecs[idx];
    documentsData.push({
      entityType: DocumentEntityType.VEHICLE,
      entityId: vehicles[vi].id,
      type,
      status,
      validFrom: new Date(validFromStr as string),
      validUntil: validUntil instanceof Date ? validUntil : (validUntil ? new Date(validUntil) : null),
      alwaysValid: status === DocumentStatus.ALWAYS_VALID,
      isCritical: isCritical as boolean,
      uploadedById: uploaderIds[idx % 3],
      notes: 'fleet-seed-2026',
    });
  }

  // ── 15 documents chauffeur ───────────────────────────────────────────────────
  // Permis de conduire + CNI + documents KYC pour les chauffeurs actifs et en cours
  const driverDocSpecs = [
    [0,  DocumentType.DRIVER_LICENSE, DocumentStatus.VALID,         '2023-01-01', dates.valid2y ],
    [0,  DocumentType.NATIONAL_ID,    DocumentStatus.VALID,         '2022-06-01', dates.valid2y ],
    [1,  DocumentType.DRIVER_LICENSE, DocumentStatus.EXPIRING_SOON, '2023-06-01', dates.expiringSoon ],
    [1,  DocumentType.NATIONAL_ID,    DocumentStatus.VALID,         '2023-01-01', dates.valid1y ],
    [2,  DocumentType.DRIVER_LICENSE, DocumentStatus.VALID,         '2024-01-01', dates.valid2y ],
    [3,  DocumentType.KYC_DOCUMENT,   DocumentStatus.VALID,         '2025-01-15', dates.valid1y ],
    [4,  DocumentType.DRIVER_LICENSE, DocumentStatus.VALID,         '2024-06-01', dates.valid2y ],
    [5,  DocumentType.NATIONAL_ID,    DocumentStatus.EXPIRED,       '2022-01-01', dates.expired ],
    [6,  DocumentType.DRIVER_LICENSE, DocumentStatus.VALID,         '2024-07-01', dates.valid2y ],
    [7,  DocumentType.KYC_DOCUMENT,   DocumentStatus.VALID,         '2025-07-01', dates.valid1y ],
    [8,  DocumentType.DRIVER_LICENSE, DocumentStatus.VALID,         '2025-01-01', dates.valid2y ],
    [9,  DocumentType.NATIONAL_ID,    DocumentStatus.VALID,         '2025-02-01', dates.valid1y ],
    [10, DocumentType.DRIVER_LICENSE, DocumentStatus.ARCHIVED,      '2021-01-01', dates.expired ],
    [13, DocumentType.KYC_DOCUMENT,   DocumentStatus.VALID,         '2025-05-01', dates.valid1y ],
    [15, DocumentType.NATIONAL_ID,    DocumentStatus.VALID,         '2025-03-01', dates.valid2y ],
  ] as const;

  for (let idx = 0; idx < driverDocSpecs.length; idx++) {
    const [di, type, status, validFromStr, validUntil] = driverDocSpecs[idx];
    documentsData.push({
      entityType: DocumentEntityType.DRIVER,
      entityId: driverRecords[di].id,
      type,
      status,
      validFrom: new Date(validFromStr as string),
      validUntil: validUntil instanceof Date ? validUntil : null,
      alwaysValid: false,
      isCritical: type === DocumentType.DRIVER_LICENSE,
      uploadedById: uploaderIds[idx % 3],
      notes: 'fleet-seed-2026',
    });
  }

  // ── 10 documents contrat ─────────────────────────────────────────────────────
  // Documents contractuels pour les 8 contrats actifs + 2 contrats draft
  const contractDocSpecs = [
    [0,  DocumentStatus.VALID,    '2025-01-15'],
    [1,  DocumentStatus.VALID,    '2025-03-01'],
    [2,  DocumentStatus.VALID,    '2025-09-01'],
    [3,  DocumentStatus.VALID,    '2025-02-01'],
    [4,  DocumentStatus.VALID,    '2025-04-01'],
    [5,  DocumentStatus.VALID,    '2025-05-01'],
    [6,  DocumentStatus.VALID,    '2025-06-01'],
    [7,  DocumentStatus.VALID,    '2025-07-01'],
    [8,  DocumentStatus.ARCHIVED, '2026-05-01'],
    [12, DocumentStatus.ARCHIVED, '2025-01-01'],
  ] as const;

  for (let idx = 0; idx < contractDocSpecs.length; idx++) {
    const [ci, status, validFromStr] = contractDocSpecs[idx];
    documentsData.push({
      entityType: DocumentEntityType.CONTRACT,
      entityId: contracts[ci].id,
      type: DocumentType.CONTRACT_DOCUMENT,
      status,
      validFrom: new Date(validFromStr as string),
      validUntil: null,
      alwaysValid: true,
      isCritical: false,
      uploadedById: uploaderIds[idx % 3],
      notes: 'fleet-seed-2026',
    });
  }

  await prisma.document.createMany({ data: documentsData });
  console.log(`  ✅ ${documentsData.length} documents créés (${vehicleDocSpecs.length} véhicule, ${driverDocSpecs.length} chauffeur, ${contractDocSpecs.length} contrat)`);

  // ─── Récapitulatif ────────────────────────────────────────────────────────────
  console.log('\n✅ Seed Phase 8-F terminé avec succès!');
  console.log('\n📊 Données créées :');
  console.log(`   👤 1 Admin + ${staffData.length} staff + ${ownerData.length} propriétaires + ${driverData.length} chauffeurs`);
  console.log(`   🚙 ${vehicles.length} véhicules (statuts mixtes)`);
  console.log(`   📄 ${contracts.length} contrats (8 ACTIVE, 4 DRAFT, 1 SUSPENDED, 1 TERMINATED, 1 COMPLETED)`);
  console.log(`   💰 ${paymentsData.length} paiements sur 8 contrats actifs`);
  console.log(`   📁 ${documentsData.length} documents (véhicules, chauffeurs, contrats)`);
  console.log('\n📝 Comptes par défaut :');
  console.log('   Admin         : admin@fleet.local         / Admin@Fleet2026!');
  console.log('   SuperManager  : cheikh.traore@fleet.local / Staff@Fleet2026!');
  console.log('   Manager       : omar.bamba@fleet.local    / Staff@Fleet2026!');
  console.log('   Propriétaire  : papa.diop@fleet.local     / Owner@Fleet2026!');
  console.log('   Chauffeur     : abdou.seck@fleet.local    / Driver@Fleet2026!');
  console.log('\n  ⚠️  Changer tous les mots de passe en production!');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
