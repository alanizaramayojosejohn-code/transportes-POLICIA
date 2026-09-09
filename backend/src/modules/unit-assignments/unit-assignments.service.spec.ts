import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { UnitsService } from '../units/units.service.js';
import { UnitAssignmentsService } from './unit-assignments.service.js';

function buildPrismaMock() {
  const mock = {
    unitAssignment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
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

describe('UnitAssignmentsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let vehiclesService: { findOne: ReturnType<typeof vi.fn> };
  let unitsService: { findOne: ReturnType<typeof vi.fn> };
  let service: UnitAssignmentsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    vehiclesService = { findOne: vi.fn() };
    unitsService = { findOne: vi.fn() };
    service = new UnitAssignmentsService(
      prisma,
      vehiclesService as unknown as VehiclesService,
      unitsService as unknown as UnitsService,
    );
  });

  describe('create', () => {
    it('rechaza si el vehículo está inactivo (RF-06)', async () => {
      vehiclesService.findOne.mockResolvedValue({ id: 'v1', isActive: false });

      await expect(
        service.create({
          vehicleId: 'v1',
          unitId: 'u1',
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si la unidad está inactiva (RF-06)', async () => {
      vehiclesService.findOne.mockResolvedValue({ id: 'v1', isActive: true });
      unitsService.findOne.mockResolvedValue({ id: 'u1', isActive: false });

      await expect(
        service.create({
          vehicleId: 'v1',
          unitId: 'u1',
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza fecha de inicio futura (RF-05)', async () => {
      vehiclesService.findOne.mockResolvedValue({ id: 'v1', isActive: true });
      unitsService.findOne.mockResolvedValue({ id: 'u1', isActive: true });

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await expect(
        service.create({
          vehicleId: 'v1',
          unitId: 'u1',
          startDate: futureDate.toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si ya está asignado a esa misma unidad (RF-07)', async () => {
      vehiclesService.findOne.mockResolvedValue({ id: 'v1', isActive: true });
      unitsService.findOne.mockResolvedValue({ id: 'u1', isActive: true });
      vi.mocked(prisma.unitAssignment.findFirst).mockResolvedValue({
        id: 'a1',
        unitId: 'u1',
        startDate: new Date('2026-01-01'),
      } as never);

      await expect(
        service.create({
          vehicleId: 'v1',
          unitId: 'u1',
          startDate: '2026-02-01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza fecha de inicio anterior a la vigente (RF-04)', async () => {
      vehiclesService.findOne.mockResolvedValue({ id: 'v1', isActive: true });
      unitsService.findOne.mockResolvedValue({ id: 'u2', isActive: true });
      vi.mocked(prisma.unitAssignment.findFirst).mockResolvedValue({
        id: 'a1',
        unitId: 'u1',
        startDate: new Date('2026-02-01'),
      } as never);

      await expect(
        service.create({
          vehicleId: 'v1',
          unitId: 'u2',
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('cierra la asignación vigente y crea la nueva (RF-03)', async () => {
      vehiclesService.findOne.mockResolvedValue({ id: 'v1', isActive: true });
      unitsService.findOne.mockResolvedValue({ id: 'u2', isActive: true });
      vi.mocked(prisma.unitAssignment.findFirst).mockResolvedValue({
        id: 'a1',
        unitId: 'u1',
        startDate: new Date('2026-01-01'),
      } as never);
      vi.mocked(prisma.unitAssignment.create).mockResolvedValue({} as never);

      await service.create({
        vehicleId: 'v1',
        unitId: 'u2',
        startDate: '2026-02-01',
      });

      expect(prisma.unitAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a1' },
          data: { endDate: new Date('2026-02-01') },
        }),
      );
      expect(prisma.unitAssignment.create).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('lanza NotFoundException si no hay asignación vigente', async () => {
      vi.mocked(prisma.unitAssignment.findFirst).mockResolvedValue(null);

      await expect(
        service.close({ vehicleId: 'v1', endDate: '2026-01-01' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza fecha de fin anterior al inicio (RF-09)', async () => {
      vi.mocked(prisma.unitAssignment.findFirst).mockResolvedValue({
        id: 'a1',
        startDate: new Date('2026-02-01'),
      } as never);

      await expect(
        service.close({ vehicleId: 'v1', endDate: '2026-01-01' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza fecha de fin futura (RF-09)', async () => {
      vi.mocked(prisma.unitAssignment.findFirst).mockResolvedValue({
        id: 'a1',
        startDate: new Date('2020-01-01'),
      } as never);
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);

      await expect(
        service.close({ vehicleId: 'v1', endDate: future.toISOString() }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateNotes', () => {
    it('lanza NotFoundException si no hay asignación vigente', async () => {
      vi.mocked(prisma.unitAssignment.findFirst).mockResolvedValue(null);

      await expect(
        service.updateNotes({ vehicleId: 'v1', reason: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('sólo actualiza motivo/documento/observaciones (RF-10)', async () => {
      vi.mocked(prisma.unitAssignment.findFirst).mockResolvedValue({
        id: 'a1',
      } as never);
      vi.mocked(prisma.unitAssignment.update).mockResolvedValue({} as never);

      await service.updateNotes({
        vehicleId: 'v1',
        reason: 'Reasignación',
        referenceDocument: 'ACT-001',
      });

      expect(prisma.unitAssignment.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: {
          reason: 'Reasignación',
          referenceDocument: 'ACT-001',
          notes: undefined,
        },
      });
    });
  });
});
