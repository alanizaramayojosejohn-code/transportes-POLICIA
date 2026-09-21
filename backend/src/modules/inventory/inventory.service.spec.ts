import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InventoryService } from './inventory.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

const actingUser: AuthenticatedUser = {
  id: 'user-1',
  username: 'almacen.01',
  fullName: 'Usuario de prueba',
  role: 'ALMACEN',
  personnelId: null,
  managedUnitIds: [],
};

function buildPrismaMock() {
  const mock = {
    sparePartCategory: { findUnique: vi.fn(), findMany: vi.fn() },
    sparePart: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    stockMovement: { create: vi.fn() },
    vehicle: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation((arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof mock) => Promise<unknown>)(mock);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return mock as unknown as PrismaService & typeof mock;
}

describe('InventoryService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: InventoryService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new InventoryService(prisma);
  });

  describe('create', () => {
    it('rechaza si la categoría no existe (RF-2)', async () => {
      vi.mocked(prisma.sparePartCategory.findUnique).mockResolvedValue(null);

      await expect(
        service.create({
          code: 'LUB-001',
          name: 'Aceite 15W40',
          categoryId: 'cat-inexistente',
          unit: 'Galón',
        } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('registerMovement', () => {
    it('rechaza si el artículo no existe (RF-9)', async () => {
      vi.mocked(prisma.sparePart.findUnique).mockResolvedValue(null);

      await expect(
        service.registerMovement(
          { sparePartId: 'p1', type: 'IN', quantity: 10 } as never,
          actingUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el artículo está inactivo (RF-9)', async () => {
      vi.mocked(prisma.sparePart.findUnique).mockResolvedValue({
        id: 'p1',
        isActive: false,
        currentStock: 5,
        unit: 'unidad',
      } as never);

      await expect(
        service.registerMovement(
          { sparePartId: 'p1', type: 'IN', quantity: 10 } as never,
          actingUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza una salida mayor al stock disponible (RF-8)', async () => {
      vi.mocked(prisma.sparePart.findUnique).mockResolvedValue({
        id: 'p1',
        isActive: true,
        currentStock: 3,
        unit: 'unidad',
      } as never);

      await expect(
        service.registerMovement(
          { sparePartId: 'p1', type: 'OUT', quantity: 10 } as never,
          actingUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('suma la cantidad al stock en una entrada (RF-6)', async () => {
      vi.mocked(prisma.sparePart.findUnique).mockResolvedValue({
        id: 'p1',
        isActive: true,
        currentStock: 5,
        unit: 'unidad',
      } as never);
      vi.mocked(prisma.stockMovement.create).mockResolvedValue({
        id: 'm1',
        balanceAfter: 15,
      } as never);

      await service.registerMovement(
        { sparePartId: 'p1', type: 'IN', quantity: 10, unitCost: 3.5 } as never,
        actingUser,
      );

      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ balanceAfter: 15, type: 'IN' }),
        }),
      );
      expect(prisma.sparePart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStock: 15,
            lastUnitCost: 3.5,
          }),
        }),
      );
    });

    it('resta la cantidad al stock en una salida (RF-7)', async () => {
      vi.mocked(prisma.sparePart.findUnique).mockResolvedValue({
        id: 'p1',
        isActive: true,
        currentStock: 10,
        unit: 'unidad',
      } as never);
      vi.mocked(prisma.stockMovement.create).mockResolvedValue({
        id: 'm1',
        balanceAfter: 8,
      } as never);

      await service.registerMovement(
        {
          sparePartId: 'p1',
          type: 'OUT',
          quantity: 2,
          reason: 'Mantenimiento',
        } as never,
        actingUser,
      );

      expect(prisma.sparePart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currentStock: 8 }),
        }),
      );
    });

    it('guarda el lote en una entrada y lo omite en una salida (spec 017, RF-4/RF-5)', async () => {
      vi.mocked(prisma.sparePart.findUnique).mockResolvedValue({
        id: 'p1',
        isActive: true,
        currentStock: 5,
        unit: 'unidad',
      } as never);
      vi.mocked(prisma.stockMovement.create).mockResolvedValue({
        id: 'm1',
        balanceAfter: 15,
      } as never);

      await service.registerMovement(
        {
          sparePartId: 'p1',
          type: 'IN',
          quantity: 10,
          lotNumber: 'LOTE-001',
          lotExpiresAt: '2027-01-01',
        } as never,
        actingUser,
      );

      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lotNumber: 'LOTE-001',
            lotExpiresAt: new Date('2027-01-01'),
          }),
        }),
      );

      vi.mocked(prisma.sparePart.findUnique).mockResolvedValue({
        id: 'p1',
        isActive: true,
        currentStock: 15,
        unit: 'unidad',
      } as never);

      await service.registerMovement(
        {
          sparePartId: 'p1',
          type: 'OUT',
          quantity: 2,
          reason: 'Mantenimiento',
          lotNumber: 'NO-DEBERIA-GUARDARSE',
        } as never,
        actingUser,
      );

      expect(prisma.stockMovement.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ lotNumber: expect.anything() }),
        }),
      );
    });

    it('rechaza una salida hacia un vehículo inexistente (spec 017, RF-7)', async () => {
      vi.mocked(prisma.sparePart.findUnique).mockResolvedValue({
        id: 'p1',
        isActive: true,
        currentStock: 10,
        unit: 'unidad',
      } as never);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);

      await expect(
        service.registerMovement(
          {
            sparePartId: 'p1',
            type: 'OUT',
            quantity: 2,
            reason: 'Mantenimiento',
            vehicleId: 'vehiculo-inexistente',
          } as never,
          actingUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('guarda el vehículo destino en una salida y lo omite en una entrada (spec 017, RF-6/RF-8)', async () => {
      vi.mocked(prisma.sparePart.findUnique).mockResolvedValue({
        id: 'p1',
        isActive: true,
        currentStock: 10,
        unit: 'unidad',
      } as never);
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.stockMovement.create).mockResolvedValue({
        id: 'm1',
        balanceAfter: 8,
      } as never);

      await service.registerMovement(
        {
          sparePartId: 'p1',
          type: 'OUT',
          quantity: 2,
          reason: 'Mantenimiento',
          vehicleId: 'v1',
        } as never,
        actingUser,
      );

      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vehicleId: 'v1' }),
        }),
      );

      vi.mocked(prisma.sparePart.findUnique).mockResolvedValue({
        id: 'p1',
        isActive: true,
        currentStock: 8,
        unit: 'unidad',
      } as never);

      await service.registerMovement(
        {
          sparePartId: 'p1',
          type: 'IN',
          quantity: 5,
          vehicleId: 'v1',
        } as never,
        actingUser,
      );

      expect(prisma.stockMovement.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ vehicleId: expect.anything() }),
        }),
      );
    });
  });
});
