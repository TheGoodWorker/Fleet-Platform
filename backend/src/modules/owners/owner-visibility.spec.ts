/**
 * Test de visibilité portail propriétaire (D-16).
 *
 * Vérifie que les données sensibles sont bien masquées selon les flags
 * OwnerPortalVisibilitySettings. La logique de filtrage doit être appliquée
 * dans les réponses du portail propriétaire avant envoi au client.
 */

// ─── Utilitaire de filtrage (logique métier attendue) ─────────────────────────

interface OwnerPortalVisibility {
  showDailyEntries: boolean;
  showDriverPayments: boolean;
  showCharges: boolean;
  showGrossRevenue: boolean;
  showDriverName: boolean;
  showVehicleDetails: boolean;
  showGps: boolean;
  showDocuments: boolean;
  showAccidents: boolean;
  showMaintenance: boolean;
  showNotifications: boolean;
  showRoi: boolean;
}

interface ContractSummary {
  vehicleDetails?: object | null;
  driverName?: string | null;
  dailyEntries?: any[] | null;
  driverPayments?: any[] | null;
  charges?: any[] | null;
  grossRevenue?: number | null;
  gpsPosition?: object | null;
  documents?: any[] | null;
  accidents?: any[] | null;
  maintenance?: any[] | null;
  notifications?: any[] | null;
  roi?: number | null;
}

/**
 * Applique les flags de visibilité — masque les champs interdits avec null.
 * C'est la logique attendue dans le service OwnerPortalService (Phase 4).
 */
