import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { VehiclePhotosService } from './vehicle-photos.service.js';

function buildPrismaMock() {
  const mock = {
    vehicle: { findUnique: vi.fn() },
    vehiclePhoto: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  };
  return mock as unknown as PrismaService & typeof mock;
}

describe('VehiclePhotosService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: VehiclePhotosService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new VehiclePhotosService(prisma);
  });

  describe('set', () => {
    it('rechaza si el vehículo no existe', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);

      await expect(
        service.set({
          vehicleId: 'v1',
          slotKey: 'frontal',
          dataUrl: 'data:image/jpeg;base64,AAAA',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('hace upsert por (vehicleId, slotKey)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.vehiclePhoto.upsert).mockResolvedValue({} as never);

      await service.set({
        vehicleId: 'v1',
        slotKey: 'frontal',
        dataUrl: 'data:image/jpeg;base64,AAAA',
      });

      expect(prisma.vehiclePhoto.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vehicleId_slotKey: { vehicleId: 'v1', slotKey: 'frontal' } },
        }),
      );
    });
  });

  describe('remove', () => {
    it('devuelve true si borró alguna fila', async () => {
      vi.mocked(prisma.vehiclePhoto.deleteMany).mockResolvedValue({
        count: 1,
      } as never);

      await expect(service.remove('v1', 'frontal')).resolves.toBe(true);
    });

    it('devuelve false si no había foto en ese slot', async () => {
      vi.mocked(prisma.vehiclePhoto.deleteMany).mockResolvedValue({
        count: 0,
      } as never);

      await expect(service.remove('v1', 'frontal')).resolves.toBe(false);
    });
  });
});
