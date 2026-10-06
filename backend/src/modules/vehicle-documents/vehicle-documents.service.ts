import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CreateVehicleDocumentInput } from './dto/create-vehicle-document.input.js';
import { VehicleDocumentFilterArgs } from './dto/vehicle-document-filter.args.js';

/** Expediente documental del vehículo (spec 010). Sólo alta y consulta. */
@Injectable()
export class VehicleDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: VehicleDocumentFilterArgs) {
    const where: Prisma.VehicleDocumentWhereInput = {
      ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.search
        ? {
            OR: [
              {
                documentNumber: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                vehicle: {
                  plate: { contains: filters.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicleDocument.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { expiresAt: 'desc' },
      }),
      this.prisma.vehicleDocument.count({ where }),
    ]);

    return { items, total };
  }

  getVehicle(vehicleId: string) {
    return this.prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
  }

  /// RF-1 a RF-3.
  async create(input: CreateVehicleDocumentInput) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: input.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehículo ${input.vehicleId} no encontrado`);
    }

    return this.prisma.vehicleDocument.create({
      data: {
        vehicleId: input.vehicleId,
        type: input.type,
        documentNumber: input.documentNumber,
        issuedAt: input.issuedAt ? new Date(input.issuedAt) : undefined,
        expiresAt: new Date(input.expiresAt),
        notes: input.notes,
      },
    });
  }
}
