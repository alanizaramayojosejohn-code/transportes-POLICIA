import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FuelRecordsService } from './fuel-records.service.js';
import type { VehicleDriverAssignmentsService } from '../vehicle-driver-assignments/vehicle-driver-assignments.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

const actingUser: AuthenticatedUser = {
  id: 'user-1',
  username: 'combustible.01',
  fullName: 'Usuario de prueba',
  role: 'COMBUSTIBLE',
  personnelId: null,
  managedUnitIds: [],
};

function buildPrismaMock() {
  const mock = {
    vehicle: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    driver: { findUnique: vi.fn() },
    fuelRecord: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    procedureType: {
      findMany: vi.fn(),
    },
    procedureChecklistItem: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // Soporta las dos formas de $transaction: un arreglo de promesas (findAll)
  // y una función de callback con `tx` (create).
  mock.$transaction.mockImplementation((arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof mock) => Promise<unknown>)(mock);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return mock as unknown as PrismaService & typeof mock;
}

describe('FuelRecordsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: FuelRecordsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    const vehicleDriverAssignmentsService = {
      assertDriverOwnsVehicle: vi.fn(),
    } as unknown as VehicleDriverAssignmentsService;
    service = new FuelRecordsService(prisma, vehicleDriverAssignmentsService);
  });

  describe('create', () => {
    it('rechaza si el vehículo no existe (RF-3)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);

      await expect(
        service.create(
          {
            vehicleId: 'v1',
            suppliedAt: '2026-09-10T10:00:00.000Z',
            fuelType: 'DIESEL',
            quantity: 60,
            unitPrice: 3.74,
            odometer: 12000,
          } as never,
          actingUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza kilometraje menor al de la última carga (RF-4)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.fuelRecord.findFirst).mockResolvedValue({
        odometer: 15000,
      } as never);

      await expect(
        service.create(
          {
            vehicleId: 'v1',
            suppliedAt: '2026-09-10T10:00:00.000Z',
            fuelType: 'DIESEL',
            quantity: 60,
            unitPrice: 3.74,
            odometer: 12000,
          } as never,
          actingUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('calcula costo total y deja rendimiento vacío en la primera carga (RF-1, RF-5)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.fuelRecord.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.fuelRecord.create).mockResolvedValue({
        quantity: 60,
        unitPrice: 3.74,
        totalCost: 224.4,
        efficiencyKmPerUnit: null,
      } as never);

      const result = await service.create(
        {
          vehicleId: 'v1',
          suppliedAt: '2026-09-10T10:00:00.000Z',
          fuelType: 'DIESEL',
          quantity: 60,
          unitPrice: 3.74,
          odometer: 12000,
        } as never,
        actingUser,
      );

      expect(prisma.fuelRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalCost: 224.4,
            efficiencyKmPerUnit: undefined,
          }),
        }),
      );
      expect(result.efficiencyKmPerUnit).toBeNull();
    });

    it('calcula el rendimiento contra la carga anterior (RF-5)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.fuelRecord.findFirst).mockResolvedValue({
        odometer: 12000,
      } as never);
      vi.mocked(prisma.fuelRecord.create).mockResolvedValue({
        quantity: 50,
        unitPrice: 3.74,
        totalCost: 187,
        efficiencyKmPerUnit: 10,
      } as never);

      await service.create(
        {
          vehicleId: 'v1',
          suppliedAt: '2026-09-10T10:00:00.000Z',
          fuelType: 'DIESEL',
          quantity: 50,
          unitPrice: 3.74,
          odometer: 12500,
        } as never,
        actingUser,
      );

      expect(prisma.fuelRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ efficiencyKmPerUnit: 10 }),
        }),
      );
    });

    it('guarda el checklist de trámites junto con el abastecimiento (spec 016, RF-9/RF-10)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.fuelRecord.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.fuelRecord.create).mockResolvedValue({
        id: 'f1',
        quantity: 60,
        unitPrice: 3.74,
        totalCost: 224.4,
        efficiencyKmPerUnit: null,
      } as never);
      vi.mocked(prisma.procedureType.findMany).mockResolvedValue([
        { id: 't1' },
      ] as never);

      await service.create(
        {
          vehicleId: 'v1',
          suppliedAt: '2026-09-10T10:00:00.000Z',
          fuelType: 'DIESEL',
          quantity: 60,
          unitPrice: 3.74,
          odometer: 12000,
          checklistItems: [{ procedureTypeId: 't1', completed: false }],
        } as never,
        actingUser,
      );

      expect(prisma.procedureChecklistItem.createMany).toHaveBeenCalledWith({
        data: [
          {
            procedureTypeId: 't1',
            completed: false,
            documentCode: undefined,
            fuelRecordId: 'f1',
          },
        ],
      });
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el registro no existe', async () => {
      vi.mocked(prisma.fuelRecord.findUnique).mockResolvedValue(null);

      await expect(service.findOne('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
