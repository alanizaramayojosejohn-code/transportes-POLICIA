import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { VehicleDocumentsService } from './vehicle-documents.service.js';

function buildPrismaMock() {
  const mock = {
    vehicle: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    vehicleDocument: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    $transaction: vi.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  return mock as unknown as PrismaService & typeof mock;
}

describe('VehicleDocumentsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: VehicleDocumentsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new VehicleDocumentsService(prisma);
  });

  describe('create', () => {
    it('rechaza si el vehículo no existe (RF-3)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);

      await expect(
        service.create({
          vehicleId: 'v1',
          type: 'SOAT',
          expiresAt: '2027-01-01',
        } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea el documento con la fecha de vencimiento parseada (RF-1)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.vehicleDocument.create).mockResolvedValue({} as never);

      await service.create({
        vehicleId: 'v1',
        type: 'SOAT',
        documentNumber: 'SOAT-2027-001',
        expiresAt: '2027-01-01',
      } as never);

      expect(prisma.vehicleDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleId: 'v1',
            type: 'SOAT',
            expiresAt: new Date('2027-01-01'),
          }),
        }),
      );
    });
  });
});
