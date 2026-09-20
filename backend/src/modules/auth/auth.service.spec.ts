import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verify } from 'argon2';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

vi.mock('argon2', () => ({
  verify: vi.fn(),
}));

function buildPrismaMock() {
  const mock = {
    user: { findUnique: vi.fn(), update: vi.fn() },
  };
  return mock as unknown as PrismaService & typeof mock;
}

function buildJwtServiceMock() {
  return {
    signAsync: vi.fn(async () => 'signed-jwt'),
  } as unknown as JwtService;
}

const activeUser = {
  id: 'user-1',
  username: 'jperez',
  passwordHash: 'hash',
  fullName: 'Juan Pérez',
  isActive: true,
  role: { code: 'TRANSPORTES', name: 'Área de Transportes' },
};

describe('AuthService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let jwtService: JwtService;
  let service: AuthService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    jwtService = buildJwtServiceMock();
    service = new AuthService(prisma, jwtService);
    vi.mocked(verify).mockReset();
  });

  describe('login', () => {
    it('rechaza si el usuario no existe (RF-2)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        service.login({ username: 'nadie', password: 'Temporal2026' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(verify).not.toHaveBeenCalled();
    });

    it('rechaza si la cuenta está inactiva sin revelarlo (RF-2)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...activeUser,
        isActive: false,
      } as never);

      await expect(
        service.login({ username: 'jperez', password: 'Temporal2026' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(verify).not.toHaveBeenCalled();
    });

    it('rechaza si la contraseña no coincide (RF-2)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(activeUser as never);
      vi.mocked(verify).mockResolvedValue(false);

      await expect(
        service.login({ username: 'jperez', password: 'incorrecta' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('normaliza el nombre de usuario antes de buscarlo (RF-3)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(activeUser as never);
      vi.mocked(verify).mockResolvedValue(true);

      await service.login({ username: '  Jperez  ', password: 'Temporal2026' });

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { username: 'jperez' } }),
      );
    });

    it('emite un token y actualiza el último acceso al loguearse (RF-1)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(activeUser as never);
      vi.mocked(verify).mockResolvedValue(true);

      const result = await service.login({
        username: 'jperez',
        password: 'Temporal2026',
      });

      expect(result).toEqual({
        accessToken: 'signed-jwt',
        user: {
          id: 'user-1',
          username: 'jperez',
          fullName: 'Juan Pérez',
          role: 'TRANSPORTES',
          personnelId: null,
          managedUnitIds: [],
        },
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        username: 'jperez',
        role: 'TRANSPORTES',
      });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        }),
      );
    });
  });
});
