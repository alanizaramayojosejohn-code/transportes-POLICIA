import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OfficersService } from './officers.service.js';

function buildPrismaMock() {
  const mock = {
    officer: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    transportManagerAssignment: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  return mock as unknown as PrismaService & typeof mock;
}

describe('OfficersService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: OfficersService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new OfficersService(prisma);
  });

  describe('create', () => {
    it('normaliza el complemento ausente a cadena vacía (caso límite)', async () => {
      vi.mocked(prisma.officer.create).mockResolvedValue({} as never);

      await service.create({
        ci: '1234567',
        firstName: 'Juan',
        lastName: 'Pérez',
      } as never);

      expect(prisma.officer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ciComplement: '' }),
        }),
      );
    });
  });

  describe('deactivate', () => {
    it('rechaza si es encargado vigente de alguna unidad (RF-16)', async () => {
      vi.mocked(prisma.officer.findUnique).mockResolvedValue({
        id: 'o1',
      } as never);
      vi.mocked(prisma.transportManagerAssignment.findMany).mockResolvedValue([
        { unit: { name: 'UTOP' } },
      ] as never);

      await expect(service.deactivate('o1')).rejects.toThrow(ConflictException);
    });

    it('desactiva cuando no es encargado vigente de nadie', async () => {
      vi.mocked(prisma.officer.findUnique).mockResolvedValue({
        id: 'o1',
      } as never);
      vi.mocked(prisma.transportManagerAssignment.findMany).mockResolvedValue(
        [],
      );
      vi.mocked(prisma.officer.update).mockResolvedValue({} as never);

      await service.deactivate('o1');

      expect(prisma.officer.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });
  });
});
