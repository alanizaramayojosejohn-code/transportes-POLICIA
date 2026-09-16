import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { withUniqueConstraintHandling } from '../../common/prisma-errors.js';
import { CreateDriverInput } from './dto/create-driver.input.js';
import { UpdateDriverInput } from './dto/update-driver.input.js';
import { DriverFilterArgs } from './dto/driver-filter.args.js';

/**
 * Padrón de conductores (spec 005). CI y número de licencia son únicos
 * (RF-3); la unidad es opcional y se valida contra el catálogo de `Unit`
 * cuando se indica (RF-4).
 */
@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: DriverFilterArgs) {
    const where: Prisma.DriverWhereInput = {
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [
              { ci: { contains: filters.search, mode: 'insensitive' } },
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
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
      this.prisma.driver.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.driver.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) {
      throw new NotFoundException(`Conductor ${id} no encontrado`);
    }
    return driver;
  }

  /// Campo resuelto `unit` en el resolver: la unidad es opcional.
  getUnit(unitId: string | null) {
    if (!unitId) {
      return null;
    }
    return this.prisma.unit.findUnique({ where: { id: unitId } });
  }

  async create(input: CreateDriverInput) {
    if (input.unitId) {
      await this.findUnitOrThrow(input.unitId);
    }

    return withUniqueConstraintHandling(
      () =>
        this.prisma.driver.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            ci: input.ci,
            rank: input.rank,
            licenseNumber: input.licenseNumber,
            licenseCategory: input.licenseCategory,
            licenseExpiresAt: new Date(input.licenseExpiresAt),
            phone: input.phone,
            unitId: input.unitId,
          },
        }),
      'Ya existe un conductor con ese',
    );
  }

  async update(id: string, input: UpdateDriverInput) {
    await this.findOne(id);
    if (input.unitId) {
      await this.findUnitOrThrow(input.unitId);
    }

    const { licenseExpiresAt, ...rest } = input;

    return withUniqueConstraintHandling(
      () =>
        this.prisma.driver.update({
          where: { id },
          data: {
            ...rest,
            ...(licenseExpiresAt
              ? { licenseExpiresAt: new Date(licenseExpiresAt) }
              : {}),
          },
        }),
      'Ya existe un conductor con ese',
    );
  }

  /// RF-6: la baja es reversible y no borra el registro.
  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.driver.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /// RF-7: conserva sus datos sin cambios.
  async reactivate(id: string) {
    await this.findOne(id);
    return this.prisma.driver.update({
      where: { id },
      data: { isActive: true },
    });
  }

  private async findUnitOrThrow(unitId: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException(`Unidad ${unitId} no encontrada`);
    }
    return unit;
  }
}
