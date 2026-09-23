import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TripsService } from './trips.service.js';
import type { VehicleDriverAssignmentsService } from '../vehicle-driver-assignments/vehicle-driver-assignments.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/// ADMINISTRADOR (no TRANSPORTES): estas pruebas cubren las reglas
/// generales de negocio (RF-1 a RF-7), no el alcance por unidad — que se
/// cubre aparte en `common/unit-scope.spec.ts`.
const actingUser: AuthenticatedUser = {
  id: 'user-1',
  username: 'admin.pruebas',
  fullName: 'Usuario de prueba',
  role: 'ADMINISTRADOR',
  personnelId: null,
  managedUnitIds: [],
};

function buildPrismaMock() {
  const mock = {
    vehicle: { findUnique: vi.fn() },
    personnel: { findUnique: vi.fn() },
    trip: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    vehicleRequest: { create: vi.fn() },
    assignment: { create: vi.fn(), update: vi.fn() },
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

describe('TripsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: TripsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    const vehicleDriverAssignmentsService = {
      assertDriverOwnsVehicle: vi.fn(),
    } as unknown as VehicleDriverAssignmentsService;
    service = new TripsService(prisma, vehicleDriverAssignmentsService);
  });

  describe('create', () => {
    it('rechaza si el vehículo no existe (RF-4)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);

      await expect(
        service.create(
          {
            vehicleId: 'v1',
            driverId: 'd1',
            destination: 'La Paz',
            departureAt: '2026-09-10T08:00:00.000Z',
            departureOdometer: 100,
          },
          actingUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el conductor está inactivo (RF-4)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.personnel.findUnique).mockResolvedValue({
        id: 'd1',
        isActive: false,
      } as never);

      await expect(
        service.create(
          {
            vehicleId: 'v1',
            driverId: 'd1',
            destination: 'La Paz',
            departureAt: '2026-09-10T08:00:00.000Z',
            departureOdometer: 100,
          },
          actingUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si el vehículo ya tiene un recorrido abierto (RF-3)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.personnel.findUnique).mockResolvedValue({
        id: 'd1',
        isActive: true,
      } as never);
      vi.mocked(prisma.trip.findFirst).mockResolvedValue({
        id: 't-open',
      } as never);

      await expect(
        service.create(
          {
            vehicleId: 'v1',
            driverId: 'd1',
            destination: 'La Paz',
            departureAt: '2026-09-10T08:00:00.000Z',
            departureOdometer: 100,
          },
          actingUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('crea la solicitud, la asignación y el recorrido en cadena (RF-1)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.personnel.findUnique).mockResolvedValue({
        id: 'd1',
        isActive: true,
      } as never);
      vi.mocked(prisma.trip.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.vehicleRequest.create).mockResolvedValue({
        id: 'req-1',
      } as never);
      vi.mocked(prisma.assignment.create).mockResolvedValue({
        id: 'assign-1',
      } as never);

      await service.create(
        {
          vehicleId: 'v1',
          driverId: 'd1',
          destination: 'La Paz',
          departureAt: '2026-09-10T08:00:00.000Z',
          departureOdometer: 100,
        },
        actingUser,
      );

      expect(prisma.vehicleRequest.create).toHaveBeenCalled();
      expect(prisma.assignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requestId: 'req-1',
            vehicleId: 'v1',
            driverId: 'd1',
          }),
        }),
      );
    });
  });

  describe('close', () => {
    it('lanza NotFoundException si el recorrido no existe', async () => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue(null);

      await expect(
        service.close('t1', { returnOdometer: 200 }, actingUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el recorrido ya está cerrado (RF-6)', async () => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue({
        id: 't1',
        returnAt: new Date(),
        departureOdometer: 100,
        assignmentId: 'assign-1',
      } as never);

      await expect(
        service.close('t1', { returnOdometer: 200 }, actingUser),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza kilometraje de llegada menor al de salida (RF-7)', async () => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue({
        id: 't1',
        returnAt: null,
        departureOdometer: 100,
        assignmentId: 'assign-1',
      } as never);

      await expect(
        service.close('t1', { returnOdometer: 50 }, actingUser),
      ).rejects.toThrow(ConflictException);
    });

    it('calcula la distancia y completa la asignación (RF-5)', async () => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValue({
        id: 't1',
        returnAt: null,
        departureOdometer: 100,
        assignmentId: 'assign-1',
      } as never);
      vi.mocked(prisma.trip.update).mockResolvedValue({
        id: 't1',
        distanceKm: 50,
      } as never);

      await service.close('t1', { returnOdometer: 150 }, actingUser);

      expect(prisma.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ distanceKm: 50 }),
        }),
      );
      expect(prisma.assignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'assign-1' },
          data: { status: 'COMPLETED' },
        }),
      );
    });
  });
});
