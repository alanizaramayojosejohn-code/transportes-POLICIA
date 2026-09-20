import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { withUniqueConstraintHandling } from '../../common/prisma-errors.js';
import { assertInScope, type UnitScope } from '../../common/unit-scope.js';
import { CreatePersonnelInput } from './dto/create-personnel.input.js';
import { UpdatePersonnelInput } from './dto/update-personnel.input.js';
import { PersonnelFilterArgs } from './dto/personnel-filter.args.js';

/**
 * Único lugar con decisiones sobre el personal del Comando: fusiona lo que
 * antes eran `OfficersService` (spec 002) y `DriversService` (spec 005).
 * Una ficha puede ser conductora, encargada de transportes, o tener cuenta
 * de sistema — cualquier combinación de las tres — y puede ganar o perder un
 * rol con el tiempo sin dejar de ser la misma persona (unicidad de
 * `(ci, ciComplement)`).
 */
@Injectable()
export class PersonnelService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: PersonnelFilterArgs, scope: UnitScope = null) {
    const where: Prisma.PersonnelWhereInput = {
      ...(filters.isDriver !== undefined ? { isDriver: filters.isDriver } : {}),
      ...(filters.isOfficer !== undefined
        ? { isOfficer: filters.isOfficer }
        : {}),
      ...(filters.isAdmin !== undefined ? { isAdmin: filters.isAdmin } : {}),
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
      /// Alcance por unidad (spec 015, RF-12): `scope` ya viene resuelto
      /// desde `unitScopeFor`, null = sin restricción.
      ...(scope !== null ? { unitId: { in: scope } } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [
              { ci: { contains: filters.search, mode: 'insensitive' } },
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { rank: { contains: filters.search, mode: 'insensitive' } },
              {
                licenseNumber: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.personnel.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.personnel.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const personnel = await this.prisma.personnel.findUnique({ where: { id } });
    if (!personnel) {
      throw new NotFoundException(`Personal ${id} no encontrado`);
    }
    return personnel;
  }

  /// Campo resuelto `unit` en el resolver: la unidad es opcional.
  getUnit(unitId: string | null) {
    if (!unitId) {
      return null;
    }
    return this.prisma.unit.findUnique({ where: { id: unitId } });
  }

  /// Lado inverso de `Personnel.userId` (spec 015, campo resuelto `personnel`
  /// en `User`): no toda cuenta tiene una ficha vinculada.
  getByUserId(userId: string) {
    return this.prisma.personnel.findUnique({ where: { userId } });
  }

  async create(input: CreatePersonnelInput, scope: UnitScope = null) {
    this.assertHasAtLeastOneRole(input);
    this.assertLicenseWhenDriver(input);
    if (input.unitId) {
      await this.findUnitOrThrow(input.unitId);
    }
    /// RF-14 (spec 015): un TRANSPORTES sólo registra personal de su unidad.
    assertInScope(scope, input.unitId ?? null);

    return withUniqueConstraintHandling(
      () =>
        this.prisma.personnel.create({
          data: {
            ci: input.ci,
            ciComplement: input.ciComplement ?? '',
            firstName: input.firstName,
            lastName: input.lastName,
            rank: input.rank,
            phone: input.phone,
            email: input.email,
            isDriver: input.isDriver ?? false,
            isOfficer: input.isOfficer ?? false,
            isAdmin: input.isAdmin ?? false,
            licenseNumber: input.isDriver ? input.licenseNumber : undefined,
            licenseCategory: input.isDriver ? input.licenseCategory : undefined,
            licenseExpiresAt:
              input.isDriver && input.licenseExpiresAt
                ? new Date(input.licenseExpiresAt)
                : undefined,
            observations: input.observations,
            unitId: input.unitId,
          },
        }),
      'Ya existe una persona registrada con esa',
    );
  }

  async update(
    id: string,
    input: UpdatePersonnelInput,
    scope: UnitScope = null,
  ) {
    const current = await this.findOne(id);
    /// RF-14: la ficha ya debe estar en el alcance, y si se le cambia de
    /// unidad, la nueva también.
    assertInScope(scope, current.unitId);
    if (input.unitId !== undefined) {
      assertInScope(scope, input.unitId);
    }
    const merged = { ...current, ...input };
    this.assertHasAtLeastOneRole(merged);
    this.assertLicenseWhenDriver(merged);
    if (input.unitId) {
      await this.findUnitOrThrow(input.unitId);
    }

    const { licenseExpiresAt, ciComplement, ...rest } = input;

    return withUniqueConstraintHandling(
      () =>
        this.prisma.personnel.update({
          where: { id },
          data: {
            ...rest,
            ...(ciComplement !== undefined
              ? { ciComplement: ciComplement ?? '' }
              : {}),
            ...(licenseExpiresAt
              ? { licenseExpiresAt: new Date(licenseExpiresAt) }
              : {}),
          },
        }),
      'Ya existe una persona registrada con esa',
    );
  }

  /// Rechaza si la persona es encargada vigente de alguna unidad (regla que
  /// antes vivía en OfficersService.deactivate, RF-16 spec 002) o conductora
  /// encargada vigente de algún vehículo (spec 014), sin importar sus
  /// banderas de rol.
  async deactivate(id: string, scope: UnitScope = null) {
    const personnel = await this.findOne(id);
    assertInScope(scope, personnel.unitId);
    const activeAssignments =
      await this.prisma.transportManagerAssignment.findMany({
        where: { officerId: id, endDate: null },
        include: { unit: true },
      });
    if (activeAssignments.length > 0) {
      const unitNames = activeAssignments
        .map((assignment) => assignment.unit.name)
        .join(', ');
      throw new ConflictException(
        `No se puede dar de baja: es encargado vigente de ${unitNames}`,
      );
    }
    const activeVehicleCharge =
      await this.prisma.vehicleDriverAssignment.findFirst({
        where: { driverId: id, endDate: null },
        include: { vehicle: true },
      });
    if (activeVehicleCharge) {
      throw new ConflictException(
        `No se puede dar de baja: es conductor encargado del vehículo ${activeVehicleCharge.vehicle.plate}`,
      );
    }
    return this.prisma.personnel.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /// Conserva sus datos sin cambios (antes DriversService.reactivate, RF-7 spec 005).
  async reactivate(id: string, scope: UnitScope = null) {
    const personnel = await this.findOne(id);
    assertInScope(scope, personnel.unitId);
    return this.prisma.personnel.update({
      where: { id },
      data: { isActive: true },
    });
  }

  private assertHasAtLeastOneRole(input: {
    isDriver?: boolean;
    isOfficer?: boolean;
    isAdmin?: boolean;
  }): void {
    if (!input.isDriver && !input.isOfficer && !input.isAdmin) {
      throw new BadRequestException(
        'Debe marcar al menos un rol: conductor, encargado o administrativo',
      );
    }
  }

  private assertLicenseWhenDriver(input: {
    isDriver?: boolean;
    licenseNumber?: string | null;
    licenseCategory?: string | null;
    licenseExpiresAt?: string | Date | null;
  }): void {
    if (
      input.isDriver &&
      (!input.licenseNumber ||
        !input.licenseCategory ||
        !input.licenseExpiresAt)
    ) {
      throw new BadRequestException(
        'Número de licencia, categoría y vencimiento son obligatorios para el rol de conductor',
      );
    }
  }

  private async findUnitOrThrow(unitId: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException(`Unidad ${unitId} no encontrada`);
    }
    return unit;
  }
}
