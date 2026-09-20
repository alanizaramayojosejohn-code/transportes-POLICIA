import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MaintenanceOrdersService } from './maintenance-orders.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

const actingUser: AuthenticatedUser = {
  id: 'user-1',
  username: 'mantenimiento.01',
  fullName: 'Usuario de prueba',
  role: 'MANTENIMIENTO',
  personnelId: null,
  managedUnitIds: [],
};

function buildPrismaMock() {
  const mock = {
    vehicle: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    maintenanceOrder: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  return mock as unknown as PrismaService & typeof mock;
}

describe('MaintenanceOrdersService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: MaintenanceOrdersService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new MaintenanceOrdersService(prisma);
  });

  describe('create', () => {
    it('rechaza si el vehículo no existe (RF-3)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);

      await expect(
        service.create(
          {
            vehicleId: 'v1',
            type: 'PREVENTIVE',
            odometer: 45000,
            description: 'Cambio de aceite',
          } as never,
          actingUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea la orden en estado en proceso (RF-1)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.maintenanceOrder.create).mockResolvedValue({
        id: 'o1',
        status: 'IN_PROGRESS',
        totalCost: 0,
      } as never);

      const result = await service.create(
        {
          vehicleId: 'v1',
          type: 'PREVENTIVE',
          odometer: 45000,
          description: 'Cambio de aceite',
        } as never,
        actingUser,
      );

      expect(prisma.maintenanceOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            vehicleId: 'v1',
          }),
        }),
      );
      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('finish', () => {
    it('lanza NotFoundException si la orden no existe', async () => {
      vi.mocked(prisma.maintenanceOrder.findUnique).mockResolvedValue(null);

      await expect(
        service.finish('o1', { totalCost: 850 } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza si la orden ya está cerrada (RF-5)', async () => {
      vi.mocked(prisma.maintenanceOrder.findUnique).mockResolvedValue({
        id: 'o1',
        status: 'COMPLETED',
      } as never);

      await expect(
        service.finish('o1', { totalCost: 850 } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('marca la orden como finalizada con el costo indicado (RF-4)', async () => {
      vi.mocked(prisma.maintenanceOrder.findUnique).mockResolvedValue({
        id: 'o1',
        status: 'IN_PROGRESS',
        invoiceNumber: null,
      } as never);
      vi.mocked(prisma.maintenanceOrder.update).mockResolvedValue({
        id: 'o1',
        status: 'COMPLETED',
        totalCost: 850,
      } as never);

      const result = await service.finish('o1', { totalCost: 850 } as never);

      expect(prisma.maintenanceOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            totalCost: 850,
          }),
        }),
      );
      expect(result.status).toBe('COMPLETED');
    });
  });
});
