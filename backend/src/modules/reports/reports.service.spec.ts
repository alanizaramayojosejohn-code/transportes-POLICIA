import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReportsService } from './reports.service.js';
import { LogbookEntryType } from './entities/logbook-entry.entity.js';
import { VehicleHistoryEntryType } from './entities/vehicle-history-entry.entity.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

function buildPrismaMock() {
  const mock = {
    trip: { findMany: vi.fn().mockResolvedValue([]) },
    fuelRecord: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { prisma: mock as unknown as PrismaService, mock };
}

const vehicle = { id: 'v1', plate: 'ORU-123', type: 'CAMIONETA' };
const driver = { id: 'd1', firstName: 'Ana', lastName: 'Pérez', rank: 'Sgto.' };

function buildTrip(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    departureAt: new Date('2026-09-10T08:00:00.000Z'),
    departureOdometer: 1000,
    returnAt: new Date('2026-09-10T12:00:00.000Z'),
    returnOdometer: 1100,
    distanceKm: 100,
    assignment: {
      vehicle,
      driver,
      request: { destination: 'Aeropuerto' },
    },
    ...overrides,
  };
}

function buildFuelRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'f1',
    suppliedAt: new Date('2026-09-11T08:00:00.000Z'),
    fuelType: 'DIESEL',
    quantity: { toString: () => '50' } as unknown as number,
    totalCost: { toString: () => '187' } as unknown as number,
    station: 'YPFB Oruro',
    vehicle,
    driver,
    ...overrides,
  };
}

describe('ReportsService.driverLogbook', () => {
  it('mezcla recorridos y cargas ordenados por fecha descendente', async () => {
    const { prisma, mock } = buildPrismaMock();
    mock.trip.findMany.mockResolvedValue([buildTrip()]);
    mock.fuelRecord.findMany.mockResolvedValue([buildFuelRecord()]);
    const service = new ReportsService(prisma);

    const result = await service.driverLogbook({});

    expect(result.total).toBe(2);
    expect(result.items[0].type).toBe(LogbookEntryType.FUEL);
    expect(result.items[1].type).toBe(LogbookEntryType.TRIP);
    expect(result.items[0].id).toBe('fuel:f1');
    expect(result.items[1].destination).toBe('Aeropuerto');
  });

  it('convierte los Decimal de combustible a number', async () => {
    const { prisma, mock } = buildPrismaMock();
    mock.fuelRecord.findMany.mockResolvedValue([buildFuelRecord()]);
    const service = new ReportsService(prisma);

    const result = await service.driverLogbook({});

    expect(result.items[0].quantity).toBe(50);
    expect(result.items[0].totalCost).toBe(187);
  });

  it('aplica driverId a ambas consultas', async () => {
    const { prisma, mock } = buildPrismaMock();
    const service = new ReportsService(prisma);

    await service.driverLogbook({ driverId: 'd1' });

    expect(mock.trip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignment: expect.objectContaining({ driverId: 'd1' }),
        }),
      }),
    );
    expect(mock.fuelRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ driverId: 'd1' }),
      }),
    );
  });

  it('combina el alcance por unidad con el filtro de unidad del reporte sin que uno pise al otro (spec 015, RF-14)', async () => {
    const { prisma, mock } = buildPrismaMock();
    const service = new ReportsService(prisma);

    await service.driverLogbook({ unitId: 'u-elegida' }, ['u-alcance']);

    const tripWhere = mock.trip.findMany.mock.calls[0][0].where;
    const vehicleWhere = tripWhere.assignment.vehicle;
    expect(vehicleWhere.AND).toEqual(
      expect.arrayContaining([
        { unitAssignments: { some: { unitId: 'u-elegida', endDate: null } } },
        {
          unitAssignments: {
            some: { unitId: { in: ['u-alcance'] }, endDate: null },
          },
        },
      ]),
    );
  });

  it('pagina la lista ya mezclada, no cada consulta por separado', async () => {
    const { prisma, mock } = buildPrismaMock();
    mock.trip.findMany.mockResolvedValue([
      buildTrip({
        id: 't1',
        departureAt: new Date('2026-09-01T00:00:00.000Z'),
      }),
      buildTrip({
        id: 't2',
        departureAt: new Date('2026-09-03T00:00:00.000Z'),
      }),
    ]);
    mock.fuelRecord.findMany.mockResolvedValue([
      buildFuelRecord({
        id: 'f1',
        suppliedAt: new Date('2026-09-02T00:00:00.000Z'),
      }),
    ]);
    const service = new ReportsService(prisma);

    const result = await service.driverLogbook({ skip: 1, take: 1 });

    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('fuel:f1');
  });
});

