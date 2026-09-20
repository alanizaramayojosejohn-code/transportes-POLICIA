import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma, OdometerSource } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { RegisterOdometerReadingInput } from './dto/register-odometer-reading.input.js';
import { OdometerReadingFilterArgs } from './dto/odometer-reading-filter.args.js';

/**
 * Kilometraje suelto (spec 014, RF-16/RF-17). `OdometerReading` existe desde
 * la migración inicial pero ningún módulo lo llenaba: recorridos y
 * combustible guardan su propio odómetro en su propia tabla. RF-17 exige
 * comparar contra la última lectura "de cualquier origen", así que este
 * servicio consulta las tres tablas en vez de asumir que `OdometerReading`
 * es la única fuente.
 */
@Injectable()
export class OdometerReadingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: OdometerReadingFilterArgs) {
    const where: Prisma.OdometerReadingWhereInput = filters.vehicleId
      ? { vehicleId: filters.vehicleId }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.odometerReading.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: [{ readingAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.odometerReading.count({ where }),
    ]);

    return { items, total };
  }

  /// RF-17: el mayor valor visto para el vehículo, sin importar de qué
  /// tabla salió. `null` si el vehículo no tiene ninguna lectura todavía.
  async getLatestForVehicle(vehicleId: string): Promise<number | null> {
    const [readings, fuelRecords, trips] = await Promise.all([
      this.prisma.odometerReading.aggregate({
        where: { vehicleId },
        _max: { value: true },
      }),
      this.prisma.fuelRecord.aggregate({
        where: { vehicleId },
        _max: { odometer: true },
      }),
      this.prisma.trip.aggregate({
        where: { assignment: { vehicleId } },
        _max: { departureOdometer: true, returnOdometer: true },
      }),
    ]);

    const candidates = [
      readings._max.value,
      fuelRecords._max.odometer,
      trips._max.departureOdometer,
      trips._max.returnOdometer,
    ].filter((value): value is number => value !== null);

    return candidates.length > 0 ? Math.max(...candidates) : null;
  }

  /// RF-16/RF-17.
  async register(
    input: RegisterOdometerReadingInput,
    actingUser: AuthenticatedUser,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: input.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehículo ${input.vehicleId} no encontrado`);
    }

    const latest = await this.getLatestForVehicle(input.vehicleId);
    if (latest !== null && input.value < latest) {
      throw new ConflictException(
        'El valor no puede ser menor a la última lectura registrada para ese vehículo',
      );
    }

    return this.prisma.odometerReading.create({
      data: {
        vehicleId: input.vehicleId,
        value: input.value,
        source: OdometerSource.MANUAL,
        notes: input.notes,
        registeredById: actingUser.id,
      },
    });
  }
}
