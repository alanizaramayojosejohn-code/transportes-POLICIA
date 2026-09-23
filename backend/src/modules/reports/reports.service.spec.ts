import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReportsService } from './reports.service.js';
import { LogbookEntryType } from './entities/logbook-entry.entity.js';

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
