-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPER_MANAGER', 'MANAGER', 'DRIVER', 'OWNER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'INTERNAL');

-- CreateEnum
CREATE TYPE "OwnerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PermissionModule" AS ENUM ('VEHICLES', 'DRIVERS', 'CONTRACTS', 'PAYMENTS', 'CHARGES', 'DEPOSITS', 'DOCUMENTS', 'INCIDENTS', 'ACCIDENTS', 'MAINTENANCE', 'INSPECTIONS', 'REPOSSESSIONS', 'SETTLEMENTS', 'NOTIFICATIONS', 'USERS', 'MANAGERS', 'ANALYTICS', 'AUDIT', 'FUEL', 'AVAILABILITY', 'OWNER_PORTAL');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'IN_SERVICE', 'IMMOBILIZED', 'IN_REPAIR', 'ACCIDENTED', 'PENDING_INSPECTION', 'REPOSSESSED', 'OUT_OF_SERVICE', 'SOLD');

-- CreateEnum
CREATE TYPE "VehicleAvailabilityEventType" AS ENUM ('IN_SERVICE', 'REST_DAY', 'IMMOBILIZED', 'IN_REPAIR', 'ACCIDENTED', 'TECHNICAL_VISIT', 'SPECIAL_ABSENCE', 'REPOSSESSED', 'OUT_OF_SERVICE', 'MAINTENANCE', 'BREAKDOWN', 'APPOINTMENT');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('PENDING_KYC', 'PENDING_FIELD_VALIDATION', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'AT_RISK', 'TERMINATED', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "FieldValidationStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('OWNERSHIP_PROGRAM', 'PARTNER_FLEET', 'SIMPLE_RENTAL');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'IMMOBILIZED', 'BLOCKED', 'TERMINATED', 'COMPLETED', 'VEHICLE_REPOSSESSED');

-- CreateEnum
CREATE TYPE "MgmtFeeType" AS ENUM ('PERCENTAGE', 'FIXED', 'MIXED');

-- CreateEnum
CREATE TYPE "MgmtFeeBase" AS ENUM ('NET_PROFIT', 'GROSS_REVENUE');

-- CreateEnum
CREATE TYPE "OwnerPaymentFrequency" AS ENUM ('MONTHLY', 'WEEKLY', 'BIWEEKLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RentalPaymentStatus" AS ENUM ('PENDING', 'PAID', 'LATE', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('MANUAL', 'WAVE', 'ORANGE_MONEY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'MOBILE_MONEY', 'WAVE', 'ORANGE_MONEY', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('VALIDATED', 'PARTIALLY_PAID', 'UNPAID', 'REST_DAY', 'IMMOBILIZED', 'EXCUSED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('FRANCHISE', 'REPAIR', 'FINE', 'PENALTY', 'TOWING', 'TIRE', 'BATTERY', 'ACCESSORY_LOST', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('DRAFT', 'PENDING_VALIDATION', 'VALIDATED', 'REJECTED', 'PAID', 'PARTIALLY_PAID', 'ADDED_TO_CONTRACT');

-- CreateEnum
CREATE TYPE "ChargeResponsible" AS ENUM ('DRIVER', 'OWNER', 'COMPANY');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'USED', 'REFUNDED', 'PARTIAL_REFUNDED');

-- CreateEnum
CREATE TYPE "DepositTransactionType" AS ENUM ('PAYMENT', 'USAGE', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('CARCUL', 'MANAGER', 'ADMIN_CORRECTION');

-- CreateEnum
CREATE TYPE "ImmobilizationResponsible" AS ENUM ('DRIVER', 'COMPANY');

-- CreateEnum
CREATE TYPE "ImmobilizationStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('BREAKDOWN', 'ACCIDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AccidentStep" AS ENUM ('DECLARED', 'PHOTOS_RECEIVED', 'MANAGER_ARRIVED', 'TOWING_REQUESTED', 'VEHICLE_TOWED', 'INSURANCE_DECLARED', 'EXPERT_VISITED', 'REPAIR_QUOTE_RECEIVED', 'GARAGE_STARTED', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETED', 'EXPERT_VALIDATION', 'EXIT_PERMIT_RECEIVED', 'VEHICLE_RETURNED');

-- CreateEnum
CREATE TYPE "AccidentCaseStatus" AS ENUM ('OPEN', 'CLOSED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "AccidentExpenseType" AS ENUM ('POLICE_REPORT', 'TOWING', 'TRANSPORT', 'PARKING', 'FILE_FEE', 'ASSISTANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('OIL_CHANGE', 'TIRE_CHANGE', 'REPAIR', 'TECHNICAL_VISIT', 'BATTERY_CHANGE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MileageSource" AS ENUM ('DRIVER', 'MANAGER', 'CARCUL');

-- CreateEnum
CREATE TYPE "FuelLevel" AS ENUM ('FULL', 'THREE_QUARTERS', 'HALF', 'QUARTER', 'EMPTY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FuelTransactionType" AS ENUM ('INITIAL_FULL_TANK', 'RETURN_CHECK', 'REFILL', 'ADJUSTMENT', 'PENALTY', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'DOCUMENT', 'VIDEO', 'AUDIO', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaSource" AS ENUM ('IN_APP_CAMERA', 'UPLOAD', 'SYSTEM', 'IMPORT');

-- CreateEnum
CREATE TYPE "PhotoMissionType" AS ENUM ('REGULAR_VEHICLE', 'DASHBOARD_MILEAGE', 'BREAKDOWN', 'ACCIDENT', 'INSPECTION', 'TOWING');

-- CreateEnum
CREATE TYPE "PhotoMissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VALIDATED', 'REJECTED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('VEHICLE_DELIVERY', 'VEHICLE_RETURN', 'REGULAR', 'INCIDENT');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('PENDING_DRIVER', 'DRIVER_SIGNED', 'PENDING_MANAGER', 'MANAGER_SIGNED', 'COMPLETED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "InspectionItemStatus" AS ENUM ('OK', 'MISSING', 'DAMAGED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INSURANCE', 'TECHNICAL_VISIT', 'GRAY_CARD', 'PARKING_CARD', 'STICKER', 'PATENT', 'ADMIN_AUTHORIZATION', 'DRIVER_LICENSE', 'NATIONAL_ID', 'KYC_DOCUMENT', 'CONTRACT_DOCUMENT', 'ACCIDENT_REPORT', 'INSURANCE_CLAIM', 'REPAIR_QUOTE', 'REPAIR_EXIT_PERMIT', 'FRANCHISE_PROOF', 'TOWING_PROOF', 'CONTRAVENTION_NOTICE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'ALWAYS_VALID', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentEntityType" AS ENUM ('VEHICLE', 'DRIVER', 'CONTRACT', 'OWNER', 'INCIDENT', 'ACCIDENT_CASE', 'CHARGE', 'MAINTENANCE', 'IMMOBILIZATION', 'CONTRAVENTION', 'REPOSSESSION');

-- CreateEnum
CREATE TYPE "SpecialAbsenceStatus" AS ENUM ('PENDING', 'MANAGER_REVIEWED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TASK', 'APPOINTMENT', 'REMINDER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskRelatedEntityType" AS ENUM ('VEHICLE', 'DRIVER', 'CONTRACT', 'INCIDENT', 'ACCIDENT', 'MAINTENANCE', 'DOCUMENT', 'CHARGE', 'REPOSSESSION', 'FUEL', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAYMENT_RECEIVED', 'PAYMENT_INCOMPLETE', 'VEHICLE_BLOCKED', 'PHOTO_MISSION_REQUIRED', 'PHOTO_MISSION_OVERDUE', 'VEHICLE_RETURNED_TO_DRIVER', 'CONTRACT_ACTIVATED', 'CONTRACT_SUSPENDED', 'SPECIAL_ABSENCE_APPROVED', 'SPECIAL_ABSENCE_REJECTED', 'APPOINTMENT_CREATED', 'MAINTENANCE_DUE_SOON', 'TECHNICAL_VISIT_DUE_SOON', 'DOCUMENT_EXPIRING_SOON', 'DOCUMENT_EXPIRED', 'ACCIDENT_DECLARED', 'BREAKDOWN_DECLARED', 'CHARGE_PENDING_VALIDATION', 'CHARGE_VALIDATED', 'SPECIAL_ABSENCE_REQUESTED', 'KYC_VALIDATED', 'VEHICLE_IMMOBILIZED', 'VEHICLE_RELEASED', 'DEPOSIT_VALIDATION_REQUIRED', 'PENALTY_VALIDATED', 'REPOSSESSION_REQUESTED', 'REPOSSESSION_APPROVED', 'OWNER_SETTLEMENT_READY', 'OWNER_SETTLEMENT_PAID', 'OWNER_DOCUMENT_EXPIRING_SOON', 'OWNER_DOCUMENT_EXPIRED', 'OWNER_RENTAL_PAYMENT_RECORDED', 'OWNER_RENTAL_PAYMENT_DUE', 'ACCIDENT_STEP_UPDATED', 'ACCIDENT_RESOLVED', 'REPAIR_STARTED', 'CRITICAL_ACCIDENT', 'FRAUD_ALERT', 'LARGE_UNPAID');

-- CreateEnum
CREATE TYPE "RepossessionStatus" AS ENUM ('PROPOSED', 'SM_VALIDATED', 'ADMIN_APPROVED', 'MISSION_ONGOING', 'INSPECTION_DONE', 'CHARGES_CALCULATED', 'CONTRACT_CLOSED', 'VEHICLE_AVAILABLE');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT_TO_OWNER', 'OWNER_ACKNOWLEDGED', 'PAID', 'PARTIALLY_PAID', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ContraventionSource" AS ENUM ('CARCUL', 'MANUAL');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DAILY_REVENUE', 'MANUAL_PAYMENT', 'CHARGE', 'DEPOSIT_PAYMENT', 'DEPOSIT_USAGE', 'DEPOSIT_REFUND', 'OWNER_SETTLEMENT', 'MANAGEMENT_COMMISSION', 'MAINTENANCE_COST', 'ACCIDENT_EXPENSE', 'CONTRAVENTION', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "avatarUrl" TEXT,
    "fcmToken" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" "PermissionModule" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "permissionId" TEXT NOT NULL,
    "isGranted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permission_overrides" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "isGranted" BOOLEAN NOT NULL,
    "reason" TEXT,
    "grantedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'PENDING_KYC',
    "scoreValue" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "idCardNumber" TEXT,
    "licenseNumber" TEXT,
    "address" TEXT,
    "emergencyContact" TEXT,
    "familyContacts" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_kyc" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "fullNameVerified" BOOLEAN NOT NULL DEFAULT false,
    "photoVerified" BOOLEAN NOT NULL DEFAULT false,
    "idCardVerified" BOOLEAN NOT NULL DEFAULT false,
    "licenseVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "idCardUrl" TEXT,
    "licenseUrl" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_field_validations" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "homeVisitDone" BOOLEAN NOT NULL DEFAULT false,
    "homeVisitPhotoUrl" TEXT,
    "gpsLocationLat" DOUBLE PRECISION,
    "gpsLocationLng" DOUBLE PRECISION,
    "environmentPhotoUrl" TEXT,
    "resourcePersonName" TEXT,
    "resourcePersonPhone" TEXT,
    "familyContactsNotes" TEXT,
    "managerComment" TEXT,
    "managerId" TEXT,
    "status" "FieldValidationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_field_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "OwnerType" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "status" "OwnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "plateNumber" TEXT NOT NULL,
    "vin" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "color" TEXT,
    "fuelType" TEXT,
    "transmission" TEXT,
    "seats" INTEGER,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentManagerId" TEXT,
    "currentDriverId" TEXT,
    "currentContractId" TEXT,
    "carculVehicleId" TEXT,
    "lastKnownMileage" INTEGER,
    "lastMileageAt" TIMESTAMP(3),
    "currentMileage" INTEGER,
    "scoreValue" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_manager_assignments" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_manager_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_driver_assignments" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "contractId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" "AssignmentSource" NOT NULL,
    "scheduleRules" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_driver_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "ownerId" TEXT,
    "managerId" TEXT NOT NULL,
    "dailyAmount" DECIMAL(12,2) NOT NULL,
    "targetDays" INTEGER,
    "validatedDays" INTEGER NOT NULL DEFAULT 0,
    "restDay" INTEGER,
    "mgmtFeeType" "MgmtFeeType",
    "mgmtFeePercentage" DECIMAL(5,2),
    "mgmtFeeFixed" DECIMAL(12,2),
    "mgmtFeeBase" "MgmtFeeBase",
    "vehicleInvestmentCost" DECIMAL(15,2),
    "simpleRentalMonthlyAmount" DECIMAL(15,2),
    "ownerPaymentFrequency" "OwnerPaymentFrequency",
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "kycValidated" BOOLEAN NOT NULL DEFAULT false,
    "fieldValidated" BOOLEAN NOT NULL DEFAULT false,
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "contractSigned" BOOLEAN NOT NULL DEFAULT false,
    "managerApproved" BOOLEAN NOT NULL DEFAULT false,
    "adminApproved" BOOLEAN NOT NULL DEFAULT false,
    "chargePolicy" JSONB,
    "notes" TEXT,
    "contractNumber" TEXT,
    "parentContractId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "source" "PaymentSource" NOT NULL DEFAULT 'MANUAL',
    "status" "PaymentStatus" NOT NULL DEFAULT 'VALIDATED',
    "validatedDaysCount" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_entries" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "date" DATE NOT NULL,
    "status" "DayStatus" NOT NULL DEFAULT 'UNPAID',
    "expectedAmount" DECIMAL(12,2),
    "paidAmount" DECIMAL(12,2),
    "paymentId" TEXT,
    "chargeId" TEXT,
    "chargeType" "ChargeType",
    "immobilizationId" TEXT,
    "isRestDay" BOOLEAN NOT NULL DEFAULT false,
    "isExcused" BOOLEAN NOT NULL DEFAULT false,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" TEXT NOT NULL,
    "type" "ChargeType" NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'DRAFT',
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vehicleId" TEXT NOT NULL,
    "contractId" TEXT,
    "driverId" TEXT,
    "proposedResponsible" "ChargeResponsible",
    "validatedResponsible" "ChargeResponsible",
    "description" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "incidentId" TEXT,
    "extraDaysAdded" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "recommendedAmount" DECIMAL(12,2) NOT NULL,
    "requestedAmount" DECIMAL(12,2) NOT NULL,
    "validatedAmount" DECIMAL(12,2),
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "usedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "isStandardAmount" BOOLEAN NOT NULL DEFAULT true,
    "proposedById" TEXT,
    "adminValidatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_transactions" (
    "id" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "type" "DepositTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contraventions" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "contractId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "source" "ContraventionSource" NOT NULL DEFAULT 'MANUAL',
    "carculRef" TEXT,
    "infraction" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "paidAmount" DECIMAL(12,2),
    "chargeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contraventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "immobilizations" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "contractId" TEXT,
    "responsible" "ImmobilizationResponsible" NOT NULL,
    "status" "ImmobilizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "estimatedEnd" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "resumeDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "incidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "immobilizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_absences" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "estimatedDays" INTEGER NOT NULL,
    "status" "SpecialAbsenceStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewComment" TEXT,
    "smValidatedById" TEXT,
    "smValidatedAt" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "managerId" TEXT,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accident_cases" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "insuranceFileNumber" TEXT,
    "currentStep" "AccidentStep" NOT NULL DEFAULT 'DECLARED',
    "status" "AccidentCaseStatus" NOT NULL DEFAULT 'OPEN',
    "insuranceCompany" TEXT,
    "insuranceDocUrl" TEXT,
    "towingCompany" TEXT,
    "towingCost" DECIMAL(12,2),
    "towingPhotoUrl" TEXT,
    "towingPlateVisible" BOOLEAN NOT NULL DEFAULT false,
    "declaredAt" TIMESTAMP(3),
    "photosReceivedAt" TIMESTAMP(3),
    "managerArrivedAt" TIMESTAMP(3),
    "towingRequestedAt" TIMESTAMP(3),
    "vehicleTowedAt" TIMESTAMP(3),
    "insuranceDeclaredAt" TIMESTAMP(3),
    "expertVisitedAt" TIMESTAMP(3),
    "repairQuoteReceivedAt" TIMESTAMP(3),
    "garageStartedAt" TIMESTAMP(3),
    "repairCompletedAt" TIMESTAMP(3),
    "expertValidationAt" TIMESTAMP(3),
    "exitPermitAt" TIMESTAMP(3),
    "vehicleReturnedAt" TIMESTAMP(3),
    "declaredById" TEXT,
    "policeReportNumber" TEXT,
    "estimatedRepairDays" INTEGER,
    "repairDeadline" TIMESTAMP(3),
    "insuranceDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accident_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accident_step_history" (
    "id" TEXT NOT NULL,
    "accidentCaseId" TEXT NOT NULL,
    "step" "AccidentStep" NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "completedById" TEXT,
    "notes" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accident_step_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accident_expenses" (
    "id" TEXT NOT NULL,
    "accidentCaseId" TEXT NOT NULL,
    "type" "AccidentExpenseType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "responsible" "ChargeResponsible",
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "documentUrl" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accident_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "mileageAtService" INTEGER,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "garage" TEXT,
    "cost" DECIMAL(12,2),
    "description" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mileage_records" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "mileage" INTEGER NOT NULL,
    "photoUrl" TEXT,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "source" "MileageSource" NOT NULL DEFAULT 'DRIVER',
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mileage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_transactions" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "contractId" TEXT,
    "driverId" TEXT,
    "type" "FuelTransactionType" NOT NULL,
    "fuelLevel" "FuelLevel" NOT NULL,
    "amount" DECIMAL(12,2),
    "liters" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "responsible" "ChargeResponsible",
    "inspectionId" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "discrepancyChargeId" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "mediaType" "MediaType" NOT NULL,
    "source" "MediaSource" NOT NULL DEFAULT 'IN_APP_CAMERA',
    "hash" TEXT,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "takenAt" TIMESTAMP(3),
    "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_missions" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "PhotoMissionType" NOT NULL,
    "status" "PhotoMissionStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "incidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "missionId" TEXT,
    "inspectionId" TEXT,
    "captureContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'PENDING_DRIVER',
    "vehicleId" TEXT NOT NULL,
    "contractId" TEXT,
    "driverId" TEXT,
    "managerId" TEXT,
    "incidentId" TEXT,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "fuelLevelIn" "FuelLevel",
    "fuelLevelOut" "FuelLevel",
    "mileageIn" INTEGER,
    "mileageOut" INTEGER,
    "driverSignedAt" TIMESTAMP(3),
    "managerSignedAt" TIMESTAMP(3),
    "driverNotes" TEXT,
    "managerNotes" TEXT,
    "linkedHandoverInspectionId" TEXT,
    "returnComparisonNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_items" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "InspectionItemStatus" NOT NULL DEFAULT 'OK',
    "comment" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT,
    "entityType" "DocumentEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "alwaysValid" BOOLEAN NOT NULL DEFAULT false,
    "status" "DocumentStatus" NOT NULL DEFAULT 'VALID',
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "reminder30SentAt" TIMESTAMP(3),
    "reminder15SentAt" TIMESTAMP(3),
    "reminder7SentAt" TIMESTAMP(3),
    "reminder1SentAt" TIMESTAMP(3),
    "notifyOwner" BOOLEAN NOT NULL DEFAULT false,
    "expiryNotifiedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "parentDocId" TEXT,
    "uploadedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_repossessions" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "contractId" TEXT,
    "status" "RepossessionStatus" NOT NULL DEFAULT 'PROPOSED',
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "proposedById" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "smValidatedById" TEXT,
    "smValidatedAt" TIMESTAMP(3),
    "adminApprovedById" TEXT,
    "adminApprovedAt" TIMESTAMP(3),
    "repossessionDate" TIMESTAMP(3),
    "postInspectionId" TEXT,
    "vehicleCondition" TEXT,
    "repairCost" DECIMAL(12,2),
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_repossessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_availability_events" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "contractId" TEXT,
    "driverId" TEXT,
    "type" "VehicleAvailabilityEventType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_availability_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "relatedEntityType" "TaskRelatedEntityType",
    "relatedEntityId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "entityType" TEXT,
    "entityId" TEXT,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "fcmSent" BOOLEAN NOT NULL DEFAULT false,
    "fcmMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revoked_tokens" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_settlements" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalRevenue" DECIMAL(12,2) NOT NULL,
    "driverExpenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ownerExpenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "companyExpenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maintenanceCosts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalExpenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grossProfit" DECIMAL(12,2) NOT NULL,
    "mgmtFeeTypeSnapshot" "MgmtFeeType" NOT NULL,
    "mgmtFeeBaseSnapshot" "MgmtFeeBase",
    "mgmtFeePercentageSnapshot" DECIMAL(5,2),
    "mgmtFeeFixedSnapshot" DECIMAL(12,2),
    "managementCommission" DECIMAL(12,2) NOT NULL,
    "ownerAmountDue" DECIMAL(12,2) NOT NULL,
    "ownerAmountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ownerAmountBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentToOwnerAt" TIMESTAMP(3),
    "ownerAcknowledgedAt" TIMESTAMP(3),
    "disputeNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_revenue_lines" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "paymentId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "driverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_revenue_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_expense_lines" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "chargeId" TEXT,
    "maintenanceId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" "ChargeType" NOT NULL,
    "description" TEXT,
    "responsible" "ChargeResponsible" NOT NULL,
    "impactsProfit" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_expense_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_settlement_payments" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_settlement_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "contractId" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "ownerId" TEXT,
    "settlementId" TEXT,
    "entryType" "LedgerEntryType" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "description" TEXT,
    "recordedById" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_score_events" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "impact" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "scoreBefore" DOUBLE PRECISION NOT NULL,
    "scoreAfter" DOUBLE PRECISION NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_score_events" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "impact" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "scoreBefore" DOUBLE PRECISION NOT NULL,
    "scoreAfter" DOUBLE PRECISION NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_portal_visibility_settings" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "showDailyEntries" BOOLEAN NOT NULL DEFAULT false,
    "showDriverPayments" BOOLEAN NOT NULL DEFAULT false,
    "showCharges" BOOLEAN NOT NULL DEFAULT false,
    "showGrossRevenue" BOOLEAN NOT NULL DEFAULT false,
    "showDriverName" BOOLEAN NOT NULL DEFAULT true,
    "showVehicleDetails" BOOLEAN NOT NULL DEFAULT true,
    "showGps" BOOLEAN NOT NULL DEFAULT false,
    "showDocuments" BOOLEAN NOT NULL DEFAULT false,
    "showAccidents" BOOLEAN NOT NULL DEFAULT false,
    "showMaintenance" BOOLEAN NOT NULL DEFAULT false,
    "showNotifications" BOOLEAN NOT NULL DEFAULT true,
    "showRoi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_portal_visibility_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_rental_payments" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "expectedAmount" DECIMAL(15,2) NOT NULL,
    "actualAmount" DECIMAL(15,2),
    "status" "RentalPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod",
    "reference" TEXT,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_rental_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "permissions_isActive_idx" ON "permissions"("isActive");

-- CreateIndex
CREATE INDEX "role_permissions_role_idx" ON "role_permissions"("role");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_permissionId_key" ON "role_permissions"("role", "permissionId");

-- CreateIndex
CREATE INDEX "user_permission_overrides_userId_idx" ON "user_permission_overrides"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_permission_overrides_userId_permissionId_key" ON "user_permission_overrides"("userId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "driver_kyc_driverId_key" ON "driver_kyc"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_field_validations_driverId_key" ON "driver_field_validations"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "owners_userId_key" ON "owners"("userId");

-- CreateIndex
CREATE INDEX "owners_type_idx" ON "owners"("type");

-- CreateIndex
CREATE INDEX "owners_status_idx" ON "owners"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plateNumber_key" ON "vehicles"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_currentContractId_key" ON "vehicles"("currentContractId");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "vehicles_ownerId_idx" ON "vehicles"("ownerId");

-- CreateIndex
CREATE INDEX "vehicles_currentManagerId_idx" ON "vehicles"("currentManagerId");

-- CreateIndex
CREATE INDEX "vehicles_currentDriverId_idx" ON "vehicles"("currentDriverId");

-- CreateIndex
CREATE INDEX "vehicle_manager_assignments_vehicleId_isActive_idx" ON "vehicle_manager_assignments"("vehicleId", "isActive");

-- CreateIndex
CREATE INDEX "vehicle_manager_assignments_managerId_idx" ON "vehicle_manager_assignments"("managerId");

-- CreateIndex
CREATE INDEX "vehicle_driver_assignments_vehicleId_isActive_idx" ON "vehicle_driver_assignments"("vehicleId", "isActive");

-- CreateIndex
CREATE INDEX "vehicle_driver_assignments_driverId_idx" ON "vehicle_driver_assignments"("driverId");

-- CreateIndex
CREATE INDEX "vehicle_driver_assignments_contractId_idx" ON "vehicle_driver_assignments"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contractNumber_key" ON "contracts"("contractNumber");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_vehicleId_idx" ON "contracts"("vehicleId");

-- CreateIndex
CREATE INDEX "contracts_driverId_idx" ON "contracts"("driverId");

-- CreateIndex
CREATE INDEX "contracts_type_idx" ON "contracts"("type");

-- CreateIndex
CREATE INDEX "payments_contractId_idx" ON "payments"("contractId");

-- CreateIndex
CREATE INDEX "payments_driverId_idx" ON "payments"("driverId");

-- CreateIndex
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");

-- CreateIndex
CREATE INDEX "daily_entries_contractId_status_idx" ON "daily_entries"("contractId", "status");

-- CreateIndex
CREATE INDEX "daily_entries_date_idx" ON "daily_entries"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_entries_contractId_date_key" ON "daily_entries"("contractId", "date");

-- CreateIndex
CREATE INDEX "charges_vehicleId_idx" ON "charges"("vehicleId");

-- CreateIndex
CREATE INDEX "charges_contractId_idx" ON "charges"("contractId");

-- CreateIndex
CREATE INDEX "charges_status_idx" ON "charges"("status");

-- CreateIndex
CREATE INDEX "charges_type_idx" ON "charges"("type");

-- CreateIndex
CREATE UNIQUE INDEX "deposits_contractId_key" ON "deposits"("contractId");

-- CreateIndex
CREATE INDEX "deposit_transactions_depositId_idx" ON "deposit_transactions"("depositId");

-- CreateIndex
CREATE INDEX "contraventions_vehicleId_idx" ON "contraventions"("vehicleId");

-- CreateIndex
CREATE INDEX "contraventions_driverId_idx" ON "contraventions"("driverId");

-- CreateIndex
CREATE INDEX "contraventions_isPaid_idx" ON "contraventions"("isPaid");

-- CreateIndex
CREATE INDEX "immobilizations_vehicleId_status_idx" ON "immobilizations"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "immobilizations_contractId_idx" ON "immobilizations"("contractId");

-- CreateIndex
CREATE INDEX "special_absences_driverId_idx" ON "special_absences"("driverId");

-- CreateIndex
CREATE INDEX "special_absences_contractId_idx" ON "special_absences"("contractId");

-- CreateIndex
CREATE INDEX "special_absences_status_idx" ON "special_absences"("status");

-- CreateIndex
CREATE INDEX "incidents_vehicleId_idx" ON "incidents"("vehicleId");

-- CreateIndex
CREATE INDEX "incidents_type_status_idx" ON "incidents"("type", "status");

-- CreateIndex
CREATE INDEX "incidents_occurredAt_idx" ON "incidents"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "accident_cases_incidentId_key" ON "accident_cases"("incidentId");

-- CreateIndex
CREATE INDEX "accident_step_history_accidentCaseId_idx" ON "accident_step_history"("accidentCaseId");

-- CreateIndex
CREATE INDEX "accident_expenses_accidentCaseId_idx" ON "accident_expenses"("accidentCaseId");

-- CreateIndex
CREATE INDEX "maintenance_records_vehicleId_idx" ON "maintenance_records"("vehicleId");

-- CreateIndex
CREATE INDEX "maintenance_records_type_status_idx" ON "maintenance_records"("type", "status");

-- CreateIndex
CREATE INDEX "mileage_records_vehicleId_recordedAt_idx" ON "mileage_records"("vehicleId", "recordedAt");

-- CreateIndex
CREATE INDEX "fuel_transactions_vehicleId_idx" ON "fuel_transactions"("vehicleId");

-- CreateIndex
CREATE INDEX "fuel_transactions_contractId_idx" ON "fuel_transactions"("contractId");

-- CreateIndex
CREATE INDEX "fuel_transactions_type_idx" ON "fuel_transactions"("type");

-- CreateIndex
CREATE INDEX "media_assets_entityType_entityId_idx" ON "media_assets"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "media_assets_mediaType_idx" ON "media_assets"("mediaType");

-- CreateIndex
CREATE INDEX "media_assets_hash_idx" ON "media_assets"("hash");

-- CreateIndex
CREATE INDEX "photo_missions_vehicleId_status_idx" ON "photo_missions"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "photo_missions_driverId_status_idx" ON "photo_missions"("driverId", "status");

-- CreateIndex
CREATE INDEX "photo_missions_dueDate_idx" ON "photo_missions"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "photos_mediaAssetId_key" ON "photos"("mediaAssetId");

-- CreateIndex
CREATE INDEX "photos_missionId_idx" ON "photos"("missionId");

-- CreateIndex
CREATE INDEX "photos_inspectionId_idx" ON "photos"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "inspections_linkedHandoverInspectionId_key" ON "inspections"("linkedHandoverInspectionId");

-- CreateIndex
CREATE INDEX "inspections_vehicleId_idx" ON "inspections"("vehicleId");

-- CreateIndex
CREATE INDEX "inspections_contractId_idx" ON "inspections"("contractId");

-- CreateIndex
CREATE INDEX "inspections_type_status_idx" ON "inspections"("type", "status");

-- CreateIndex
CREATE INDEX "inspection_items_inspectionId_idx" ON "inspection_items"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_mediaAssetId_key" ON "documents"("mediaAssetId");

-- CreateIndex
CREATE INDEX "documents_entityType_entityId_idx" ON "documents"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_validUntil_idx" ON "documents"("validUntil");

-- CreateIndex
CREATE INDEX "documents_type_idx" ON "documents"("type");

-- CreateIndex
CREATE INDEX "documents_isLatest_idx" ON "documents"("isLatest");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_repossessions_contractId_key" ON "vehicle_repossessions"("contractId");

-- CreateIndex
CREATE INDEX "vehicle_repossessions_vehicleId_status_idx" ON "vehicle_repossessions"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "vehicle_availability_events_vehicleId_startDate_idx" ON "vehicle_availability_events"("vehicleId", "startDate");

-- CreateIndex
CREATE INDEX "vehicle_availability_events_contractId_idx" ON "vehicle_availability_events"("contractId");

-- CreateIndex
CREATE INDEX "vehicle_availability_events_type_idx" ON "vehicle_availability_events"("type");

-- CreateIndex
CREATE INDEX "tasks_assignedToId_status_idx" ON "tasks"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");

-- CreateIndex
CREATE INDEX "tasks_relatedEntityType_relatedEntityId_idx" ON "tasks"("relatedEntityType", "relatedEntityId");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "revoked_tokens_jti_key" ON "revoked_tokens"("jti");

-- CreateIndex
CREATE INDEX "revoked_tokens_jti_idx" ON "revoked_tokens"("jti");

-- CreateIndex
CREATE INDEX "revoked_tokens_expiresAt_idx" ON "revoked_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "monthly_settlements_ownerId_year_month_idx" ON "monthly_settlements"("ownerId", "year", "month");

-- CreateIndex
CREATE INDEX "monthly_settlements_vehicleId_year_month_idx" ON "monthly_settlements"("vehicleId", "year", "month");

-- CreateIndex
CREATE INDEX "monthly_settlements_status_idx" ON "monthly_settlements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_settlements_contractId_year_month_key" ON "monthly_settlements"("contractId", "year", "month");

-- CreateIndex
CREATE INDEX "settlement_revenue_lines_settlementId_idx" ON "settlement_revenue_lines"("settlementId");

-- CreateIndex
CREATE INDEX "settlement_expense_lines_settlementId_idx" ON "settlement_expense_lines"("settlementId");

-- CreateIndex
CREATE INDEX "owner_settlement_payments_settlementId_idx" ON "owner_settlement_payments"("settlementId");

-- CreateIndex
CREATE INDEX "owner_settlement_payments_ownerId_idx" ON "owner_settlement_payments"("ownerId");

-- CreateIndex
CREATE INDEX "ledger_entries_contractId_idx" ON "ledger_entries"("contractId");

-- CreateIndex
CREATE INDEX "ledger_entries_vehicleId_idx" ON "ledger_entries"("vehicleId");

-- CreateIndex
CREATE INDEX "ledger_entries_ownerId_idx" ON "ledger_entries"("ownerId");

-- CreateIndex
CREATE INDEX "ledger_entries_entryType_idx" ON "ledger_entries"("entryType");

-- CreateIndex
CREATE INDEX "ledger_entries_occurredAt_idx" ON "ledger_entries"("occurredAt");

-- CreateIndex
CREATE INDEX "driver_score_events_driverId_createdAt_idx" ON "driver_score_events"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "vehicle_score_events_vehicleId_createdAt_idx" ON "vehicle_score_events"("vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "owner_portal_visibility_settings_contractId_key" ON "owner_portal_visibility_settings"("contractId");

-- CreateIndex
CREATE INDEX "owner_rental_payments_contractId_idx" ON "owner_rental_payments"("contractId");

-- CreateIndex
CREATE INDEX "owner_rental_payments_ownerId_idx" ON "owner_rental_payments"("ownerId");

-- CreateIndex
CREATE INDEX "owner_rental_payments_status_idx" ON "owner_rental_payments"("status");

-- CreateIndex
CREATE INDEX "owner_rental_payments_periodYear_periodMonth_idx" ON "owner_rental_payments"("periodYear", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "owner_rental_payments_contractId_periodYear_periodMonth_key" ON "owner_rental_payments"("contractId", "periodYear", "periodMonth");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_kyc" ADD CONSTRAINT "driver_kyc_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_field_validations" ADD CONSTRAINT "driver_field_validations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_currentManagerId_fkey" FOREIGN KEY ("currentManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_currentDriverId_fkey" FOREIGN KEY ("currentDriverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_currentContractId_fkey" FOREIGN KEY ("currentContractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_manager_assignments" ADD CONSTRAINT "vehicle_manager_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_manager_assignments" ADD CONSTRAINT "vehicle_manager_assignments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_driver_assignments" ADD CONSTRAINT "vehicle_driver_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_driver_assignments" ADD CONSTRAINT "vehicle_driver_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_driver_assignments" ADD CONSTRAINT "vehicle_driver_assignments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_parentContractId_fkey" FOREIGN KEY ("parentContractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_entries" ADD CONSTRAINT "daily_entries_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_entries" ADD CONSTRAINT "daily_entries_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "deposits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contraventions" ADD CONSTRAINT "contraventions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contraventions" ADD CONSTRAINT "contraventions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immobilizations" ADD CONSTRAINT "immobilizations_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immobilizations" ADD CONSTRAINT "immobilizations_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immobilizations" ADD CONSTRAINT "immobilizations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "immobilizations" ADD CONSTRAINT "immobilizations_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_absences" ADD CONSTRAINT "special_absences_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_absences" ADD CONSTRAINT "special_absences_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_cases" ADD CONSTRAINT "accident_cases_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_cases" ADD CONSTRAINT "accident_cases_declaredById_fkey" FOREIGN KEY ("declaredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_cases" ADD CONSTRAINT "accident_cases_insuranceDocumentId_fkey" FOREIGN KEY ("insuranceDocumentId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_step_history" ADD CONSTRAINT "accident_step_history_accidentCaseId_fkey" FOREIGN KEY ("accidentCaseId") REFERENCES "accident_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_expenses" ADD CONSTRAINT "accident_expenses_accidentCaseId_fkey" FOREIGN KEY ("accidentCaseId") REFERENCES "accident_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mileage_records" ADD CONSTRAINT "mileage_records_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mileage_records" ADD CONSTRAINT "mileage_records_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_discrepancyChargeId_fkey" FOREIGN KEY ("discrepancyChargeId") REFERENCES "charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_transactions" ADD CONSTRAINT "fuel_transactions_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_missions" ADD CONSTRAINT "photo_missions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_missions" ADD CONSTRAINT "photo_missions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "photo_missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_linkedHandoverInspectionId_fkey" FOREIGN KEY ("linkedHandoverInspectionId") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_items" ADD CONSTRAINT "inspection_items_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_parentDocId_fkey" FOREIGN KEY ("parentDocId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_repossessions" ADD CONSTRAINT "vehicle_repossessions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_repossessions" ADD CONSTRAINT "vehicle_repossessions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_availability_events" ADD CONSTRAINT "vehicle_availability_events_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_availability_events" ADD CONSTRAINT "vehicle_availability_events_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_availability_events" ADD CONSTRAINT "vehicle_availability_events_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_settlements" ADD CONSTRAINT "monthly_settlements_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_settlements" ADD CONSTRAINT "monthly_settlements_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_settlements" ADD CONSTRAINT "monthly_settlements_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_revenue_lines" ADD CONSTRAINT "settlement_revenue_lines_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "monthly_settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_revenue_lines" ADD CONSTRAINT "settlement_revenue_lines_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_expense_lines" ADD CONSTRAINT "settlement_expense_lines_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "monthly_settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_expense_lines" ADD CONSTRAINT "settlement_expense_lines_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_expense_lines" ADD CONSTRAINT "settlement_expense_lines_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "maintenance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_settlement_payments" ADD CONSTRAINT "owner_settlement_payments_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "monthly_settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_score_events" ADD CONSTRAINT "driver_score_events_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_score_events" ADD CONSTRAINT "vehicle_score_events_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_portal_visibility_settings" ADD CONSTRAINT "owner_portal_visibility_settings_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_rental_payments" ADD CONSTRAINT "owner_rental_payments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_rental_payments" ADD CONSTRAINT "owner_rental_payments_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_rental_payments" ADD CONSTRAINT "owner_rental_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
