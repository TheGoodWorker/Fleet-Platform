// Types d'entités pour les associations polymorphiques
// Utilisé dans: Document.entityType, AuditLog.entityType,
//               Notification.entityType, LedgerEntry.sourceType, etc.

export const EntityTypes = {
  VEHICLE: 'VEHICLE',
  DRIVER: 'DRIVER',
  CONTRACT: 'CONTRACT',
  OWNER: 'OWNER',
  INCIDENT: 'INCIDENT',
  ACCIDENT_CASE: 'ACCIDENT_CASE',
  CHARGE: 'CHARGE',
  PAYMENT: 'PAYMENT',
  DEPOSIT: 'DEPOSIT',
  MAINTENANCE: 'MAINTENANCE',
  IMMOBILIZATION: 'IMMOBILIZATION',
  CONTRAVENTION: 'CONTRAVENTION',
  REPOSSESSION: 'REPOSSESSION',
  SETTLEMENT: 'SETTLEMENT',
  FUEL_TRANSACTION: 'FUEL_TRANSACTION',
  INSPECTION: 'INSPECTION',
} as const;

/** @deprecated Utilisez EntityTypes */
export const EntityType = EntityTypes;

export type EntityTypeValue = (typeof EntityTypes)[keyof typeof EntityTypes];