function buildVehicleHistoryPrismaMock() {
  const mock = {
    unitAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    vehicleDriverAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    trip: { findMany: vi.fn().mockResolvedValue([]) },
    fuelRecord: { findMany: vi.fn().mockResolvedValue([]) },
    maintenanceOrder: { findMany: vi.fn().mockResolvedValue([]) },
    incident: { findMany: vi.fn().mockResolvedValue([]) },
    stockMovement: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { prisma: mock as unknown as PrismaService, mock };
}

function buildUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: 'u1',
    username: 'admin',
    fullName: 'Administrador',
    role: 'ADMINISTRADOR',
    personnelId: null,
    managedUnitIds: [],
    ...overrides,
  };
}

describe('ReportsService.vehicleHistory', () => {
  it('exige seleccionar un vehículo para ADMINISTRADOR y CONSULTA (RF-12)', async () => {
    const { prisma } = buildVehicleHistoryPrismaMock();
    const service = new ReportsService(prisma);

    await expect(service.vehicleHistory({}, buildUser())).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.vehicleHistory({}, buildUser({ role: 'CONSULTA' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza a TRANSPORTES si el vehículo no está en su alcance (RF-13)', async () => {
    const { prisma, mock } = buildVehicleHistoryPrismaMock();
    mock.unitAssignment.findFirst.mockResolvedValue(null);
    const service = new ReportsService(prisma);
    const user = buildUser({ role: 'TRANSPORTES', managedUnitIds: ['u-1'] });

    await expect(
      service.vehicleHistory({ vehicleId: 'v1' }, user),
    ).rejects.toThrow(ForbiddenException);
  });

  it('permite a TRANSPORTES ver un vehículo dentro de su alcance (RF-13)', async () => {
    const { prisma, mock } = buildVehicleHistoryPrismaMock();
    mock.unitAssignment.findFirst.mockResolvedValue({ id: 'ua1' } as never);
    const service = new ReportsService(prisma);
    const user = buildUser({ role: 'TRANSPORTES', managedUnitIds: ['u-1'] });

    const result = await service.vehicleHistory({ vehicleId: 'v1' }, user);

    expect(result).toEqual({ items: [], total: 0 });
  });

  it('CONDUCTOR sin ficha de personal no ve nada', async () => {
    const { prisma } = buildVehicleHistoryPrismaMock();
    const service = new ReportsService(prisma);
    const user = buildUser({ role: 'CONDUCTOR', personnelId: null });

    const result = await service.vehicleHistory({}, user);

    expect(result).toEqual({ items: [], total: 0 });
  });

  it('CONDUCTOR sin vehículo a cargo vigente no ve nada (RF-16c)', async () => {
    const { prisma, mock } = buildVehicleHistoryPrismaMock();
    mock.vehicleDriverAssignment.findFirst.mockResolvedValue(null);
    const service = new ReportsService(prisma);
    const user = buildUser({ role: 'CONDUCTOR', personnelId: 'p1' });

    const result = await service.vehicleHistory({}, user);

    expect(result).toEqual({ items: [], total: 0 });
  });

  it('acota a CONDUCTOR al vehículo y a la fecha de su encargo vigente (RF-16)', async () => {
    const { prisma, mock } = buildVehicleHistoryPrismaMock();
    mock.vehicleDriverAssignment.findFirst.mockResolvedValue({
      vehicleId: 'v1',
      startDate: new Date('2026-06-01T00:00:00.000Z'),
    } as never);
    const service = new ReportsService(prisma);
    const user = buildUser({ role: 'CONDUCTOR', personnelId: 'p1' });

    await service.vehicleHistory({}, user);

    const tripArgs = mock.trip.findMany.mock.calls[0][0];
    expect(tripArgs.where.assignment.vehicleId).toBe('v1');
    expect(tripArgs.where.departureAt.gte).toEqual(
      new Date('2026-06-01T00:00:00.000Z'),
    );
  });

  it('usa el filtro de fecha pedido si es más tardío que el inicio del encargo (RF-17)', async () => {
    const { prisma, mock } = buildVehicleHistoryPrismaMock();
    mock.vehicleDriverAssignment.findFirst.mockResolvedValue({
      vehicleId: 'v1',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
    } as never);
    const service = new ReportsService(prisma);
    const user = buildUser({ role: 'CONDUCTOR', personnelId: 'p1' });

    await service.vehicleHistory({ fromDate: '2026-06-01' }, user);

    const tripArgs = mock.trip.findMany.mock.calls[0][0];
    expect(tripArgs.where.departureAt.gte).toEqual(new Date('2026-06-01'));
  });

  it('ignora el filtro de fecha pedido si es más temprano que el inicio del encargo (RF-17)', async () => {
    const { prisma, mock } = buildVehicleHistoryPrismaMock();
    mock.vehicleDriverAssignment.findFirst.mockResolvedValue({
      vehicleId: 'v1',
      startDate: new Date('2026-06-01T00:00:00.000Z'),
    } as never);
    const service = new ReportsService(prisma);
    const user = buildUser({ role: 'CONDUCTOR', personnelId: 'p1' });

    await service.vehicleHistory({ fromDate: '2026-01-01' }, user);

    const tripArgs = mock.trip.findMany.mock.calls[0][0];
    expect(tripArgs.where.departureAt.gte).toEqual(
      new Date('2026-06-01T00:00:00.000Z'),
    );
  });

  it('mezcla las siete fuentes, ordena por fecha descendente y respeta la paginación', async () => {
    const { prisma, mock } = buildVehicleHistoryPrismaMock();
    mock.trip.findMany.mockResolvedValue([
      {
        id: 't1',
        departureAt: new Date('2026-01-01T00:00:00.000Z'),
        returnAt: null,
        distanceKm: 10,
        assignment: { driver: null, request: { destination: 'Plaza' } },
      },
    ] as never);
    mock.incident.findMany.mockResolvedValue([
      {
        id: 'i1',
        occurredAt: new Date('2026-01-02T00:00:00.000Z'),
        type: 'ACCIDENTE',
        severity: 'MINOR',
        place: 'Av. X',
        estimatedCost: null,
        description: 'Choque leve',
        driver: null,
      },
    ] as never);
    mock.fuelRecord.findMany.mockResolvedValue([
      {
        id: 'f1',
        suppliedAt: new Date('2026-01-03T00:00:00.000Z'),
        fuelType: 'DIESEL',
        station: 'YPFB',
        quantity: { toString: () => '20' },
        totalCost: { toString: () => '80' },
        driver: null,
      },
    ] as never);
    const service = new ReportsService(prisma);

    const result = await service.vehicleHistory(
      { vehicleId: 'v1' },
      buildUser(),
    );

    expect(result.total).toBe(3);
    expect(result.items.map((entry) => entry.type)).toEqual([
      VehicleHistoryEntryType.FUEL,
      VehicleHistoryEntryType.INCIDENT,
      VehicleHistoryEntryType.TRIP,
    ]);
  });

  it('filtra por tipo de evento cuando se especifica (RF-15)', async () => {
    const { prisma, mock } = buildVehicleHistoryPrismaMock();
    mock.trip.findMany.mockResolvedValue([
      {
        id: 't1',
        departureAt: new Date('2026-01-01T00:00:00.000Z'),
        returnAt: null,
        distanceKm: 10,
        assignment: { driver: null, request: { destination: 'Plaza' } },
      },
    ] as never);
    mock.incident.findMany.mockResolvedValue([
      {
        id: 'i1',
        occurredAt: new Date('2026-01-02T00:00:00.000Z'),
        type: 'ACCIDENTE',
        severity: 'MINOR',
        place: 'Av. X',
        estimatedCost: null,
        description: 'Choque leve',
        driver: null,
      },
    ] as never);
    const service = new ReportsService(prisma);

    const result = await service.vehicleHistory(
      { vehicleId: 'v1', types: [VehicleHistoryEntryType.TRIP] },
      buildUser(),
    );

    expect(result.total).toBe(1);
    expect(result.items[0].type).toBe(VehicleHistoryEntryType.TRIP);
  });

  it('mapea cambios de unidad con el nombre de la unidad y el motivo', async () => {
    const { prisma, mock } = buildVehicleHistoryPrismaMock();
    mock.unitAssignment.findMany.mockResolvedValue([
      {
        id: 'ua1',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        reason: 'Reasignación',
        unit: { name: 'EPI 3' },
      },
    ] as never);
    const service = new ReportsService(prisma);

    const result = await service.vehicleHistory(
      { vehicleId: 'v1' },
      buildUser(),
    );

    expect(result.items[0].unitName).toBe('EPI 3');
    expect(result.items[0].description).toBe('Reasignación');
    expect(result.items[0].type).toBe(VehicleHistoryEntryType.UNIT_ASSIGNMENT);
  });

  it('mapea salidas de almacén con el nombre del artículo y convierte la cantidad', async () => {
    const { prisma, mock } = buildVehicleHistoryPrismaMock();
    mock.stockMovement.findMany.mockResolvedValue([
      {
        id: 's1',
        type: 'OUT',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        reason: 'Cambio de aceite',
        quantity: { toString: () => '2' },
        sparePart: { name: 'Aceite 20W50' },
      },
    ] as never);
    const service = new ReportsService(prisma);

    const result = await service.vehicleHistory(
      { vehicleId: 'v1' },
      buildUser(),
    );

    expect(result.items[0].sparePartName).toBe('Aceite 20W50');
    expect(result.items[0].quantity).toBe(2);
    expect(result.items[0].type).toBe(VehicleHistoryEntryType.STOCK_MOVEMENT);
  });
});
