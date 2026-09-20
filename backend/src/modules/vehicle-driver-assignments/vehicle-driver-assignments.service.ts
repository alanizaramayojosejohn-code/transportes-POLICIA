import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { assertInScope, type UnitScope } from '../../common/unit-scope.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { PersonnelService } from '../personnel/personnel.service.js';
import { UnitAssignmentsService } from '../unit-assignments/unit-assignments.service.js';
import { AssignVehicleDriverInput } from './dto/assign-vehicle-driver.input.js';
import { CloseVehicleDriverAssignmentInput } from './dto/close-vehicle-driver-assignment.input.js';
import { VehicleDriverAssignmentFilterArgs } from './dto/vehicle-driver-assignment-filter.args.js';

/**
 * Único lugar con decisiones sobre el conductor encargado de un vehículo
 * (spec 014). Depende de vehicles y personnel (dirección de dependencia:
 * éste módulo hacia esos dos, nunca al revés), mismo patrón que
 * `UnitAssignmentsService`. A diferencia de esa unicidad (que es sólo por
 * vehículo), aquí la designación es vigente a lo sumo una vez por vehículo Y
 * a lo sumo una vez por conductor, garantizado además por dos índices únicos
 * parciales en la base de datos.
 */
@Injectable()
export class VehicleDriverAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehiclesService: VehiclesService,
    private readonly personnelService: PersonnelService,
    private readonly unitAssignmentsService: UnitAssignmentsService,
  ) {}

  /// RF-9 (spec 014): un TRANSPORTES sólo designa/cierra sobre vehículos de
  /// alguna de sus unidades. Un vehículo sin unidad asignada está fuera del
  /// alcance de cualquier TRANSPORTES (sólo ADMINISTRADOR puede operarlo).
  private async assertVehicleInScope(vehicleId: string, scope: UnitScope) {
    if (scope === null) {
      return;
    }
    const currentUnit =
      await this.unitAssignmentsService.getCurrentForVehicle(vehicleId);
    assertInScope(scope, currentUnit?.unitId ?? null);
  }

  async findAll(filters: VehicleDriverAssignmentFilterArgs) {
    const where: Prisma.VehicleDriverAssignmentWhereInput = {
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...(filters.driverId ? { driverId: filters.driverId } : {}),
      ...(filters.current !== undefined
        ? { endDate: filters.current ? null : { not: null } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicleDriverAssignment.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.vehicleDriverAssignment.count({ where }),
    ]);

    return { items, total };
  }

  /// RF-10/RF-11: "Sin conductor asignado" cuando no hay ninguna vigente.
  getCurrentForVehicle(vehicleId: string) {
    return this.prisma.vehicleDriverAssignment.findFirst({
      where: { vehicleId, endDate: null },
    });
  }

  /// Lado inverso de la unicidad (RF-5) y base de «Mi vehículo» (RF-15).
  getCurrentForDriver(driverId: string) {
    return this.prisma.vehicleDriverAssignment.findFirst({
      where: { driverId, endDate: null },
    });
  }

  /// RF-13/RF-14 (spec 014): un usuario CONDUCTOR sólo registra kilometraje,
  /// combustible o recorridos del vehículo del que es encargado vigente.
  /// Reutilizado por trips y fuel-records (no dependen entre sí, ambos
  /// dependen de este módulo).
  async assertDriverOwnsVehicle(
    personnelId: string | null,
    vehicleId: string,
  ): Promise<void> {
    if (!personnelId) {
      throw new ConflictException(
        'La cuenta no tiene una ficha de personal vinculada',
      );
    }
    const current = await this.getCurrentForDriver(personnelId);
    if (!current || current.vehicleId !== vehicleId) {
      throw new ConflictException(
        'No es el conductor encargado de ese vehículo',
      );
    }
  }

  getHistoryForVehicle(vehicleId: string) {
    return this.prisma.vehicleDriverAssignment.findMany({
      where: { vehicleId },
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
    });
  }

  /// RF-1 a RF-6: designa al conductor, cerrando el encargo vigente del
  /// vehículo si lo hay. Permite renovar al mismo conductor en el mismo
  /// vehículo (spec 014, casos límite); rechaza si el conductor ya está a
  /// cargo de otro vehículo distinto (RF-5).
  async assign(input: AssignVehicleDriverInput, scope: UnitScope = null) {
    await this.assertVehicleInScope(input.vehicleId, scope);
    const vehicle = await this.vehiclesService.findOne(input.vehicleId);
    if (!vehicle.isActive) {
      throw new ConflictException('El vehículo está inactivo');
    }

    const driver = await this.personnelService.findOne(input.driverId);
    if (!driver.isActive) {
      throw new ConflictException('El personal está inactivo');
    }
    if (!driver.isDriver) {
      throw new ConflictException(
        'La persona no tiene habilitado el rol de conductor',
      );
    }

    const startDate = new Date(input.startDate);
    if (startDate > new Date()) {
      throw new ConflictException('La fecha de inicio no puede ser futura');
    }

    const currentForVehicle = await this.getCurrentForVehicle(input.vehicleId);
    if (currentForVehicle && startDate < currentForVehicle.startDate) {
      throw new ConflictException(
        'La fecha de inicio no puede ser anterior al encargo vigente del vehículo',
      );
    }

    const currentForDriver = await this.getCurrentForDriver(input.driverId);
    if (currentForDriver && currentForDriver.vehicleId !== input.vehicleId) {
      const otherVehicle = await this.vehiclesService.findOne(
        currentForDriver.vehicleId,
      );
      throw new ConflictException(
        `El conductor ya está a cargo del vehículo ${otherVehicle.plate}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (currentForVehicle) {
        await tx.vehicleDriverAssignment.update({
          where: { id: currentForVehicle.id },
          data: { endDate: startDate },
        });
      }
      return tx.vehicleDriverAssignment.create({
        data: {
          vehicleId: input.vehicleId,
          driverId: input.driverId,
          startDate,
          referenceDocument: input.referenceDocument,
          notes: input.notes,
        },
      });
    });
  }

  /// RF-7/RF-8.
  async close(
    input: CloseVehicleDriverAssignmentInput,
    scope: UnitScope = null,
  ) {
    await this.assertVehicleInScope(input.vehicleId, scope);
    const current = await this.getCurrentForVehicle(input.vehicleId);
    if (!current) {
      throw new NotFoundException(
        'El vehículo no tiene un conductor encargado vigente',
      );
    }
    const endDate = new Date(input.endDate);
    if (endDate < current.startDate) {
      throw new ConflictException(
        'La fecha de fin no puede ser anterior al inicio del encargo',
      );
    }
    if (endDate > new Date()) {
      throw new ConflictException(
        'La fecha de fin no puede ser posterior a hoy',
      );
    }
    return this.prisma.vehicleDriverAssignment.update({
      where: { id: current.id },
      data: { endDate },
    });
  }
}
