import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { PersonnelService } from '../personnel/personnel.service.js';
import { UnitAssignmentsService } from '../unit-assignments/unit-assignments.service.js';
import { VehicleDriverAssignmentsService } from './vehicle-driver-assignments.service.js';

function buildPrismaMock() {
  const mock = {
    vehicleDriverAssignment: {
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

describe('VehicleDriverAssignmentsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let vehiclesService: { findOne: ReturnType<typeof vi.fn> };
  let personnelService: { findOne: ReturnType<typeof vi.fn> };
  let unitAssignmentsService: {
    getCurrentForVehicle: ReturnType<typeof vi.fn>;
  };
  let service: VehicleDriverAssignmentsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    vehiclesService = { findOne: vi.fn() };
    personnelService = { findOne: vi.fn() };
    unitAssignmentsService = { getCurrentForVehicle: vi.fn() };
    service = new VehicleDriverAssignmentsService(
      prisma,
      vehiclesService as unknown as VehiclesService,
      personnelService as unknown as PersonnelService,
      unitAssignmentsService as unknown as UnitAssignmentsService,
    );
  });

  describe('assign', () => {
    it('rechaza si el vehículo está inactivo (RF-2)', async () => {
      vehiclesService.findOne.mockResolvedValue({ id: 'v1', isActive: false });

      await expect(
        service.assign({
          vehicleId: 'v1',
          driverId: 'd1',
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si el conductor está inactivo (RF-2)', async () => {
      vehiclesService.findOne.mockResolvedValue({ id: 'v1', isActive: true });
      personnelService.findOne.mockResolvedValue({
        id: 'd1',
        isActive: false,
        isDriver: true,
      });

      await expect(
        service.assign({
          vehicleId: 'v1',
          driverId: 'd1',
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si la persona no tiene el rol de conductor (RF-3)', async () => {
      vehiclesService.findOne.mockResolvedValue({ id: 'v1', isActive: true });
      personnelService.findOne.mockResolvedValue({
        id: 'd1',
        isActive: true,
        isDriver: false,
      });

      await expect(
        service.assign({
          vehicleId: 'v1',
          driverId: 'd1',
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza fecha de inicio futura (RF-6)', async () => {
      vehiclesService.findOne.mockResolvedValue({ id: 'v1', isActive: true });
      personnelService.findOne.mockResolvedValue({
        id: 'd1',
        isActive: true,
        isDriver: true,
      });
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);

      await expect(
        service.assign({
          vehicleId: 'v1',
          driverId: 'd1',
          startDate: future.toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si el conductor ya está a cargo de otro vehículo (RF-5)', async () => {
      vehiclesService.findOne
        .mockResolvedValueOnce({ id: 'v2', isActive: true })
        .mockResolvedValueOnce({ id: 'v1', plate: 'ABC-123' });
      personnelService.findOne.mockResolvedValue({
        id: 'd1',
        isActive: true,
        isDriver: true,
      });
      vi.mocked(prisma.vehicleDriverAssignment.findFirst)
        .mockResolvedValueOnce(null) // getCurrentForVehicle(v2)
        .mockResolvedValueOnce({
          id: 'a1',
          vehicleId: 'v1',
          startDate: new Date('2026-01-01'),
        } as never); // getCurrentForDriver(d1)

      await expect(
        service.assign({
          vehicleId: 'v2',
          driverId: 'd1',
          startDate: '2026-02-01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('permite renovar al mismo conductor en el mismo vehículo, cerrando el anterior', async () => {
      vehiclesService.findOne.mockResolvedValue({ id: 'v1', isActive: true });
      personnelService.findOne.mockResolvedValue({
        id: 'd1',
        isActive: true,
        isDriver: true,
      });
      const current = {
        id: 'a1',
        vehicleId: 'v1',
        driverId: 'd1',
        startDate: new Date('2026-01-01'),
      };
      vi.mocked(prisma.vehicleDriverAssignment.findFirst)
        .mockResolvedValueOnce(current as never) // getCurrentForVehicle
        .mockResolvedValueOnce(current as never); // getCurrentForDriver
      vi.mocked(prisma.vehicleDriverAssignment.create).mockResolvedValue(
        {} as never,
      );

      await service.assign({
        vehicleId: 'v1',
        driverId: 'd1',
        startDate: '2026-02-01',
      });

      expect(prisma.vehicleDriverAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a1' },
          data: { endDate: new Date('2026-02-01') },
        }),
      );
      expect(prisma.vehicleDriverAssignment.create).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('lanza NotFoundException si no hay encargo vigente', async () => {
      vi.mocked(prisma.vehicleDriverAssignment.findFirst).mockResolvedValue(
        null,
      );

      await expect(
        service.close({ vehicleId: 'v1', endDate: '2026-01-01' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza fecha de fin anterior al inicio (RF-8)', async () => {
      vi.mocked(prisma.vehicleDriverAssignment.findFirst).mockResolvedValue({
        id: 'a1',
        startDate: new Date('2026-02-01'),
      } as never);

      await expect(
        service.close({ vehicleId: 'v1', endDate: '2026-01-01' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
