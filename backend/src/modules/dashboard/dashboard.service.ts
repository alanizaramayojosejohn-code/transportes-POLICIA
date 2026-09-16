import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { VehicleConditionCode } from '../../generated/prisma/enums.js';

const INOPERABLE_CODES: VehicleConditionCode[] = [
  'DETERIORADO',
  'FUERA_DE_USO',
  'INOPERABLE',
  'EXTRAVIADO',
  'BAJA',
  'SEPARADO_POR_INCIDENTE',
];
const OPERATIONAL_CODES: VehicleConditionCode[] = ['BUENO', 'REGULAR'];

/**
 * Agregados de sólo lectura para el panel principal (spec 012). No hay
 * mutaciones ni modelos nuevos: todo se calcula a partir de los modelos que
 * ya existen, en el momento de la consulta.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const startOfNextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    const twelveMonthsAgo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
    );

    const [
      vehicleIds,
      activeDriverCount,
      tripsThisMonthCount,
      openTripsCount,
      inProgressMaintenanceCount,
      vehiclesInMaintenance,
      latestConditions,
      activeSpareParts,
      recentTrips,
    ] = await Promise.all([
      this.prisma.vehicle.findMany({ select: { id: true } }),
      this.prisma.driver.count({ where: { isActive: true } }),
      this.prisma.trip.count({
        where: { departureAt: { gte: startOfMonth, lt: startOfNextMonth } },
      }),
      this.prisma.trip.count({ where: { returnAt: null } }),
      this.prisma.maintenanceOrder.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.maintenanceOrder.findMany({
        where: { status: 'IN_PROGRESS' },
        select: { vehicleId: true },
        distinct: ['vehicleId'],
      }),
      this.getLatestConditions(),
      this.prisma.sparePart.findMany({
        where: { isActive: true },
        select: { currentStock: true, minStock: true },
      }),
      this.prisma.trip.findMany({
        where: { departureAt: { gte: twelveMonthsAgo } },
        select: { departureAt: true },
      }),
    ]);

    const lowStockCount = activeSpareParts.filter(
      (part) => Number(part.currentStock) < Number(part.minStock),
    ).length;

    const maintenanceVehicleIds = new Set(
      vehiclesInMaintenance.map((v) => v.vehicleId),
    );
    const fleetStatus = this.buildFleetStatus(
      vehicleIds.map((v) => v.id),
      maintenanceVehicleIds,
      latestConditions,
    );

    return {
      vehicleCount: vehicleIds.length,
      operationalVehicleCount: fleetStatus.operational,
      activeDriverCount,
      tripsThisMonthCount,
      openTripsCount,
      lowStockCount,
      inProgressMaintenanceCount,
      tripsByMonth: this.buildTripsByMonth(recentTrips, now),
      fleetStatus,
    };
  }

  /// Última condición registrada por vehículo (uno por cada uno que tenga
  /// historial); los vehículos sin ninguna fila aquí se tratan como
  /// operativos en `buildFleetStatus` (RF-2, caso límite).
  private async getLatestConditions(): Promise<
    Map<string, VehicleConditionCode>
  > {
    const latestTimestamps = await this.prisma.vehicleCondition.groupBy({
      by: ['vehicleId'],
      _max: { changedAt: true },
    });
    if (latestTimestamps.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.vehicleCondition.findMany({
      where: {
        OR: latestTimestamps
          .filter((row) => row._max.changedAt !== null)
          .map((row) => ({
            vehicleId: row.vehicleId,
            changedAt: row._max.changedAt!,
          })),
      },
      select: { vehicleId: true, code: true },
    });

    const map = new Map<string, VehicleConditionCode>();
    for (const row of rows) {
      map.set(row.vehicleId, row.code);
    }
    return map;
  }

  /// RF-2: cada vehículo cae en exactamente un balde. El mantenimiento en
  /// proceso tiene prioridad sobre la condición; sin historial de condición
  /// se asume operativo (ver casos límite del spec 012).
  private buildFleetStatus(
    vehicleIds: string[],
    maintenanceVehicleIds: Set<string>,
    latestConditions: Map<string, VehicleConditionCode>,
  ) {
    let operational = 0;
    let maintenance = 0;
    let inoperable = 0;
    let other = 0;

    for (const vehicleId of vehicleIds) {
      if (maintenanceVehicleIds.has(vehicleId)) {
        maintenance += 1;
        continue;
      }
      const code = latestConditions.get(vehicleId);
      if (!code || OPERATIONAL_CODES.includes(code)) {
        operational += 1;
      } else if (INOPERABLE_CODES.includes(code)) {
        inoperable += 1;
      } else {
        other += 1;
      }
    }

    return { operational, maintenance, inoperable, other };
  }

  private buildTripsByMonth(trips: { departureAt: Date }[], now: Date) {
    const buckets = new Map<string, number>();
    const months: string[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const date = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      months.push(key);
      buckets.set(key, 0);
    }

    for (const trip of trips) {
      const key = `${trip.departureAt.getUTCFullYear()}-${String(trip.departureAt.getUTCMonth() + 1).padStart(2, '0')}`;
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }

    return months.map((month) => ({ month, count: buckets.get(month) ?? 0 }));
  }
}
