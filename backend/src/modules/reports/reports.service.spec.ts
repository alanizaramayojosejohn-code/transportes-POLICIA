import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReportsService } from './reports.service.js';
import { LogbookEntryType } from './entities/logbook-entry.entity.js';
import { VehicleHistoryEntryType } from './entities/vehicle-history-entry.entity.js';
import { ReportGroupBy } from './entities/consolidated-report.entity.js';
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

function buildConsolidatedPrismaMock() {
  const mock = {
    fuelRecord: { groupBy: vi.fn().mockResolvedValue([]) },
    maintenanceOrder: { groupBy: vi.fn().mockResolvedValue([]) },
    trip: { findMany: vi.fn().mockResolvedValue([]) },
    vehicle: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { prisma: mock as unknown as PrismaService, mock };
}

/// Vehículo tal como lo trae `GROUP_VEHICLE_SELECT`: lo que necesita la
/// etiqueta de la fila más su asignación de unidad vigente.
function buildGroupVehicle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    plate: 'ORU-123',
    brand: 'Toyota',
    model: 'Hilux',
    unitAssignments: [{ unitId: 'u1', unit: { name: 'UTOP' } }],
    ...overrides,
  };
}

/// `Decimal` de Prisma tal como llega al servicio: un objeto que sólo sabe
/// convertirse a texto (mismo recurso que los tests de la bitácora).
function decimal(value: string) {
  return { toString: () => value } as unknown as number;
}

const EXPECTED_JANUARY_RANGE = {
  gte: new Date('2026-01-01T04:00:00.000Z'),
  lte: new Date('2026-02-01T03:59:59.999Z'),
};

describe('ReportsService.fuelConsumptionReport', () => {
  it('consolida las cargas por vehículo con el rendimiento del periodo (RF-18)', async () => {
    const { prisma, mock } = buildConsolidatedPrismaMock();
    mock.fuelRecord.groupBy.mockResolvedValue([
      {
        vehicleId: 'v1',
        _count: { _all: 3 },
        _sum: { quantity: decimal('40'), totalCost: decimal('400') },
      },
    ] as never);
    mock.vehicle.findMany.mockResolvedValue([buildGroupVehicle()] as never);
    mock.trip.findMany.mockResolvedValue([
      { distanceKm: 300, assignment: { vehicleId: 'v1' } },
      { distanceKm: 100, assignment: { vehicleId: 'v1' } },
    ] as never);
    const service = new ReportsService(prisma);

    const result = await service.fuelConsumptionReport({});

    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual({
      groupId: 'v1',
      groupLabel: 'ORU-123',
      groupDetail: 'Toyota Hilux · UTOP',
      vehicleCount: 1,
      records: 3,
      liters: 40,
      totalCost: 400,
      avgUnitPrice: 10,
      distanceKm: 400,
      efficiencyKmPerLiter: 10,
    });
    expect(result.totalLiters).toBe(40);
    expect(result.totalCost).toBe(400);
    expect(result.totalDistanceKm).toBe(400);
    expect(result.totalEfficiencyKmPerLiter).toBe(10);
  });

  it('suma los vehículos de la misma unidad cuando se agrupa por unidad (RF-21)', async () => {
    const { prisma, mock } = buildConsolidatedPrismaMock();
    mock.fuelRecord.groupBy.mockResolvedValue([
      {
        vehicleId: 'v1',
        _count: { _all: 2 },
        _sum: { quantity: decimal('30'), totalCost: decimal('300') },
      },
      {
        vehicleId: 'v2',
        _count: { _all: 1 },
        _sum: { quantity: decimal('10'), totalCost: decimal('100') },
      },
    ] as never);
    mock.vehicle.findMany.mockResolvedValue([
      buildGroupVehicle(),
      buildGroupVehicle({ id: 'v2', plate: 'ORU-456' }),
    ] as never);
    const service = new ReportsService(prisma);

    const result = await service.fuelConsumptionReport({
      groupBy: ReportGroupBy.UNIT,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      groupId: 'u1',
      groupLabel: 'UTOP',
      groupDetail: null,
      vehicleCount: 2,
      records: 3,
      liters: 40,
      totalCost: 400,
    });
  });

  it('junta los vehículos sin unidad vigente en una fila aparte, no los descarta', async () => {
    const { prisma, mock } = buildConsolidatedPrismaMock();
    mock.fuelRecord.groupBy.mockResolvedValue([
      {
        vehicleId: 'v1',
        _count: { _all: 1 },
        _sum: { quantity: decimal('10'), totalCost: decimal('100') },
      },
    ] as never);
    mock.vehicle.findMany.mockResolvedValue([
      buildGroupVehicle({ unitAssignments: [] }),
    ] as never);
    const service = new ReportsService(prisma);

    const result = await service.fuelConsumptionReport({
      groupBy: ReportGroupBy.UNIT,
    });

    expect(result.items[0]).toMatchObject({
      groupId: 'SIN_UNIDAD',
      groupLabel: 'Sin unidad asignada',
      liters: 10,
    });
  });

  it('aplica el rango como días completos de Bolivia a cargas y recorridos', async () => {
    const { prisma, mock } = buildConsolidatedPrismaMock();
    mock.fuelRecord.groupBy.mockResolvedValue([
      {
        vehicleId: 'v1',
        _count: { _all: 1 },
        _sum: { quantity: decimal('10'), totalCost: decimal('100') },
      },
    ] as never);
    mock.vehicle.findMany.mockResolvedValue([buildGroupVehicle()] as never);
    const service = new ReportsService(prisma);

    await service.fuelConsumptionReport({
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
    });

    expect(mock.fuelRecord.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ suppliedAt: EXPECTED_JANUARY_RANGE }),
      }),
    );
    expect(mock.trip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          departureAt: EXPECTED_JANUARY_RANGE,
        }),
      }),
    );
  });

  it('combina el alcance por unidad con los filtros de vehículo y unidad sin que uno pise al otro (spec 015)', async () => {
    const { prisma, mock } = buildConsolidatedPrismaMock();
    const service = new ReportsService(prisma);

    await service.fuelConsumptionReport(
      { vehicleId: 'v9', unitId: 'u-elegida' },
      ['u-alcance'],
    );

    const where = mock.fuelRecord.groupBy.mock.calls[0][0].where;
    expect(where.vehicle.AND).toEqual(
      expect.arrayContaining([
        { id: 'v9' },
        { unitAssignments: { some: { unitId: 'u-elegida', endDate: null } } },
        {
          unitAssignments: {
            some: { unitId: { in: ['u-alcance'] }, endDate: null },
          },
        },
      ]),
    );
  });

  it('no consulta recorridos ni vehículos si no hubo cargas en el rango', async () => {
    const { prisma, mock } = buildConsolidatedPrismaMock();
    const service = new ReportsService(prisma);

    const result = await service.fuelConsumptionReport({});

    expect(mock.trip.findMany).not.toHaveBeenCalled();
    expect(mock.vehicle.findMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      items: [],
      total: 0,
      totalLiters: 0,
      totalEfficiencyKmPerLiter: null,
    });
  });
});

