import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditAction } from '../../generated/prisma/enums.js';
import { AuditService, type AuditEntry } from './audit.service.js';

function buildPrismaMock() {
  const mock = {
    auditLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    $transaction: vi.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  return mock as unknown as PrismaService & typeof mock;
}

function buildEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    action: AuditAction.CREATE,
    entity: 'Vehicle',
    entityId: 'v1',
    entityLabel: '6417-PBT',
    after: { input: { plate: '6417-PBT' } },
    userId: 'u1',
    ipAddress: '10.0.0.5',
    userAgent: 'Firefox',
    ...overrides,
  };
}

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    action: AuditAction.UPDATE,
    entity: 'Vehicle',
    entityId: 'v1',
    entityLabel: '6417-PBT',
    before: null,
    after: { input: { brand: 'Nissan' } },
    ipAddress: '10.0.0.5',
    userAgent: 'Firefox',
    createdAt: new Date('2026-09-28T10:00:00.000Z'),
    userId: 'u1',
    user: { id: 'u1', username: 'jperez', fullName: 'Juan Pérez' },
    ...overrides,
  };
}

describe('AuditService.record', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: AuditService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AuditService(prisma);
  });

  it('guarda el evento con todos sus campos (RF-1)', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    await service.record(buildEntry());

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: AuditAction.CREATE,
        entity: 'Vehicle',
        entityId: 'v1',
        entityLabel: '6417-PBT',
        userId: 'u1',
        ipAddress: '10.0.0.5',
        userAgent: 'Firefox',
      }),
    });
  });

  it('no lanza si la inserción falla: la operación de negocio ya se confirmó (RF-11)', async () => {
    /// El fallo se registra en el log del servidor; acá se silencia para no
    /// dejar un stack trace esperado en la salida de la suite.
    const logged = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    vi.mocked(prisma.auditLog.create).mockRejectedValue(
      new Error('conexión perdida'),
    );

    await expect(service.record(buildEntry())).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();

    logged.mockRestore();
  });

  it('nunca escribe `before`: el interceptor corre después de la escritura', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    await service.record(buildEntry());

    const data = vi.mocked(prisma.auditLog.create).mock.calls[0][0]
      .data as Record<string, unknown>;
    expect(data.before).toBeUndefined();
  });
});

describe('AuditService.findAll', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: AuditService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new AuditService(prisma);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0 as never);
  });

  function whereOf() {
    return vi.mocked(prisma.auditLog.findMany).mock.calls[0][0]
      ?.where as Record<string, unknown>;
  }

  it('ordena por fecha descendente y pagina (RF-13)', async () => {
    await service.findAll({ skip: 20, take: 20 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('sin filtros no acota nada', async () => {
    await service.findAll({});

    expect(whereOf()).toEqual({});
  });

  it('filtra por acción (RF-14)', async () => {
    await service.findAll({ action: AuditAction.STATUS_CHANGE });

    expect(whereOf()).toMatchObject({ action: AuditAction.STATUS_CHANGE });
  });

  it('traduce el módulo a las entidades que lo componen (RF-6/RF-14)', async () => {
    await service.findAll({ module: 'INVENTARIO' });

    const entity = whereOf().entity as { in: string[] };
    expect(entity.in).toContain('SparePart');
    expect(entity.in).toContain('StockMovement');
    expect(entity.in).not.toContain('Vehicle');
  });

  it('filtra por un día completo, no por el instante de medianoche (RF-14)', async () => {
    await service.findAll({ date: '2026-09-28' });

    const createdAt = whereOf().createdAt as { gte: Date; lt: Date };
    expect(createdAt.gte).toEqual(new Date(2026, 8, 28));
    expect(createdAt.lt).toEqual(new Date(2026, 8, 29));
  });

  it('busca por etiqueta, entidad y usuario a la vez (RF-14)', async () => {
    await service.findAll({ search: 'jperez' });

    const or = whereOf().OR as Record<string, unknown>[];
    expect(or).toHaveLength(4);
    expect(JSON.stringify(or)).toContain('jperez');
  });

  it('combina varios filtros', async () => {
    await service.findAll({
      action: AuditAction.CREATE,
      module: 'VEHICULOS',
      search: 'PBT',
    });

    const where = whereOf();
    expect(where.action).toBe(AuditAction.CREATE);
    expect(where.entity).toBeDefined();
    expect(where.OR).toBeDefined();
  });

  it('proyecta módulo y descripción, que no son columnas (RF-6/RF-21)', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      buildRow(),
    ] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(1 as never);

    const page = await service.findAll({});

    expect(page.items[0].module).toBe('VEHICULOS');
    expect(page.items[0].description).toBe('Modificación de vehículo 6417-PBT');
    expect(page.total).toBe(1);
  });

  it('serializa el payload como texto para la ficha de detalle', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      buildRow(),
    ] as never);

    const page = await service.findAll({});

    expect(page.items[0].after).toContain('Nissan');
    expect(typeof page.items[0].after).toBe('string');
  });

  it('un evento sin payload llega con `after` nulo, no con la cadena "null"', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      buildRow({ after: null }),
    ] as never);

    const page = await service.findAll({});

    expect(page.items[0].after).toBeNull();
  });

  it('conserva el evento de un usuario eliminado (RF-17)', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      buildRow({ userId: null, user: null }),
    ] as never);

    const page = await service.findAll({});

    expect(page.items[0].user).toBeNull();
    expect(page.items[0].description).toBe('Modificación de vehículo 6417-PBT');
  });
});

describe('AuditService.summary', () => {
  it('devuelve los cuatro indicadores de la maqueta (RF-16)', async () => {
    const prisma = buildPrismaMock();
    const service = new AuditService(prisma);
    vi.mocked(prisma.auditLog.count)
      .mockResolvedValueOnce(120 as never)
      .mockResolvedValueOnce(8 as never)
      .mockResolvedValueOnce(70 as never)
      .mockResolvedValueOnce(42 as never);

    const summary = await service.summary();

    expect(summary).toEqual({ total: 120, today: 8, created: 70, updated: 42 });
  });
});
