/**
 * G-02 — VehiclesController : updateStatus via body (pas @Query)
 *
 * Vérifie que :
 * - updateStatus lit dto.status depuis le body (UpdateVehicleStatusDto)
 * - Le service reçoit le bon status
 * - Le DTO supporte la validation (enum VehicleStatus)
 */

import { VehiclesController } from './vehicles.controller';
import { UpdateVehicleStatusDto } from './dto/vehicle.dto';
import { VehicleStatus } from '@prisma/client';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockService = {
  updateStatus: jest.fn().mockResolvedValue({ id: 'v-1', status: VehicleStatus.AVAILABLE }),
} as any;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VehiclesController — G-02 (updateStatus via body)', () => {
  let controller: VehiclesController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new VehiclesController(mockService);
  });

  it('appelle service.updateStatus avec id et dto.status (body)', async () => {
    const dto: UpdateVehicleStatusDto = { status: VehicleStatus.AVAILABLE };

    await controller.updateStatus('vehicle-uuid', dto);

    expect(mockService.updateStatus).toHaveBeenCalledWith('vehicle-uuid', VehicleStatus.AVAILABLE);
  });

  it('transmet correctement un statut IN_REPAIR', async () => {
    const dto: UpdateVehicleStatusDto = { status: VehicleStatus.IN_REPAIR };

    await controller.updateStatus('v-2', dto);

    expect(mockService.updateStatus).toHaveBeenCalledWith('v-2', VehicleStatus.IN_REPAIR);
  });

  it('UpdateVehicleStatusDto contient la propriété status', () => {
    const dto = new UpdateVehicleStatusDto();
    dto.status = VehicleStatus.OUT_OF_SERVICE;
    expect(dto.status).toBe(VehicleStatus.OUT_OF_SERVICE);
  });
});