describe('ReportsService.maintenanceCostReport', () => {
  it('separa preventivas de correctivas y promedia por orden (RF-19)', async () => {
    const { prisma, mock } = buildConsolidatedPrismaMock();
    mock.maintenanceOrder.groupBy.mockResolvedValue([
      {
        vehicleId: 'v1',
        type: 'PREVENTIVE',
        _count: { _all: 2 },
        _sum: { totalCost: decimal('200') },
      },
      {
        vehicleId: 'v1',
        type: 'CORRECTIVE',
        _count: { _all: 1 },
        _sum: { totalCost: decimal('100') },
      },
    ] as never);
    mock.vehicle.findMany.mockResolvedValue([buildGroupVehicle()] as never);
    const service = new ReportsService(prisma);

    const result = await service.maintenanceCostReport({});

    expect(result.items[0]).toMatchObject({
      groupLabel: 'ORU-123',
      orders: 3,
      preventive: 2,
      corrective: 1,
      totalCost: 300,
      avgCost: 100,
    });
    expect(result).toMatchObject({
      totalOrders: 3,
      totalPreventive: 2,
      totalCorrective: 1,
      totalCost: 300,
    });
  });

  it('deja fuera las órdenes anuladas: no son un costo (RF-19)', async () => {
    const { prisma, mock } = buildConsolidatedPrismaMock();
    const service = new ReportsService(prisma);

    await service.maintenanceCostReport({});

    expect(mock.maintenanceOrder.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { not: 'CANCELLED' } }),
      }),
    );
  });
});

describe('ReportsService.mileageReport', () => {
  it('cuenta salidas y retornos, y promedia sobre los recorridos cerrados (RF-20)', async () => {
    const { prisma, mock } = buildConsolidatedPrismaMock();
    mock.trip.findMany.mockResolvedValue([
      {
        distanceKm: 100,
        returnAt: new Date('2026-01-02T00:00:00.000Z'),
        assignment: { vehicleId: 'v1' },
      },
      { distanceKm: null, returnAt: null, assignment: { vehicleId: 'v1' } },
    ] as never);
    mock.vehicle.findMany.mockResolvedValue([buildGroupVehicle()] as never);
    const service = new ReportsService(prisma);

    const result = await service.mileageReport({});

    expect(result.items[0]).toMatchObject({
      groupLabel: 'ORU-123',
      trips: 2,
      closedTrips: 1,
      distanceKm: 100,
      avgDistanceKm: 100,
    });
    expect(result).toMatchObject({
      totalTrips: 2,
      totalClosedTrips: 1,
      totalDistanceKm: 100,
    });
  });

  it('ordena por kilómetros descendente y pagina la lista ya consolidada', async () => {
    const { prisma, mock } = buildConsolidatedPrismaMock();
    mock.trip.findMany.mockResolvedValue([
      { distanceKm: 100, returnAt: null, assignment: { vehicleId: 'v1' } },
      { distanceKm: 500, returnAt: null, assignment: { vehicleId: 'v2' } },
    ] as never);
    mock.vehicle.findMany.mockResolvedValue([
      buildGroupVehicle(),
      buildGroupVehicle({ id: 'v2', plate: 'ORU-456' }),
    ] as never);
    const service = new ReportsService(prisma);

    const result = await service.mileageReport({ skip: 0, take: 1 });

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].groupLabel).toBe('ORU-456');
    /// Los totales son de todo el resultado filtrado, no de la página.
    expect(result.totalDistanceKm).toBe(600);
  });
});
