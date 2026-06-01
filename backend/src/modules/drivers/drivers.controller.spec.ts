/**
 * G-02 — DriversController : updateStatus via body (pas @Query)
 *
 * Vérifie que :
 * - updateStatus lit dto.status depuis le body (UpdateDriverStatusDto)
 * - Le service reçoit le bon status
 * - Le DTO supporte la validation (enum DriverStatus)
 */

import { DriversController } from './drivers.controller';
import { UpdateDriverStatusDto } from './dto/driver.dto';
import { DriverStatus } from '@prisma/client';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockService = {
  updateStatus: jest.fn().mockResolvedValue({ id: 'd-1', status: DriverStatus.ACTIVE }),
} as any;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DriversController — G-02 (updateStatus via body)', () => {
  let controller: DriversController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new DriversController(mockService);
  });

  it('appelle service.updateStatus avec id et dto.status (body)', async () => {
    const dto: UpdateDriverStatusDto = { status: DriverStatus.ACTIVE };

    await controller.updateStatus('driver-uuid', dto);

    expect(mockService.updateStatus).toHaveBeenCalledWith('driver-uuid', DriverStatus.ACTIVE);
  });

  it('transmet correctement un statut SUSPENDED', async () => {
    const dto: UpdateDriverStatusDto = { status: DriverStatus.SUSPENDED };

    await controller.updateStatus('d-2', dto);

    expect(mockService.updateStatus).toHaveBeenCalledWith('d-2', DriverStatus.SUSPENDED);
  });

  it('UpdateDriverStatusDto contient la propriété status', () => {
    const dto = new UpdateDriverStatusDto();
    dto.status = DriverStatus.APPROVED;
    expect(dto.status).toBe(DriverStatus.APPROVED);
  });
});
