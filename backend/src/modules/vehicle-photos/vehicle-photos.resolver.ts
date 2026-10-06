import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { VehiclePhotosService } from './vehicle-photos.service.js';
import { VehiclePhoto } from './entities/vehicle-photo.entity.js';
import { SetVehiclePhotoInput } from './dto/set-vehicle-photo.input.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Puerta GraphQL del registro fotográfico. La consulta está abierta a
 * cualquier rol autenticado; sólo ADMINISTRADOR y TRANSPORTES pueden subir o
 * quitar fotos, mismo permiso que editar el vehículo.
 */
@Resolver(() => VehiclePhoto)
export class VehiclePhotosResolver {
  constructor(private readonly vehiclePhotosService: VehiclePhotosService) {}

  @Query(() => [VehiclePhoto], { name: 'vehiclePhotos' })
  findByVehicle(@Args('vehicleId') vehicleId: string) {
    return this.vehiclePhotosService.findByVehicle(vehicleId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => VehiclePhoto)
  setVehiclePhoto(@Args('input') input: SetVehiclePhotoInput) {
    return this.vehiclePhotosService.set(input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Boolean)
  removeVehiclePhoto(
    @Args('vehicleId') vehicleId: string,
    @Args('slotKey') slotKey: string,
  ) {
    return this.vehiclePhotosService.remove(vehicleId, slotKey);
  }
}
