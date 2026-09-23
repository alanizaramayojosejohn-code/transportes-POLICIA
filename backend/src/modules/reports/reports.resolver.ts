import { Args, Query, Resolver } from '@nestjs/graphql';
import { ReportsService } from './reports.service.js';
import { LogbookEntry } from './entities/logbook-entry.entity.js';
import { LogbookPage } from './entities/logbook-page.entity.js';
import { LogbookFilterArgs } from './dto/logbook-filter.args.js';
import { unitScopeFor } from '../../common/unit-scope.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/**
 * Puerta GraphQL de la bitácora de conductores (reporte de Combustible). Es
 * de sólo lectura, abierta a cualquier rol autenticado, igual que `trips` y
 * `fuelRecords`: no agrega un permiso de escritura propio.
 */
@Resolver(() => LogbookEntry)
export class ReportsResolver {
  constructor(private readonly reportsService: ReportsService) {}

  @Query(() => LogbookPage, { name: 'driverLogbook' })
  driverLogbook(
    @Args() filters: LogbookFilterArgs,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.driverLogbook(filters, unitScopeFor(user));
  }
}
