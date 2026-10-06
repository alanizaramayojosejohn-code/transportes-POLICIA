import { Module } from '@nestjs/common';
import { VehicleDocumentsService } from './vehicle-documents.service.js';
import { VehicleDocumentsResolver } from './vehicle-documents.resolver.js';

@Module({
  providers: [VehicleDocumentsResolver, VehicleDocumentsService],
  exports: [VehicleDocumentsService],
})
export class VehicleDocumentsModule {}
