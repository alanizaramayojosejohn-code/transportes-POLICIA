import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { VehicleDocumentsService } from './vehicle-documents.service.js';
import { VehicleDocument } from './entities/vehicle-document.entity.js';
import { VehicleDocumentPage } from './entities/vehicle-document-page.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { CreateVehicleDocumentInput } from './dto/create-vehicle-document.input.js';
import { VehicleDocumentFilterArgs } from './dto/vehicle-document-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Puerta GraphQL del módulo (spec 010). La consulta está abierta a
 * cualquier rol; sólo ADMINISTRADOR y TRANSPORTES pueden registrar
 * documentos, mismo patrón que vehículos, unidades y conductores.
 */
@Resolver(() => VehicleDocument)
export class VehicleDocumentsResolver {
  constructor(
    private readonly vehicleDocumentsService: VehicleDocumentsService,
  ) {}

  @Query(() => VehicleDocumentPage, { name: 'vehicleDocuments' })
  findAll(@Args() filters: VehicleDocumentFilterArgs) {
    return this.vehicleDocumentsService.findAll(filters);
  }

  @ResolveField(() => Vehicle)
  vehicle(@Parent() document: VehicleDocument) {
    return this.vehicleDocumentsService.getVehicle(document.vehicleId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => VehicleDocument)
  createVehicleDocument(@Args('input') input: CreateVehicleDocumentInput) {
    return this.vehicleDocumentsService.create(input);
  }
}
