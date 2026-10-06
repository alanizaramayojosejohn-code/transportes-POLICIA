import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PersonnelService } from './personnel.service.js';

function buildPrismaMock() {
  const mock = {
    personnel: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    unit: {
      findUnique: vi.fn(),
    },
    transportManagerAssignment: {
      findMany: vi.fn(),
    },
    vehicleDriverAssignment: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  return mock as unknown as PrismaService & typeof mock;
}

describe('PersonnelService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: PersonnelService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new PersonnelService(prisma);
  });

  describe('create', () => {
    it('normaliza el complemento ausente a cadena vacía (caso límite)', async () => {
      vi.mocked(prisma.personnel.create).mockResolvedValue({} as never);

      await service.create({
        ci: '1234567',
        firstName: 'Juan',
        lastName: 'Pérez',
        isOfficer: true,
      } as never);

      expect(prisma.personnel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ciComplement: '' }),
        }),
      );
    });

    it('rechaza si no se marca ningún rol', async () => {
      await expect(
        service.create({
          ci: '1234567',
          firstName: 'Juan',
          lastName: 'Pérez',
        } as never),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.personnel.create).not.toHaveBeenCalled();
    });

    it('rechaza si isDriver es verdadero sin licencia completa', async () => {
      await expect(
        service.create({
          ci: '1234567',
          firstName: 'Juan',
          lastName: 'Pérez',
          isDriver: true,
        } as never),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.personnel.create).not.toHaveBeenCalled();
    });

    it('crea el conductor con la fecha de vencimiento parseada cuando isDriver', async () => {
      vi.mocked(prisma.personnel.create).mockResolvedValue({} as never);

      await service.create({
        ci: '1234567',
        firstName: 'Juan',
        lastName: 'Pérez',
        isDriver: true,
        licenseNumber: 'LIC-001',
        licenseCategory: 'B',
        licenseExpiresAt: '2027-01-01',
      } as never);

      expect(prisma.personnel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ci: '1234567',
            licenseExpiresAt: new Date('2027-01-01'),
          }),
        }),
      );
    });

    it('rechaza con NotFoundException si la unidad no existe', async () => {
      vi.mocked(prisma.unit.findUnique).mockResolvedValue(null);

      await expect(
        service.create({
          ci: '1234567',
          firstName: 'Juan',
          lastName: 'Pérez',
          isOfficer: true,
          unitId: 'unidad-inexistente',
        } as never),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.personnel.create).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('rechaza si es encargado vigente de alguna unidad (RF-16 spec 002)', async () => {
      vi.mocked(prisma.personnel.findUnique).mockResolvedValue({
        id: 'p1',
      } as never);
      vi.mocked(prisma.transportManagerAssignment.findMany).mockResolvedValue([
        { unit: { name: 'UTOP' } },
      ] as never);

      await expect(service.deactivate('p1')).rejects.toThrow(ConflictException);
    });

    it('desactiva cuando no es encargado vigente de nadie', async () => {
      vi.mocked(prisma.personnel.findUnique).mockResolvedValue({
        id: 'p1',
      } as never);
      vi.mocked(prisma.transportManagerAssignment.findMany).mockResolvedValue(
        [],
      );
      vi.mocked(prisma.personnel.update).mockResolvedValue({} as never);

      await service.deactivate('p1');

      expect(prisma.personnel.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });
  });

  describe('reactivate', () => {
    it('reactiva marcando isActive en true (RF-7 spec 005)', async () => {
      vi.mocked(prisma.personnel.findUnique).mockResolvedValue({
        id: 'p1',
      } as never);
      vi.mocked(prisma.personnel.update).mockResolvedValue({} as never);

      await service.reactivate('p1');

      expect(prisma.personnel.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: true } }),
      );
    });
  });
});
