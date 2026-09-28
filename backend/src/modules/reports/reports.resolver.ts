import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { LogbookEntry } from './entities/logbook-entry.entity.js';
import { LogbookPage } from './entities/logbook-page.entity.js';
import { VehicleHistoryPage } from './entities/vehicle-history-page.entity.js';
import { LogbookFilterArgs } from './dto/logbook-filter.args.js';
import { VehicleHistoryFilterArgs } from './dto/vehicle-history-filter.args.js';
import { unitScopeFor } from '../../common/unit-scope.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
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

  /// Reporte «Historial integral del vehículo» (spec 018, RF-12 a RF-17):
  /// ADMINISTRADOR y CONSULTA sin acotamiento, TRANSPORTES acotado a su
  /// unidad y CONDUCTOR sólo al vehículo del que está a cargo — los tres
  /// casos los resuelve `ReportsService.vehicleHistory`. COMBUSTIBLE,
  /// MANTENIMIENTO y ALMACEN no tienen este reporte (decisión explícita del
  /// spec, no un olvido).
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR', 'CONSULTA', 'TRANSPORTES', 'CONDUCTOR')
  @Query(() => VehicleHistoryPage, { name: 'vehicleHistory' })
  vehicleHistory(
    @Args() filters: VehicleHistoryFilterArgs,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.vehicleHistory(filters, user);
  }
}
