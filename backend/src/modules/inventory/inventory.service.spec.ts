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
    stockMovement: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    vehicle: { findUnique: vi.fn() },
    maintenanceOrder: { findUnique: vi.fn() },
    procedureType: { findMany: vi.fn() },
    procedureChecklistItem: { createMany: vi.fn() },
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

    it('rechaza una salida hacia una orden de mantenimiento inexistente (spec 016, RF-11)', async () => {
      vi.mocked(prisma.sparePart.findUnique).mockResolvedValue({
        id: 'p1',
        isActive: true,
        currentStock: 10,
        unit: 'unidad',
      } as never);
      vi.mocked(prisma.maintenanceOrder.findUnique).mockResolvedValue(null);

      await expect(
        service.registerMovement(
          {
            sparePartId: 'p1',
            type: 'OUT',
            quantity: 2,
            maintenanceOrderId: 'orden-inexistente',
          } as never,
          actingUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('vincula el checklist al movimiento y a la orden relacionada en una salida (spec 016, RF-11)', async () => {
      vi.mocked(prisma.sparePart.findUnique).mockResolvedValue({
        id: 'p1',
        isActive: true,
        currentStock: 10,
        unit: 'unidad',
      } as never);
      vi.mocked(prisma.maintenanceOrder.findUnique).mockResolvedValue({
        id: 'o1',
      } as never);
      vi.mocked(prisma.stockMovement.create).mockResolvedValue({
        id: 'm1',
        balanceAfter: 8,
      } as never);
      vi.mocked(prisma.procedureType.findMany).mockResolvedValue([
        { id: 't1' },
      ] as never);

      await service.registerMovement(
        {
          sparePartId: 'p1',
          type: 'OUT',
          quantity: 2,
          maintenanceOrderId: 'o1',
          checklistItems: [{ procedureTypeId: 't1', completed: true }],
        } as never,
        actingUser,
      );

      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ maintenanceOrderId: 'o1' }),
        }),
      );
      expect(prisma.procedureChecklistItem.createMany).toHaveBeenCalledWith({
        data: [
          {
            procedureTypeId: 't1',
            completed: true,
            documentCode: undefined,
            stockMovementId: 'm1',
            maintenanceOrderId: 'o1',
          },
        ],
      });
    });

    it('vincula el checklist sólo al movimiento cuando no hay orden relacionada (spec 016, RF-12)', async () => {
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
      vi.mocked(prisma.procedureType.findMany).mockResolvedValue([
        { id: 't1' },
      ] as never);

      await service.registerMovement(
        {
          sparePartId: 'p1',
          type: 'OUT',
          quantity: 2,
          checklistItems: [{ procedureTypeId: 't1' }],
        } as never,
        actingUser,
      );

      expect(prisma.procedureChecklistItem.createMany).toHaveBeenCalledWith({
        data: [
          {
            procedureTypeId: 't1',
            completed: false,
            documentCode: undefined,
            stockMovementId: 'm1',
          },
        ],
      });
    });
  });

  describe('findAllMovements', () => {
    it('aplica los filtros de artículo, vehículo, tipo y fecha (spec 018)', async () => {
      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([]);
      vi.mocked(prisma.stockMovement.count).mockResolvedValue(0);

      await service.findAllMovements({
        sparePartId: 'p1',
        vehicleId: 'v1',
        type: 'OUT',
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
      } as never);

      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sparePartId: 'p1',
            vehicleId: 'v1',
            type: 'OUT',
            createdAt: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-01-31'),
            },
          },
        }),
      );
    });

    it('convierte los Decimal (cantidad, costo, saldo) a number', async () => {
      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue([
        {
          id: 'm1',
          quantity: { toString: () => '4' },
          unitCost: { toString: () => '12.5' },
          balanceAfter: { toString: () => '20' },
        } as never,
      ]);
      vi.mocked(prisma.stockMovement.count).mockResolvedValue(1);

      const result = await service.findAllMovements({} as never);

      expect(result.items[0].quantity).toBe(4);
      expect(result.items[0].unitCost).toBe(12.5);
      expect(result.items[0].balanceAfter).toBe(20);
      expect(result.total).toBe(1);
    });
  });
});
