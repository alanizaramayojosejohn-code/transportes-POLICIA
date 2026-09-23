import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProceduresService } from './procedures.service.js';

function buildPrismaMock() {
  const mock = {
    procedureType: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    procedureChecklistItem: {
      findMany: vi.fn(),
      count: vi.fn(),
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

describe('ProceduresService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: ProceduresService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ProceduresService(prisma);
  });

  describe('createType', () => {
    it('traduce un choque de unicidad (nombre + acción) a ConflictException (RF-6)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.10.0',
          meta: { target: ['name', 'action'] },
        },
      );
      vi.mocked(prisma.procedureType.create).mockRejectedValue(prismaError);

      await expect(
        service.createType({
          name: 'Solicitud',
          action: 'VEHICLE_REGISTRATION',
        } as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateType', () => {
    it('lanza NotFoundException si el tipo no existe (RF-4)', async () => {
      vi.mocked(prisma.procedureType.findUnique).mockResolvedValue(null);

      await expect(
        service.updateType('inexistente', { name: 'x' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeType', () => {
    it('rechaza eliminar un tipo con ítems de checklist asociados (RF-8)', async () => {
      vi.mocked(prisma.procedureType.findUnique).mockResolvedValue({
        id: 't1',
      } as never);
      vi.mocked(prisma.procedureChecklistItem.count).mockResolvedValue(2);

      await expect(service.removeType('t1')).rejects.toThrow(ConflictException);
      expect(prisma.procedureType.delete).not.toHaveBeenCalled();
    });

    it('elimina un tipo sin ítems asociados (RF-7)', async () => {
      vi.mocked(prisma.procedureType.findUnique).mockResolvedValue({
        id: 't1',
      } as never);
      vi.mocked(prisma.procedureChecklistItem.count).mockResolvedValue(0);

      await expect(service.removeType('t1')).resolves.toBe(true);
      expect(prisma.procedureType.delete).toHaveBeenCalledWith({
        where: { id: 't1' },
      });
    });
  });

  describe('updateItems', () => {
    it('rechaza si algún ítem no pertenece al registro indicado (RF-15)', async () => {
      vi.mocked(prisma.procedureChecklistItem.findMany).mockResolvedValue([
        { id: 'i1' },
      ] as never);

      await expect(
        service.updateItems('vehicleId', 'v1', [
          { id: 'i1', completed: true },
          { id: 'i-ajeno', completed: false },
        ] as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('actualiza sólo completed y documentCode de los ítems existentes (RF-15/RF-16)', async () => {
      vi.mocked(prisma.procedureChecklistItem.findMany)
        .mockResolvedValueOnce([{ id: 'i1' }] as never)
        .mockResolvedValueOnce([
          { id: 'i1', completed: true, documentCode: 'CAJA-3' },
        ] as never);

      await service.updateItems('vehicleId', 'v1', [
        { id: 'i1', completed: true, documentCode: 'CAJA-3' },
      ] as never);

      expect(prisma.procedureChecklistItem.update).toHaveBeenCalledWith({
        where: { id: 'i1' },
        data: { completed: true, documentCode: 'CAJA-3' },
      });
    });
  });
});
