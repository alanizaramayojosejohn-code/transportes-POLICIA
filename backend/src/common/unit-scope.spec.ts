import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  assertInScope,
  assertVehicleInScope,
  unitScopeFor,
} from './unit-scope.js';
import type { AuthenticatedUser } from '../modules/auth/auth.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function buildUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: 'user-1',
    username: 'user.test',
    fullName: 'Usuario de prueba',
    role: 'TRANSPORTES',
    personnelId: null,
    managedUnitIds: [],
    ...overrides,
  };
}

function buildPrismaMock(current: unknown) {
  const mock = {
    unitAssignment: { findFirst: vi.fn().mockResolvedValue(current) },
  };
  return { prisma: mock as unknown as PrismaService, mock };
}

describe('unitScopeFor', () => {
  it('devuelve null para roles sin acotamiento (spec 015, RF-15)', () => {
    expect(unitScopeFor(buildUser({ role: 'ADMINISTRADOR' }))).toBeNull();
    expect(unitScopeFor(buildUser({ role: 'COMBUSTIBLE' }))).toBeNull();
  });

  it('devuelve las unidades a cargo para TRANSPORTES (RF-12)', () => {
    expect(unitScopeFor(buildUser({ managedUnitIds: ['u1', 'u2'] }))).toEqual([
      'u1',
      'u2',
    ]);
  });
});

describe('assertInScope', () => {
  it('no rechaza cuando el alcance es null', () => {
    expect(() => assertInScope(null, 'cualquiera')).not.toThrow();
  });

  it('rechaza si la unidad no está en el alcance (RF-14)', () => {
    expect(() => assertInScope(['u1'], 'u2')).toThrow(ForbiddenException);
  });

  it('rechaza si no se indica unidad', () => {
    expect(() => assertInScope(['u1'], null)).toThrow(ForbiddenException);
  });

  it('permite si la unidad está en el alcance', () => {
    expect(() => assertInScope(['u1', 'u2'], 'u2')).not.toThrow();
  });
});

describe('assertVehicleInScope', () => {
  it('no consulta la base si el alcance es null', async () => {
    const { prisma, mock } = buildPrismaMock(null);
    await expect(
      assertVehicleInScope(prisma, null, 'v1'),
    ).resolves.toBeUndefined();
    expect(mock.unitAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('rechaza si el vehículo no tiene asignación vigente en el alcance (RF-14)', async () => {
    const { prisma } = buildPrismaMock(null);
    await expect(assertVehicleInScope(prisma, ['u1'], 'v1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('permite si el vehículo tiene asignación vigente en el alcance', async () => {
    const { prisma } = buildPrismaMock({ id: 'ua1' });
    await expect(
      assertVehicleInScope(prisma, ['u1'], 'v1'),
    ).resolves.toBeUndefined();
  });
});
