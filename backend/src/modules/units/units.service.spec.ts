import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UnitsService } from './units.service.js';

function buildPrismaMock() {
  const mock = {
    unit: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    personnel: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transportManagerAssignment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    unitAssignment: {
      count: vi.fn().mockResolvedValue(0),
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

describe('UnitsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: UnitsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new UnitsService(prisma);
  });

  describe('create', () => {
    it('normaliza el código (mayúsculas, sin espacios ni guiones, RF-12)', async () => {
      vi.mocked(prisma.unit.create).mockResolvedValue({} as never);

      await service.create({ code: 'epi-3', name: 'EPI 3' } as never);

      expect(prisma.unit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'EPI3' }),
        }),
      );
    });
  });

  describe('deactivate', () => {
    it('rechaza si tiene sub-unidades activas (RF-07)', async () => {
      vi.mocked(prisma.unit.findUnique).mockResolvedValue({
        id: 'u1',
        parentId: null,
      } as never);
      vi.mocked(prisma.unit.findMany).mockResolvedValue([
        { name: 'Sub 1' },
      ] as never);

      await expect(service.deactivate('u1')).rejects.toThrow(ConflictException);
    });

    it('rechaza si tiene vehículos con asignación vigente (spec 003, RF-17)', async () => {
      vi.mocked(prisma.unit.findUnique).mockResolvedValue({
        id: 'u1',
        parentId: null,
      } as never);
      vi.mocked(prisma.unit.findMany).mockResolvedValue([]);
      vi.mocked(prisma.unitAssignment.count).mockResolvedValue(2 as never);

      await expect(service.deactivate('u1')).rejects.toThrow(ConflictException);
    });

    it('cierra la designación vigente al dar de baja (RF-06)', async () => {
      vi.mocked(prisma.unit.findUnique).mockResolvedValue({
        id: 'u1',
        parentId: null,
      } as never);
      vi.mocked(prisma.unit.findMany).mockResolvedValue([]);
      vi.mocked(prisma.unit.update).mockResolvedValue({} as never);

      await service.deactivate('u1');

      expect(prisma.transportManagerAssignment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { unitId: 'u1', endDate: null },
        }),
      );
      expect(prisma.unit.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });
  });

  describe('reactivate', () => {
    it('rechaza si la unidad superior está inactiva (RF-09)', async () => {
      vi.mocked(prisma.unit.findUnique)
        .mockResolvedValueOnce({ id: 'u2', parentId: 'u1' } as never)
        .mockResolvedValueOnce({ id: 'u1', isActive: false } as never);

      await expect(service.reactivate('u2')).rejects.toThrow(ConflictException);
    });

    it('reactiva sin restaurar ningún encargado (RF-08)', async () => {
      vi.mocked(prisma.unit.findUnique).mockResolvedValueOnce({
        id: 'u1',
        parentId: null,
      } as never);
      vi.mocked(prisma.unit.update).mockResolvedValue({} as never);

      await service.reactivate('u1');

      expect(prisma.unit.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: true } }),
      );
      expect(prisma.transportManagerAssignment.create).not.toHaveBeenCalled();
    });
  });

  describe('assignTransportManager', () => {
    it('rechaza si la unidad está inactiva (RF-22)', async () => {
      vi.mocked(prisma.unit.findUnique).mockResolvedValue({
        id: 'u1',
        isActive: false,
      } as never);

      await expect(
        service.assignTransportManager({
          unitId: 'u1',
          officerId: 'o1',
          startDate: '2026-01-01',
        } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si el personal está inactivo (RF-22)', async () => {
      vi.mocked(prisma.unit.findUnique).mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as never);
      vi.mocked(prisma.personnel.findUnique).mockResolvedValue({
        id: 'o1',
        isActive: false,
      } as never);

      await expect(
        service.assignTransportManager({
          unitId: 'u1',
          officerId: 'o1',
          startDate: '2026-01-01',
        } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza fecha de inicio futura (RF-21)', async () => {
      vi.mocked(prisma.unit.findUnique).mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as never);
      vi.mocked(prisma.personnel.findUnique).mockResolvedValue({
        id: 'o1',
        isActive: true,
      } as never);

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await expect(
        service.assignTransportManager({
          unitId: 'u1',
          officerId: 'o1',
          startDate: futureDate.toISOString(),
        } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('cierra la designación vigente y crea la nueva (RF-19)', async () => {
      vi.mocked(prisma.unit.findUnique).mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as never);
      vi.mocked(prisma.personnel.findUnique).mockResolvedValue({
        id: 'o2',
        isActive: true,
      } as never);
      vi.mocked(prisma.transportManagerAssignment.findFirst).mockResolvedValue({
        id: 'a1',
        startDate: new Date('2026-01-01'),
      } as never);
      vi.mocked(prisma.transportManagerAssignment.create).mockResolvedValue(
        {} as never,
      );

      await service.assignTransportManager({
        unitId: 'u1',
        officerId: 'o2',
        startDate: '2026-02-01',
      } as never);

      expect(prisma.transportManagerAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a1' },
          data: { endDate: new Date('2026-02-01') },
        }),
      );
      expect(prisma.transportManagerAssignment.create).toHaveBeenCalled();
    });

    it('rechaza fecha de inicio anterior a la vigente (RF-20)', async () => {
      vi.mocked(prisma.unit.findUnique).mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as never);
      vi.mocked(prisma.personnel.findUnique).mockResolvedValue({
        id: 'o2',
        isActive: true,
      } as never);
      vi.mocked(prisma.transportManagerAssignment.findFirst).mockResolvedValue({
        id: 'a1',
        startDate: new Date('2026-02-01'),
      } as never);

      await expect(
        service.assignTransportManager({
          unitId: 'u1',
          officerId: 'o2',
          startDate: '2026-01-01',
        } as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('closeTransportManagerAssignment', () => {
    it('lanza NotFoundException si no hay designación vigente', async () => {
      vi.mocked(prisma.transportManagerAssignment.findFirst).mockResolvedValue(
        null,
      );

      await expect(
        service.closeTransportManagerAssignment({
          unitId: 'u1',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza fecha de fin anterior al inicio (RF-24)', async () => {
      vi.mocked(prisma.transportManagerAssignment.findFirst).mockResolvedValue({
        id: 'a1',
        startDate: new Date('2026-02-01'),
      } as never);

      await expect(
        service.closeTransportManagerAssignment({
          unitId: 'u1',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
