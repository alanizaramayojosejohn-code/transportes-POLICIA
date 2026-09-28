import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AuditAction } from '../../generated/prisma/enums.js';
import { AuditInterceptor } from './audit.interceptor.js';
import { AuditService } from './audit.service.js';
import {
  actionForMutation,
  auditedMutationNames,
  entityForMutation,
} from './audit-map.js';

/**
 * Contexto GraphQL mínimo. Los argumentos de un resolver de GraphQL son
 * `[root, args, context, info]`, y `GqlExecutionContext` los lee por índice de
 * ahí: reproducir esa forma alcanza para ejercitar el interceptor sin montar
 * un módulo de NestJS.
 */
function buildContext(options: {
  fieldName: string;
  parentTypeName?: string;
  args?: Record<string, unknown>;
  req?: unknown;
}): ExecutionContext {
  const info = {
    fieldName: options.fieldName,
    parentType: { name: options.parentTypeName ?? 'Mutation' },
  };
  const gqlArgs = [undefined, options.args ?? {}, { req: options.req }, info];

  return {
    getArgs: () => gqlArgs,
    getArgByIndex: (index: number) => gqlArgs[index],
    getClass: () => class {},
    getHandler: () => () => undefined,
    getType: () => 'graphql',
  } as unknown as ExecutionContext;
}

function handlerOf(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

describe('AuditInterceptor', () => {
  let auditService: { record: ReturnType<typeof vi.fn> };
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    auditService = { record: vi.fn().mockResolvedValue(undefined) };
    interceptor = new AuditInterceptor(auditService as unknown as AuditService);
  });

  it('registra una mutation exitosa con acción, entidad, id y etiqueta (RF-1)', async () => {
    const context = buildContext({
      fieldName: 'createVehicle',
      args: { input: { plate: '6417-PBT' } },
      req: {
        user: { id: 'u1' },
        ip: '10.0.0.5',
        headers: { 'user-agent': 'Firefox' },
      },
    });

    await firstValueFrom(
      interceptor.intercept(
        context,
        handlerOf({ id: 'v1', plate: '6417-PBT' }),
      ),
    );

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.CREATE,
        entity: 'Vehicle',
        entityId: 'v1',
        entityLabel: '6417-PBT',
        userId: 'u1',
        ipAddress: '10.0.0.5',
        userAgent: 'Firefox',
      }),
    );
  });

  it('deja pasar el resultado sin alterarlo', async () => {
    const result = { id: 'v1', plate: '6417-PBT' };
    const context = buildContext({ fieldName: 'createVehicle' });

    await expect(
      firstValueFrom(interceptor.intercept(context, handlerOf(result))),
    ).resolves.toBe(result);
  });

  it('no registra nada en una consulta ni en un campo resuelto (RF-1)', async () => {
    for (const parentTypeName of ['Query', 'Vehicle']) {
      const context = buildContext({ fieldName: 'vehicles', parentTypeName });
      await firstValueFrom(interceptor.intercept(context, handlerOf([])));
    }

    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('no registra nada cuando la mutation falla (RF-10)', async () => {
    const context = buildContext({ fieldName: 'createVehicle' });
    const failing: CallHandler = {
      handle: () => throwError(() => new Error('placa duplicada')),
    };

    await expect(
      firstValueFrom(interceptor.intercept(context, failing)),
    ).rejects.toThrow('placa duplicada');
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('no registra una mutation no declarada, y no rompe la operación', async () => {
    const context = buildContext({ fieldName: 'mutationSinDeclarar' });

    await expect(
      firstValueFrom(interceptor.intercept(context, handlerOf({ id: 'x' }))),
    ).resolves.toEqual({ id: 'x' });
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('toma el usuario del resultado en login, que no tiene req.user todavía (RF-9)', async () => {
    const context = buildContext({
      fieldName: 'login',
      args: { input: { username: 'jperez', password: 'secreta' } },
      req: { ip: '10.0.0.9', headers: {} },
    });

    await firstValueFrom(
      interceptor.intercept(
        context,
        handlerOf({
          accessToken: 'ey.J',
          user: { id: 'u9', username: 'jperez' },
        }),
      ),
    );

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.LOGIN,
        entity: 'Session',
        entityLabel: 'jperez',
        userId: 'u9',
      }),
    );
  });

  it('excluye credenciales y fotos del payload registrado (RF-8)', async () => {
    const context = buildContext({
      fieldName: 'login',
      args: { input: { username: 'jperez', password: 'secreta' } },
    });

    await firstValueFrom(
      interceptor.intercept(
        context,
        handlerOf({ accessToken: 'ey.J', user: { id: 'u9' } }),
      ),
    );

    const after = JSON.stringify(auditService.record.mock.calls[0][0].after);
    expect(after).not.toContain('secreta');
    expect(after).not.toContain('ey.J');
  });

  it('saca el id de los argumentos cuando el resultado es Boolean (RF-4)', async () => {
    const context = buildContext({
      fieldName: 'removeVehiclePhoto',
      args: { vehicleId: 'v1', slotKey: 'frontal' },
      req: { user: { id: 'u1' } },
    });

    await firstValueFrom(interceptor.intercept(context, handlerOf(true)));

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.DELETE,
        entity: 'VehiclePhoto',
        entityId: 'v1',
        /// Sin datos en el resultado, la etiqueta sale de los argumentos.
        entityLabel: 'frontal',
      }),
    );
  });

  it('registra la entidad padre cuando la mutation devuelve una lista de ítems (RF-3)', async () => {
    const context = buildContext({
      fieldName: 'updateFuelRecordChecklist',
      args: { fuelRecordId: 'f1', items: [] },
      req: { user: { id: 'u1' } },
    });

    await firstValueFrom(
      interceptor.intercept(context, handlerOf([{ id: 'i1' }])),
    );

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'FuelRecord', entityId: 'f1' }),
    );
  });

  it('registra con usuario nulo si la petición no trae uno', async () => {
    const context = buildContext({
      fieldName: 'createVehicle',
      req: undefined,
    });

    await firstValueFrom(
      interceptor.intercept(context, handlerOf({ id: 'v1' })),
    );

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        ipAddress: null,
        userAgent: null,
      }),
    );
  });
});

