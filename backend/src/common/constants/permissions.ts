// Catalogue des codes de permissions atomiques.
// SOURCE DE VÉRITÉ — tout nouveau code doit être déclaré ici
// ET ajouté dans le seed avant utilisation dans un guard.

export const Perm = {
  // Véhicules
  CREATE_VEHICLE: 'can_create_vehicle',
  EDIT_VEHICLE: 'can_edit_vehicle',
  DELETE_VEHICLE: 'can_delete_vehicle',
  ASSIGN_VEHICLE: 'can_assign_vehicle',

  // Chauffeurs
  CREATE_DRIVER: 'can_create_driver',
  VALIDATE_KYC: 'can_validate_kyc',
  VALIDATE_FIELD: 'can_validate_field',
  BLACKLIST_DRIVER: 'can_blacklist_driver',

  // Contrats
  CREATE_CONTRACT: 'can_create_contract',
  ACTIVATE_CONTRACT: 'can_activate_contract',
  SUSPEND_CONTRACT: 'can_suspend_contract',
  CLOSE_CONTRACT: 'can_close_contract',

  // Paiements
  RECORD_PAYMENT: 'can_record_payment',
  VIEW_PAYMENTS: 'can_view_payments',

  // Charges
  CREATE_CHARGE: 'can_create_charge',
  VALIDATE_CHARGE: 'can_validate_charge',
  REJECT_CHARGE: 'can_reject_charge',
  ADD_CHARGE_TO_CONTRACT: 'can_add_charge_to_contract',

  // Caution
  PROPOSE_DEPOSIT: 'can_propose_deposit',
  VALIDATE_DEPOSIT: 'can_validate_deposit',
  USE_DEPOSIT: 'can_use_deposit',

  // Documents
  MANAGE_DOCUMENTS: 'can_manage_documents',
  UPLOAD_DOCUMENT: 'can_upload_document',

  // Incidents
  CREATE_INCIDENT: 'can_create_incident',
  MANAGE_INCIDENT: 'can_manage_incident',

  // Accidents
  CREATE_ACCIDENT: 'can_create_accident',
  ADVANCE_ACCIDENT_STEP: 'can_advance_accident_step',
  VALIDATE_ACCIDENT_EXPENSE: 'can_validate_accident_expense',

  // Maintenance
  MANAGE_MAINTENANCE: 'can_manage_maintenance',

  // Inspections
  CREATE_INSPECTION: 'can_create_inspection',
  SIGN_INSPECTION: 'can_sign_inspection',

  // Reprises
  PROPOSE_REPOSSESSION: 'can_propose_repossession',
  VALIDATE_REPOSSESSION: 'can_validate_repossession',
  APPROVE_REPOSSESSION: 'can_approve_repossession',

  // Relevés
  GENERATE_SETTLEMENT: 'can_generate_settlement',
  APPROVE_SETTLEMENT: 'can_approve_settlement',
  VIEW_OWNER_FINANCES: 'can_view_owner_finances',

  // Utilisateurs et permissions
  MANAGE_USERS: 'can_manage_users',
  MANAGE_MANAGERS: 'can_manage_managers',
  MANAGE_PERMISSIONS: 'can_manage_permissions',
  GRANT_PERMISSION: 'can_grant_permission',
  REVOKE_PERMISSION: 'can_revoke_permission',

  // Audit et analytique
  VIEW_AUDIT_LOGS: 'can_view_audit_logs',
  VIEW_ANALYTICS: 'can_view_analytics',

  // Carburant & kilométrage (Phase 3-B)
  RECORD_FUEL: 'can_record_fuel',
  VALIDATE_MILEAGE: 'can_validate_mileage',

  // Disponibilité — immobilisations & absences spéciales (Phase 3-B)
  MANAGE_IMMOBILIZATION: 'can_manage_immobilization',
  MANAGE_SPECIAL_ABSENCE: 'can_manage_special_absence',
  APPROVE_SPECIAL_ABSENCE: 'can_approve_special_absence',

  // Portail propriétaire (Phase 3-B)
  CONFIGURE_OWNER_VISIBILITY: 'can_configure_owner_visibility',
  VIEW_OWNER_PORTAL: 'can_view_owner_portal',
  RECORD_OWNER_PAYMENT: 'can_record_owner_payment',

  // Missions photo (Phase 3-B)
  CREATE_PHOTO_MISSION: 'can_create_photo_mission',
  VALIDATE_PHOTO_MISSION: 'can_validate_photo_mission',
} as const;

export type PermissionCode = (typeof Perm)[keyof typeof Perm];
