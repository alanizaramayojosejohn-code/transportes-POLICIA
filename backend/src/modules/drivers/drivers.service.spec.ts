import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DriversService } from './drivers.service.js';

function buildPrismaMock() {
  const mock = {
    driver: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    unit: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  return mock as unknown as PrismaService & typeof mock;
}

describe('DriversService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: DriversService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new DriversService(prisma);
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el conductor no existe', async () => {
      vi.mocked(prisma.driver.findUnique).mockResolvedValue(null);

      await expect(service.findOne('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('crea el conductor con la fecha de vencimiento parseada (RF-1)', async () => {
      vi.mocked(prisma.driver.create).mockResolvedValue({} as never);

      await service.create({
        firstName: 'Juan',
        lastName: 'Pérez',
        ci: '1234567',
        licenseNumber: 'LIC-001',
        licenseCategory: 'B',
        licenseExpiresAt: '2027-01-01',
      } as never);

      expect(prisma.driver.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ci: '1234567',
            licenseExpiresAt: new Date('2027-01-01'),
          }),
        }),
      );
    });

    it('rechaza con NotFoundException si la unidad no existe (RF-4)', async () => {
      vi.mocked(prisma.unit.findUnique).mockResolvedValue(null);

      await expect(
        service.create({
          firstName: 'Juan',
          lastName: 'Pérez',
          ci: '1234567',
          licenseNumber: 'LIC-001',
          licenseCategory: 'B',
          licenseExpiresAt: '2027-01-01',
          unitId: 'unidad-inexistente',
        } as never),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.driver.create).not.toHaveBeenCalled();
    });
  });

  describe('deactivate / reactivate', () => {
    it('desactiva marcando isActive en false (RF-6)', async () => {
      vi.mocked(prisma.driver.findUnique).mockResolvedValue({
        id: 'd1',
      } as never);
      vi.mocked(prisma.driver.update).mockResolvedValue({} as never);

      await service.deactivate('d1');

      expect(prisma.driver.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });

    it('reactiva marcando isActive en true (RF-7)', async () => {
      vi.mocked(prisma.driver.findUnique).mockResolvedValue({
        id: 'd1',
      } as never);
      vi.mocked(prisma.driver.update).mockResolvedValue({} as never);

      await service.reactivate('d1');

      expect(prisma.driver.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: true } }),
      );
    });
  });
});