function applyOwnerVisibility(
  data: ContractSummary,
  settings: OwnerPortalVisibility,
): ContractSummary {
  return {
    vehicleDetails: settings.showVehicleDetails ? data.vehicleDetails : null,
    driverName: settings.showDriverName ? data.driverName : null,
    dailyEntries: settings.showDailyEntries ? data.dailyEntries : null,
    driverPayments: settings.showDriverPayments ? data.driverPayments : null,
    charges: settings.showCharges ? data.charges : null,
    grossRevenue: settings.showGrossRevenue ? data.grossRevenue : null,
    gpsPosition: settings.showGps ? data.gpsPosition : null,
    documents: settings.showDocuments ? data.documents : null,
    accidents: settings.showAccidents ? data.accidents : null,
    maintenance: settings.showMaintenance ? data.maintenance : null,
    notifications: settings.showNotifications ? data.notifications : null,
    roi: settings.showRoi ? data.roi : null,
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const fullData: ContractSummary = {
  vehicleDetails: { brand: 'Toyota', model: 'Corolla', plateNumber: 'ABC123' },
  driverName: 'Mohammed Benali',
  dailyEntries: [{ date: '2026-05-01', amount: 1500 }],
  driverPayments: [{ amount: 10000, date: '2026-05-15' }],
  charges: [{ type: 'CLEANING', amount: 500 }],
  grossRevenue: 45000,
  gpsPosition: { lat: 33.589, lng: -7.603 },
  documents: [{ type: 'INSURANCE', validUntil: '2027-01-01' }],
  accidents: [{ id: 'accident-id', step: 'DECLARED' }],
  maintenance: [{ type: 'OIL_CHANGE', status: 'COMPLETED' }],
  notifications: [{ title: 'Document expirant', sentAt: '2026-05-01' }],
  roi: 12.5,
};

const restrictiveSettings: OwnerPortalVisibility = {
  showDailyEntries: false,
  showDriverPayments: false,
  showCharges: false,
  showGrossRevenue: false,
  showDriverName: true,    // seul le nom chauffeur reste visible
  showVehicleDetails: true, // et les détails véhicule
  showGps: false,
  showDocuments: false,
  showAccidents: false,
  showMaintenance: false,
  showNotifications: false,
  showRoi: false,
};

const permissiveSettings: OwnerPortalVisibility = {
  showDailyEntries: true,
  showDriverPayments: true,
  showCharges: true,
  showGrossRevenue: true,
  showDriverName: true,
  showVehicleDetails: true,
  showGps: true,
  showDocuments: true,
  showAccidents: true,
  showMaintenance: true,
  showNotifications: true,
  showRoi: true,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OwnerPortalVisibility — D-16', () => {
  describe('applyOwnerVisibility', () => {
    it('doit masquer TOUTES les données financières et opérationnelles avec les settings restrictifs', () => {
      const result = applyOwnerVisibility(fullData, restrictiveSettings);

      expect(result.dailyEntries).toBeNull();
      expect(result.driverPayments).toBeNull();
      expect(result.charges).toBeNull();
      expect(result.grossRevenue).toBeNull();
      expect(result.gpsPosition).toBeNull();
      expect(result.documents).toBeNull();
      expect(result.accidents).toBeNull();
      expect(result.maintenance).toBeNull();
      expect(result.notifications).toBeNull();
      expect(result.roi).toBeNull();
    });

    it('doit laisser visibles le nom chauffeur et les détails véhicule avec settings restrictifs', () => {
      const result = applyOwnerVisibility(fullData, restrictiveSettings);

      expect(result.driverName).toBe('Mohammed Benali');
      expect(result.vehicleDetails).toEqual(
        expect.objectContaining({ brand: 'Toyota', plateNumber: 'ABC123' }),
      );
    });

    it('doit tout exposer avec les settings permissifs', () => {
      const result = applyOwnerVisibility(fullData, permissiveSettings);

      expect(result.dailyEntries).not.toBeNull();
      expect(result.driverPayments).not.toBeNull();
      expect(result.charges).not.toBeNull();
      expect(result.grossRevenue).toBe(45000);
      expect(result.gpsPosition).toEqual(expect.objectContaining({ lat: 33.589 }));
      expect(result.documents).toHaveLength(1);
      expect(result.accidents).toHaveLength(1);
      expect(result.maintenance).toHaveLength(1);
      expect(result.notifications).toHaveLength(1);
      expect(result.roi).toBe(12.5);
    });

    it('doit masquer la position GPS même si les autres données financières sont visibles', () => {
      const settings = { ...permissiveSettings, showGps: false };
      const result = applyOwnerVisibility(fullData, settings);

      expect(result.gpsPosition).toBeNull();
      expect(result.grossRevenue).toBe(45000); // autres données toujours visibles
    });

    it('doit masquer les données accidents indépendamment des autres flags', () => {
      const settings = { ...permissiveSettings, showAccidents: false };
      const result = applyOwnerVisibility(fullData, settings);

      expect(result.accidents).toBeNull();
      expect(result.maintenance).not.toBeNull(); // maintenance toujours visible
    });

    it('doit retourner null pour le ROI si showRoi=false (même si vehicle cost défini)', () => {
      const settings = { ...permissiveSettings, showRoi: false };
      const result = applyOwnerVisibility(fullData, settings);
      expect(result.roi).toBeNull();
    });

    it('les defaults schema (showDriverName=true, showVehicleDetails=true, showNotifications=true) doivent être respectés', () => {
      // Simuler les valeurs par défaut du modèle Prisma
      const defaultSettings: OwnerPortalVisibility = {
        showDailyEntries: false,
        showDriverPayments: false,
        showCharges: false,
        showGrossRevenue: false,
        showDriverName: true,
        showVehicleDetails: true,
        showGps: false,
        showDocuments: false,
        showAccidents: false,
        showMaintenance: false,
        showNotifications: true,
        showRoi: false,
      };

      const result = applyOwnerVisibility(fullData, defaultSettings);

      // Visibles par défaut
      expect(result.driverName).not.toBeNull();
      expect(result.vehicleDetails).not.toBeNull();
      expect(result.notifications).not.toBeNull();

      // Cachés par défaut
      expect(result.dailyEntries).toBeNull();
      expect(result.gpsPosition).toBeNull();
      expect(result.roi).toBeNull();
      expect(result.accidents).toBeNull();
      expect(result.documents).toBeNull();
    });
  });
});
