import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { withUniqueConstraintHandling } from '../../common/prisma-errors.js';
import { CreateOfficerInput } from './dto/create-officer.input.js';
import { UpdateOfficerInput } from './dto/update-officer.input.js';
import { OfficerFilterArgs } from './dto/officer-filter.args.js';

/**
 * Único lugar con decisiones sobre personal policial (spec 002). La
 * unicidad de cédula considera el complemento vacío y ausente como el mismo
 * valor: se normaliza siempre a cadena vacía antes de guardar.
 */
@Injectable()
export class OfficersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: OfficerFilterArgs) {
    const where: Prisma.OfficerWhereInput = {
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [
              { ci: { contains: filters.search, mode: 'insensitive' } },
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { rank: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.officer.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { lastName: 'asc' },
      }),
      this.prisma.officer.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const officer = await this.prisma.officer.findUnique({ where: { id } });
    if (!officer) {
      throw new NotFoundException(`Personal ${id} no encontrado`);
    }
    return officer;
  }

  async create(input: CreateOfficerInput) {
    return withUniqueConstraintHandling(
      () =>
        this.prisma.officer.create({
          data: { ...input, ciComplement: input.ciComplement ?? '' },
        }),
      'Ya existe una persona registrada con esa',
    );
  }

  async update(id: string, input: UpdateOfficerInput) {
    await this.findOne(id);
    return withUniqueConstraintHandling(
      () =>
        this.prisma.officer.update({
          where: { id },
          data: {
            ...input,
            ...(input.ciComplement !== undefined
              ? { ciComplement: input.ciComplement ?? '' }
              : {}),
          },
        }),
      'Ya existe una persona registrada con esa',
    );
  }

  /// RF-16: rechaza si la persona es encargada vigente de alguna unidad.
  async deactivate(id: string) {
    await this.findOne(id);
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
    return this.prisma.officer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
