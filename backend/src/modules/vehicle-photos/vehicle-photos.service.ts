import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SetVehiclePhotoInput } from './dto/set-vehicle-photo.input.js';

/** Registro fotográfico del vehículo: una fila por vista (`slotKey`). */
@Injectable()
export class VehiclePhotosService {
  constructor(private readonly prisma: PrismaService) {}

  findByVehicle(vehicleId: string) {
    return this.prisma.vehiclePhoto.findMany({
      where: { vehicleId },
      orderBy: { slotKey: 'asc' },
    });
  }

  async set(input: SetVehiclePhotoInput) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: input.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehículo ${input.vehicleId} no encontrado`);
    }

    return this.prisma.vehiclePhoto.upsert({
      where: {
        vehicleId_slotKey: {
          vehicleId: input.vehicleId,
          slotKey: input.slotKey,
        },
      },
      create: {
        vehicleId: input.vehicleId,
        slotKey: input.slotKey,
        dataUrl: input.dataUrl,
      },
      update: { dataUrl: input.dataUrl },
    });
  }

  async remove(vehicleId: string, slotKey: string): Promise<boolean> {
    const { count } = await this.prisma.vehiclePhoto.deleteMany({
      where: { vehicleId, slotKey },
    });
    return count > 0;
  }
}
