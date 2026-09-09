import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { withUniqueConstraintHandling } from './prisma-errors.js';

describe('withUniqueConstraintHandling', () => {
  it('deja pasar el resultado si la operación no falla', async () => {
    await expect(withUniqueConstraintHandling(async () => 'ok')).resolves.toBe(
      'ok',
    );
  });

  it('propaga errores que no son P2002', async () => {
    await expect(
      withUniqueConstraintHandling(async () => {
        throw new Error('otro error');
      }),
    ).rejects.toThrow('otro error');
  });

  it('usa meta.target cuando está presente (motor clásico de Prisma)', async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.10.0', meta: { target: ['plate'] } },
    );

    await expect(
      withUniqueConstraintHandling(async () => {
        throw error;
      }, 'Ya existe un vehículo con ese'),
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('plate'),
      }) as ConflictException,
    );
  });

  /// Regresión: con @prisma/adapter-pg (Prisma 7), P2002 no trae
  /// `meta.target` — el nombre de columna hay que sacarlo del índice
  /// (`<tabla>_<columna>_key`) dentro de `driverAdapterError`.
  it('extrae el campo del índice de Postgres cuando no hay meta.target (driver adapter)', async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: {
          modelName: 'Vehicle',
          driverAdapterError: {
            cause: { constraint: { index: 'vehicle_plate_key' } },
          },
        },
      },
    );

    await expect(
      withUniqueConstraintHandling(async () => {
        throw error;
      }, 'Ya existe un vehículo con ese'),
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('plate'),
      }) as ConflictException,
    );
  });

  it('usa un texto genérico si no puede determinar el campo', async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.10.0', meta: {} },
    );

    await expect(
      withUniqueConstraintHandling(async () => {
        throw error;
      }),
    ).rejects.toThrow(/campo único/);
  });
});
