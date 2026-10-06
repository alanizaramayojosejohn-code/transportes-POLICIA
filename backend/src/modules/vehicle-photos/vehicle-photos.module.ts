import { Module } from '@nestjs/common';
import { VehiclePhotosService } from './vehicle-photos.service.js';
import { VehiclePhotosResolver } from './vehicle-photos.resolver.js';

@Module({
  providers: [VehiclePhotosResolver, VehiclePhotosService],
  exports: [VehiclePhotosService],
})
export class VehiclePhotosModule {}
