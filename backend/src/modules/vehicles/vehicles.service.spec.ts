import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { VehiclesService } from './vehicles.service.js';

function buildPrismaMock() {
  const mock = {
    vehicle: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    vehicleCondition: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    unitAssignment: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // Soporta las dos formas de $transaction que usa el servicio: un arreglo
  // de promesas (findAll) y una función de callback con `tx` (registerCondition).
  mock.$transaction.mockImplementation((arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof mock) => Promise<unknown>)(mock);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return mock as unknown as PrismaService & typeof mock;
}

describe('VehiclesService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: VehiclesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new VehiclesService(prisma);
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el vehículo no existe', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);

      await expect(service.findOne('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve el vehículo cuando existe', async () => {
      const vehicle = { id: 'v1', plate: 'ABC-123' };
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(vehicle as never);

      await expect(service.findOne('v1')).resolves.toEqual(vehicle);
    });
  });

  describe('create', () => {
    it('crea un vehículo mínimo con sólo placa y tipo (RF-01)', async () => {
      vi.mocked(prisma.vehicle.create).mockResolvedValue({
        id: 'v1',
        plate: 'ABC123',
      } as never);

      await service.create({ plate: 'abc-123', type: 'CAMIONETA' } as never);

      expect(prisma.vehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plate: 'ABC123',
            type: 'CAMIONETA',
          }),
        }),
      );
    });

    it('normaliza la placa a mayúsculas y sin espacios (RF-12)', async () => {
      vi.mocked(prisma.vehicle.create).mockResolvedValue({} as never);

      await service.create({
        plate: '  abc 123  ',
        type: 'CAMIONETA',
      } as never);

      expect(prisma.vehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plate: 'ABC123' }),
        }),
      );
    });

    it('traduce un choque de unicidad de placa (P2002) a ConflictException (RF-02)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.10.0', meta: { target: ['plate'] } },
      );
      vi.mocked(prisma.vehicle.create).mockRejectedValue(prismaError);

      await expect(
        service.create({ plate: 'ABC-123', type: 'CAMIONETA' } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('traduce un choque de unicidad de chasis (P2002) a ConflictException (RF-02)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.10.0',
          meta: { target: ['chassisNumber'] },
        },
      );
      vi.mocked(prisma.vehicle.create).mockRejectedValue(prismaError);

      await expect(
        service.create({
          plate: 'ABC-123',
          type: 'CAMIONETA',
          chassisNumber: 'DUP123',
        } as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si el vehículo no existe', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue(null);

      await expect(
        service.update('id-inexistente', { brand: 'Toyota' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('registerCondition', () => {
    it('marca el vehículo inactivo cuando la condición nueva es BAJA (RF-07)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
        isActive: true,
      } as never);
      const changedAt = new Date('2026-01-01T00:00:00.000Z');
      vi.mocked(prisma.vehicleCondition.create).mockResolvedValue({
        id: 'c1',
        code: 'BAJA',
        changedAt,
      } as never);

      await service.registerCondition(
        'v1',
        { code: 'BAJA' } as never,
        'TRANSPORTES',
      );

      expect(prisma.unitAssignment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vehicleId: 'v1', endDate: null },
          data: { endDate: changedAt },
        }),
      );

      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'v1' },
          data: { isActive: false },
        }),
      );
    });

    it('reactiva un vehículo inactivo cuando la condición nueva no es BAJA (RF-08)', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
        isActive: false,
      } as never);
      vi.mocked(prisma.vehicleCondition.create).mockResolvedValue({
        id: 'c1',
        code: 'BUENO',
      } as never);

      await service.registerCondition('v1', { code: 'BUENO' } as never, null);

      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'v1' },
          data: { isActive: true },
        }),
      );
    });

    it('no toca isActive si la condición no cambia el estado', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
        isActive: true,
      } as never);
      vi.mocked(prisma.vehicleCondition.create).mockResolvedValue({
        id: 'c1',
      } as never);

      await service.registerCondition('v1', { code: 'REGULAR' } as never, null);

      expect(prisma.vehicle.update).not.toHaveBeenCalled();
    });

    it('registra el motivo y el rol simulado, aunque el motivo falte', async () => {
      vi.mocked(prisma.vehicle.findUnique).mockResolvedValue({
        id: 'v1',
        isActive: true,
      } as never);
      vi.mocked(prisma.vehicleCondition.create).mockResolvedValue({} as never);

      await service.registerCondition(
        'v1',
        { code: 'REGULAR' } as never,
        'ADMINISTRADOR',
      );

      expect(prisma.vehicleCondition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleId: 'v1',
            code: 'REGULAR',
            reason: undefined,
            registeredByRole: 'ADMINISTRADOR',
          }),
        }),
      );
    });
  });

  describe('getCurrentCondition', () => {
    it('devuelve null cuando no hay historial ("Sin evaluar", RF-13)', async () => {
      vi.mocked(prisma.vehicleCondition.findFirst).mockResolvedValue(null);

      await expect(service.getCurrentCondition('v1')).resolves.toBeNull();
    });
  });
});
