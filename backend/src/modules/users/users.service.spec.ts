import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

vi.mock('argon2', () => ({
  hash: vi.fn(async (password: string) => `hashed:${password}`),
}));

function buildPrismaMock() {
  const mock = {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  return mock as unknown as PrismaService & typeof mock;
}

describe('UsersService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: UsersService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new UsersService(prisma);
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el usuario no existe (RF-9 depende de esto)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(service.findOne('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('normaliza el nombre de usuario a minúsculas y guarda sólo el hash (RF-1, RF-3)', async () => {
      vi.mocked(prisma.role.findUnique).mockResolvedValue({
        id: 'r1',
      } as never);
      vi.mocked(prisma.user.create).mockResolvedValue({} as never);

      await service.create({
        username: ' Jperez ',
        password: 'clave1234',
        fullName: 'Juan Pérez',
        roleId: 'r1',
      } as never);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: 'jperez',
            passwordHash: 'hashed:clave1234',
          }),
        }),
      );
      expect(prisma.user.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ password: expect.anything() }),
        }),
      );
    });

    it('rechaza con NotFoundException si el rol no existe (RF-6)', async () => {
      vi.mocked(prisma.role.findUnique).mockResolvedValue(null);

      await expect(
        service.create({
          username: 'jperez',
          password: 'clave1234',
          fullName: 'Juan Pérez',
          roleId: 'rol-inexistente',
        } as never),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('no toca la contraseña cuando no se envía (RF-7)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u1',
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await service.update('u1', { fullName: 'Juan Pérez Gómez' } as never);

      const call = vi.mocked(prisma.user.update).mock.calls[0][0];
      expect(call.data).not.toHaveProperty('passwordHash');
      expect(call.data).toEqual(
        expect.objectContaining({ fullName: 'Juan Pérez Gómez' }),
      );
    });

    it('reemplaza el hash cuando se envía una contraseña nueva (RF-8)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u1',
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await service.update('u1', { password: 'nuevaClave1' } as never);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: 'hashed:nuevaClave1',
          }),
        }),
      );
    });
  });

  describe('deactivate / reactivate', () => {
    it('desactiva marcando isActive en false (RF-9)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u1',
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await service.deactivate('u1');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });

    it('reactiva marcando isActive en true (RF-10)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u1',
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);

      await service.reactivate('u1');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: true } }),
      );
    });
  });
});