/**
 * Red de seguridad del diseño (spec 019, RF-1): el valor de auditar con un
 * interceptor es que ninguna mutation quede sin rastro, y eso sólo se sostiene
 * si toda mutation del esquema está declarada en `audit-map.ts`. Este test
 * cruza el esquema generado contra la tabla, así que agregar una mutation sin
 * declararla rompe la build en vez de perder eventos en silencio.
 */
describe('cobertura del esquema', () => {
  const schema = readFileSync(
    join(process.cwd(), 'graphql', 'schema.gql'),
    'utf8',
  );
  const mutationBlock =
    /type Mutation \{([\s\S]*?)\n\}/.exec(schema)?.[1] ?? '';
  const schemaMutations = [...mutationBlock.matchAll(/^ {2}(\w+)/gm)].map(
    (match) => match[1],
  );

  it('el esquema tiene mutations que leer (si no, el test no prueba nada)', () => {
    expect(schemaMutations.length).toBeGreaterThan(40);
  });

  it('toda mutation del esquema está declarada con su entidad', () => {
    const missing = schemaMutations.filter(
      (name) => entityForMutation(name) === null,
    );

    expect(
      missing,
      `sin declarar en ENTITY_BY_MUTATION: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('toda mutation del esquema resuelve una acción por su prefijo', () => {
    const missing = schemaMutations.filter(
      (name) => actionForMutation(name) === null,
    );

    expect(
      missing,
      `sin prefijo reconocido en ACTION_BY_PREFIX: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('no hay mutations declaradas que ya no existan en el esquema', () => {
    const stale = auditedMutationNames().filter(
      (name) => !schemaMutations.includes(name),
    );

    expect(
      stale,
      `declaradas pero ausentes del esquema: ${stale.join(', ')}`,
    ).toEqual([]);
  });
});
