import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { FuelLogbookService } from './fuel-logbook.service';
import { LOGBOOK_ENTRY_TYPE_LABEL, LogbookFilter } from './fuel-logbook.model';
import { FUEL_TYPE_LABEL } from '../fuel-record.model';
import { VEHICLE_TYPE_LABEL, VehicleType } from '../../vehicles/vehicle.model';
import { PersonnelService, PersonnelOption } from '../../personnel/personnel.service';
import { UnitsService } from '../../units/units.service';
import { UnitOption } from '../../units/unit.model';
import { formatDateEs, formatDateTimeEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';

const VEHICLE_TYPE_OPTIONS: VehicleType[] = [
  'CAMIONETA',
  'AUTOMOVIL',
  'MOTOCICLETA',
  'MINIBUS',
  'CAMION',
  'AMBULANCIA',
  'OTRO',
];

/**
 * Bitácora de conductores (reporte del módulo Combustible): recorridos y
 * cargas de combustible combinados en una sola línea de tiempo, filtrable
 * por conductor, unidad, tipo de vehículo y rango de fechas. Nació sin spec
 * propio — pedido directamente sobre Combustible (spec 007 lo deja fuera de
 * alcance como "módulo de Reportes"); hoy el spec 018 ya lo lista como uno de
 * los reportes del módulo y `features/reports` lo enlaza.
 */
@Component({
  imports: [...LIST_PAGE_IMPORTS, RouterLink],
  selector: 'app-fuel-logbook-report',
  templateUrl: './fuel-logbook-report.component.html',
})
export class FuelLogbookReportComponent {
  protected readonly entryTypeLabel = LOGBOOK_ENTRY_TYPE_LABEL;
  protected readonly fuelTypeLabel = FUEL_TYPE_LABEL;
  protected readonly vehicleTypeLabel = VEHICLE_TYPE_LABEL;
  protected readonly vehicleTypeOptions = VEHICLE_TYPE_OPTIONS;
  protected readonly formatDate = formatDateEs;
  protected readonly formatDateTime = formatDateTimeEs;

  protected readonly driverId = signal('');
  protected readonly unitId = signal('');
  protected readonly vehicleType = signal<VehicleType | ''>('');
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');

  protected readonly driverOptions = toSignal(
    inject(PersonnelService).listActiveOptions({ isDriver: true }),
    { initialValue: [] as PersonnelOption[] },
  );
  protected readonly unitOptions = toSignal(inject(UnitsService).listAllActiveOptions(), {
    initialValue: [] as UnitOption[],
  });

  private readonly filters = computed(() => ({
    driverId: this.driverId() || undefined,
    unitId: this.unitId() || undefined,
    vehicleType: this.vehicleType() || undefined,
    fromDate: this.fromDate() || undefined,
    toDate: this.toDate() || undefined,
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<LogbookFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  protected readonly page = toSignal(
    toObservable(this.query).pipe(switchMap((filter) => this.fuelLogbookService.list(filter))),
    { initialValue: { items: [], total: 0 } },
  );

  constructor(private readonly fuelLogbookService: FuelLogbookService) {}

  protected clearFilters(): void {
    this.driverId.set('');
    this.unitId.set('');
    this.vehicleType.set('');
    this.fromDate.set('');
    this.toDate.set('');
  }
}
