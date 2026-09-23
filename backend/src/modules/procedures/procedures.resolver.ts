import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProceduresService } from './procedures.service.js';
import { ProcedureType } from './entities/procedure-type.entity.js';
import { ProcedureTypePage } from './entities/procedure-type-page.entity.js';
import { ProcedureChecklistItem } from './entities/procedure-checklist-item.entity.js';
import { CreateProcedureTypeInput } from './dto/create-procedure-type.input.js';
import { UpdateProcedureTypeInput } from './dto/update-procedure-type.input.js';
import { ProcedureTypeFilterArgs } from './dto/procedure-type-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Puerta GraphQL del catálogo de tipos de trámite (spec 016). La consulta
 * está abierta a cualquier rol; ADMINISTRADOR y TRANSPORTES crean, editan,
 * desactivan y eliminan tipos (RF-19).
 */
@Resolver(() => ProcedureType)
export class ProceduresResolver {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Query(() => ProcedureTypePage, { name: 'procedureTypes' })
  findAll(@Args() filters: ProcedureTypeFilterArgs) {
    return this.proceduresService.findAllTypes(filters);
  }

  @Query(() => ProcedureType, { name: 'procedureType' })
  findOne(@Args('id') id: string) {
    return this.proceduresService.findOneType(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => ProcedureType)
  createProcedureType(@Args('input') input: CreateProcedureTypeInput) {
    return this.proceduresService.createType(input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => ProcedureType)
  updateProcedureType(
    @Args('id') id: string,
    @Args('input') input: UpdateProcedureTypeInput,
  ) {
    return this.proceduresService.updateType(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => ProcedureType)
  deactivateProcedureType(@Args('id') id: string) {
    return this.proceduresService.deactivateType(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => ProcedureType)
  reactivateProcedureType(@Args('id') id: string) {
    return this.proceduresService.reactivateType(id);
  }

  /// RF-7/RF-8.
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'TRANSPORTES')
  @Mutation(() => Boolean)
  deleteProcedureType(@Args('id') id: string) {
    return this.proceduresService.removeType(id);
  }
}

/** Campo resuelto de un ítem de checklist (spec 016, RF-17). */
@Resolver(() => ProcedureChecklistItem)
export class ProcedureChecklistItemResolver {
  constructor(private readonly proceduresService: ProceduresService) {}

  @ResolveField(() => ProcedureType)
  procedureType(@Parent() item: ProcedureChecklistItem) {
    return this.proceduresService.getType(item.procedureTypeId);
  }
}
