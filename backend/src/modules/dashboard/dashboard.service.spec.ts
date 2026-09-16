import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DashboardService } from './dashboard.service.js';

function buildPrismaMock() {
  const mock = {
    vehicle: { findMany: vi.fn().mockResolvedValue([]) },
    driver: { count: vi.fn().mockResolvedValue(0) },
    trip: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    maintenanceOrder: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    vehicleCondition: {
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockResolvedValue([]),
    },
    sparePart: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return mock as unknown as PrismaService & typeof mock;
}

describe('DashboardService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: DashboardService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new DashboardService(prisma);
  });

  it('devuelve todo en cero sin datos registrados (caso límite)', async () => {
    const summary = await service.getSummary();

    expect(summary.vehicleCount).toBe(0);
    expect(summary.operationalVehicleCount).toBe(0);
    expect(summary.fleetStatus).toEqual({
      operational: 0,
      maintenance: 0,
      inoperable: 0,
      other: 0,
    });
    expect(summary.tripsByMonth).toHaveLength(12);
    expect(summary.tripsByMonth.every((m) => m.count === 0)).toBe(true);
  });

  it('cuenta como operativo un vehículo sin historial de condición (RF-2)', async () => {
    vi.mocked(prisma.vehicle.findMany).mockResolvedValue([
      { id: 'v1' },
    ] as never);

    const summary = await service.getSummary();

    expect(summary.fleetStatus.operational).toBe(1);
  });

  it('clasifica como inoperable un vehículo con condición inoperable (RF-2)', async () => {
    vi.mocked(prisma.vehicle.findMany).mockResolvedValue([
      { id: 'v1' },
    ] as never);
    vi.mocked(prisma.vehicleCondition.groupBy).mockResolvedValue([
      { vehicleId: 'v1', _max: { changedAt: new Date('2026-01-01') } },
    ] as never);
    vi.mocked(prisma.vehicleCondition.findMany).mockResolvedValue([
      { vehicleId: 'v1', code: 'INOPERABLE' },
    ] as never);

    const summary = await service.getSummary();

    expect(summary.fleetStatus.inoperable).toBe(1);
    expect(summary.fleetStatus.operational).toBe(0);
  });

  it('prioriza mantenimiento en proceso sobre la condición vigente (RF-2)', async () => {
    vi.mocked(prisma.vehicle.findMany).mockResolvedValue([
      { id: 'v1' },
    ] as never);
    vi.mocked(prisma.maintenanceOrder.findMany).mockResolvedValue([
      { vehicleId: 'v1' },
    ] as never);
    vi.mocked(prisma.vehicleCondition.groupBy).mockResolvedValue([
      { vehicleId: 'v1', _max: { changedAt: new Date('2026-01-01') } },
    ] as never);
    vi.mocked(prisma.vehicleCondition.findMany).mockResolvedValue([
      { vehicleId: 'v1', code: 'BUENO' },
    ] as never);

    const summary = await service.getSummary();

    expect(summary.fleetStatus.maintenance).toBe(1);
    expect(summary.fleetStatus.operational).toBe(0);
  });

  it('señala artículos bajo su stock mínimo (RF-4)', async () => {
    vi.mocked(prisma.sparePart.findMany).mockResolvedValue([
      { currentStock: 2, minStock: 5 },
      { currentStock: 10, minStock: 5 },
    ] as never);

    const summary = await service.getSummary();

    expect(summary.lowStockCount).toBe(1);
  });
});
