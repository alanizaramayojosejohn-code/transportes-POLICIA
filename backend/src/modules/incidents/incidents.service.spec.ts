import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { IncidentsService } from './incidents.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/// ADMINISTRADOR (no TRANSPORTES): estas pruebas cubren las reglas
/// generales de negocio (RF-1 a RF-4), no el alcance por unidad — que se
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
    vehicle: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    driver: { findUnique: vi.fn() },
    incident: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    $transaction: vi.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  return mock as unknown as PrismaService & typeof mock;
}

describe('IncidentsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let vehiclesService: { registerCondition: ReturnType<typeof vi.fn> };
  let service: IncidentsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    vehiclesService = { registerCondition: vi.fn() };
    service = new IncidentsService(
      prisma,
      vehiclesService as unknown as VehiclesService,
    );
  });

  describe('create', () => {
    it('rechaza si el vehículo no existe (RF-3)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);

      await expect(
        service.create(
          {
            vehicleId: 'v1',
            type: 'ACCIDENTE',
            occurredAt: '2026-09-10T10:00:00.000Z',
            place: 'Av. 6 de Agosto',
            description: 'Colisión leve',
          } as never,
          actingUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea el incidente sin tocar la condición si no se indica estado posterior (RF-1)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.incident.create).mockResolvedValue({
        id: 'i1',
        code: 'INC-1',
      } as never);

      await service.create(
        {
          vehicleId: 'v1',
          type: 'ACCIDENTE',
          occurredAt: '2026-09-10T10:00:00.000Z',
          place: 'Av. 6 de Agosto',
          description: 'Colisión leve',
        } as never,
        actingUser,
      );

      expect(prisma.incident.create).toHaveBeenCalled();
      expect(vehiclesService.registerCondition).not.toHaveBeenCalled();
    });

    it('registra el estado posterior en el historial de condición (RF-4)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
      } as never);
      vi.mocked(prisma.incident.create).mockResolvedValue({
        id: 'i1',
        code: 'INC-1',
      } as never);

      await service.create(
        {
          vehicleId: 'v1',
          type: 'ACCIDENTE',
          occurredAt: '2026-09-10T10:00:00.000Z',
          place: 'Av. 6 de Agosto',
          description: 'Colisión leve',
          postCondition: 'SEPARADO_POR_INCIDENTE',
        } as never,
        actingUser,
      );

      expect(vehiclesService.registerCondition).toHaveBeenCalledWith(
        'v1',
        expect.objectContaining({ code: 'SEPARADO_POR_INCIDENTE' }),
        'ADMINISTRADOR',
      );
    });
  });
});
