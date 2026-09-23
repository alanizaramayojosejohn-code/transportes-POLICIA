import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma, VehicleConditionCode } from '../../generated/prisma/client.js';
import { withUniqueConstraintHandling } from '../../common/prisma-errors.js';
import { type UnitScope } from '../../common/unit-scope.js';
import { saveChecklistItems } from '../procedures/checklist.helpers.js';
import { CreateVehicleInput } from './dto/create-vehicle.input.js';
import { UpdateVehicleInput } from './dto/update-vehicle.input.js';
import { VehicleFilterArgs } from './dto/vehicle-filter.args.js';
import { RegisterVehicleConditionInput } from './dto/register-vehicle-condition.input.js';

/**
 * Único lugar con decisiones sobre vehículos (spec 001). Las reglas de
 * unicidad (placa, chasis) las hace cumplir la base de datos vía índices
 * únicos; este servicio las traduce del error P2002 de Prisma a un
 * `ConflictException` legible. La condición vigente nunca se guarda como
 * campo mutable: siempre se deriva de VehicleCondition (RF-05, RF-13).
 */
@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: VehicleFilterArgs, scope: UnitScope = null) {
    let idsWithCondition: string[] | undefined;
    if (filters.condition) {
      idsWithCondition = await this.findVehicleIdsWithCurrentCondition(
        filters.condition,
      );
    }

    const where: Prisma.VehicleWhereInput = {
      ...(idsWithCondition ? { id: { in: idsWithCondition } } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.unitId
        ? {
            unitAssignments: {
              some: { unitId: filters.unitId, endDate: null },
            },
          }
        : {}),
      /// Alcance por unidad (spec 015, RF-12): sólo vehículos con asignación
      /// vigente en alguna unidad del alcance.
      ...(scope !== null
        ? {
            unitAssignments: { some: { unitId: { in: scope }, endDate: null } },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { plate: { contains: filters.search, mode: 'insensitive' } },
              { brand: { contains: filters.search, mode: 'insensitive' } },
              { model: { contains: filters.search, mode: 'insensitive' } },
              {
                chassisNumber: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehículo ${id} no encontrado`);
    }
    return vehicle;
  }

  /// Spec 016 RF-9/RF-10: el alta y el checklist de trámites de la acción
  /// «Registrar vehículo» se guardan en una sola transacción.
  async create(input: CreateVehicleInput) {
    const { checklistItems, ...data } = input;
    return withUniqueConstraintHandling(
      () =>
        this.prisma.$transaction(async (tx) => {
          const vehicle = await tx.vehicle.create({
            data: {
              ...data,
              plate: this.normalizePlate(input.plate),
            },
          });
          await saveChecklistItems(tx, checklistItems, {
            vehicleId: vehicle.id,
          });
          return vehicle;
        }),
      'Ya existe un vehículo con ese',
    );
  }

  async update(id: string, input: UpdateVehicleInput) {
    await this.findOne(id);
    return withUniqueConstraintHandling(
      () =>
        this.prisma.vehicle.update({
          where: { id },
          data: {
            ...input,
            ...(input.plate ? { plate: this.normalizePlate(input.plate) } : {}),
          },
        }),
      'Ya existe un vehículo con ese',
    );
  }

  /// RF-05/RF-07/RF-08: agrega una entrada al historial de condición; deriva
  /// activo/inactivo de esa entrada en la misma transacción, nunca por fuera.
  async registerCondition(
    vehicleId: string,
    input: RegisterVehicleConditionInput,
    role: string | null,
  ) {
    const vehicle = await this.findOne(vehicleId);

    return this.prisma.$transaction(async (tx) => {
      const condition = await tx.vehicleCondition.create({
        data: {
          vehicleId,
          code: input.code,
          reason: input.reason,
          registeredByRole: role,
        },
      });

      if (input.code === VehicleConditionCode.BAJA && vehicle.isActive) {
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { isActive: false },
        });
        // Spec 003 RF-16: un vehículo dado de baja no puede seguir
        // figurando en el parque de una unidad. Se usa Prisma directo (no
        // UnitAssignmentsService) para que vehicles no dependa de
        // unit-assignments; `unit_assignment` es una tabla del esquema
        // compartido, no un detalle interno de ese módulo.
        await tx.unitAssignment.updateMany({
          where: { vehicleId, endDate: null },
          data: { endDate: condition.changedAt },
        });
        // Spec 014: mismo gancho para el conductor encargado vigente, si lo
        // tiene.
        await tx.vehicleDriverAssignment.updateMany({
          where: { vehicleId, endDate: null },
          data: { endDate: condition.changedAt },
        });
      } else if (
        input.code !== VehicleConditionCode.BAJA &&
        !vehicle.isActive
      ) {
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { isActive: true },
        });
      }

      return condition;
    });
  }

  /// RF-13: "Sin evaluar" cuando no hay ninguna entrada — el resolver
  /// devuelve null y el cliente lo muestra como tal.
  getCurrentCondition(vehicleId: string) {
    return this.prisma.vehicleCondition.findFirst({
      where: { vehicleId },
      orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
    });
  }

  /// RF-10: historial ordenado de más reciente a más antiguo.
  getConditionHistory(vehicleId: string) {
    return this.prisma.vehicleCondition.findMany({
      where: { vehicleId },
      orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
    });
  }

  /// RF-12 + caso límite: mayúsculas y sin espacios; también sin guion, para
  /// que "9999-ZZZ" y "9999 ZZZ" no cuelen como placas distintas ("duplicados
  /// disfrazados").
  private normalizePlate(plate: string): string {
    return plate.toUpperCase().replace(/[\s-]+/g, '');
  }

  /// Aproximación pragmática para el filtro de listado por condición vigente:
  /// agrupa por vehículo tomando el `changedAt` máximo y compara el código de
  /// esa fecha. No desempata por id (a diferencia de getCurrentCondition):
  /// dos cambios de condición en el mismo milisegundo son prácticamente
  /// imposibles en uso real, así que la aproximación es correcta en la
  /// práctica sin necesitar una consulta SQL cruda para el listado.
  private async findVehicleIdsWithCurrentCondition(
    code: VehicleConditionCode,
  ): Promise<string[]> {
    const latest = await this.prisma.vehicleCondition.groupBy({
      by: ['vehicleId'],
      _max: { changedAt: true },
    });
    if (latest.length === 0) {
      return [];
    }
    const matches = await this.prisma.vehicleCondition.findMany({
      where: {
        code,
        OR: latest
          .filter((entry) => entry._max.changedAt)
          .map((entry) => ({
            vehicleId: entry.vehicleId,
            changedAt: entry._max.changedAt!,
          })),
      },
      select: { vehicleId: true },
    });
    return matches.map((match) => match.vehicleId);
  }
}
