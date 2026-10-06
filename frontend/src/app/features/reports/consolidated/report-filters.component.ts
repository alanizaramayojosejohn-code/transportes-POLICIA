import { Component, inject, input, model } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FilterBarComponent } from '../../../shared/filter-bar/filter-bar.component';
import { FilterControlDirective } from '../../../shared/filter-bar/filter-control.directive';
import { ButtonDirective } from '../../../shared/button/button.directive';
import { VEHICLE_TYPE_LABEL, VehicleType } from '../../vehicles/vehicle.model';
import { VehiclesService } from '../../vehicles/vehicles.service';
import { UnitsService } from '../../units/units.service';
import {
  EMPTY_REPORT_CRITERIA,
  REPORT_GROUP_BY_LABEL,
  ReportCriteria,
  ReportGroupBy,
  ReportOptions,
} from './consolidated-report.model';

const GROUP_BY_OPTIONS: ReportGroupBy[] = ['VEHICLE', 'UNIT'];

/**
 * Opciones de vehículo y unidad para los filtros de un reporte consolidado.
 * Se arma una vez por pantalla de reporte: el componente de filtros las
 * necesita para los `<select>` y el reporte para el resumen que va al
 * Excel/PDF (`reportFiltersSummary`), así que las trae el reporte y las baja
 * acá en vez de consultarlas dos veces.
 *
 * Debe llamarse en contexto de inyección (inicializador de campo).
 */
export function reportOptions(): () => ReportOptions {
  const vehicles = toSignal(inject(VehiclesService).listAllActiveOptions(), {
    initialValue: [],
  });
  const units = toSignal(inject(UnitsService).listAllActiveOptions(), { initialValue: [] });
  return () => ({ vehicles: vehicles(), units: units() });
}

/**
 * Barra de filtros común a los tres reportes consolidados (spec 018): mismo
 * recorte de flota, misma agrupación y mismo rango de fechas en los tres, para
 * que cambiar de pestaña no obligue a reaprender los filtros.
 */
@Component({
  imports: [FilterBarComponent, FilterControlDirective, ButtonDirective],
  selector: 'app-report-filters',
  templateUrl: './report-filters.component.html',
})
export class ReportFiltersComponent {
  readonly criteria = model.required<ReportCriteria>();
  readonly options = input.required<ReportOptions>();

  protected readonly groupByOptions = GROUP_BY_OPTIONS;
  protected readonly groupByLabel = REPORT_GROUP_BY_LABEL;
  protected readonly vehicleTypeLabel = VEHICLE_TYPE_LABEL;
  protected readonly vehicleTypes = Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[];

  protected patch(change: Partial<ReportCriteria>): void {
    this.criteria.update((current) => ({ ...current, ...change }));
  }

  protected clear(): void {
    this.criteria.set(EMPTY_REPORT_CRITERIA);
  }
}
