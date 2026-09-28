import { Component, computed, linkedSignal, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { VehicleHistoryService } from './vehicle-history.service';
import {
  INCIDENT_SEVERITY_LABEL,
  VEHICLE_HISTORY_ENTRY_TYPE_LABEL,
  VEHICLE_HISTORY_ENTRY_TYPES,
  VehicleHistoryEntryType,
  VehicleHistoryFilter,
  VehicleHistoryPage,
} from './vehicle-history.model';
import { FUEL_TYPE_LABEL } from '../../fuel-records/fuel-record.model';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_TYPE_LABEL,
} from '../../maintenance-orders/maintenance-order.model';
import { INCIDENT_TYPE_LABEL } from '../../incidents/incident.model';
import { STOCK_MOVEMENT_TYPE_LABEL } from '../../inventory/spare-part.model';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';
import { CurrentRoleService } from '../../../core/current-role.service';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { NoticeComponent } from '../../../shared/notice/notice.component';
import { formatDateTimeEs } from '../../../shared/date-format';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';

const TYPE_BADGE_TONE: Record<
  VehicleHistoryEntryType,
  'green' | 'amber' | 'red' | 'gray' | 'blue'
> = {
  UNIT_ASSIGNMENT: 'blue',
  DRIVER_ASSIGNMENT: 'blue',
  TRIP: 'blue',
  FUEL: 'amber',
  MAINTENANCE: 'gray',
  INCIDENT: 'red',
  STOCK_MOVEMENT: 'green',
};

/**
 * Reporte «Historial integral del vehículo» (spec 018, RF-12 a RF-17):
 * ADMINISTRADOR, CONSULTA y TRANSPORTES eligen un vehículo y ven su historial
 * completo; CONDUCTOR no elige — ve automáticamente el vehículo del que está
 * a cargo, acotado a lo ocurrido desde que quedó a cargo (lo resuelve el
 * backend, aquí sólo se oculta el selector).
 */
@Component({
  imports: [...LIST_PAGE_IMPORTS, RouterLink, NoticeComponent],
  selector: 'app-vehicle-history',
  templateUrl: './vehicle-history.component.html',
})
export class VehicleHistoryComponent {
  protected readonly entryTypeLabel = VEHICLE_HISTORY_ENTRY_TYPE_LABEL;
  protected readonly entryTypes = VEHICLE_HISTORY_ENTRY_TYPES;
  protected readonly entryTypeBadgeTone = TYPE_BADGE_TONE;
  protected readonly fuelTypeLabel = FUEL_TYPE_LABEL;
  protected readonly maintenanceTypeLabel = MAINTENANCE_TYPE_LABEL;
  protected readonly maintenanceStatusLabel = MAINTENANCE_STATUS_LABEL;
  protected readonly incidentTypeLabel = INCIDENT_TYPE_LABEL;
  protected readonly incidentSeverityLabel = INCIDENT_SEVERITY_LABEL;
  protected readonly stockMovementTypeLabel = STOCK_MOVEMENT_TYPE_LABEL;
  protected readonly formatDateTime = formatDateTimeEs;

  protected readonly needsVehiclePicker = computed(() => this.currentRole.role() !== 'CONDUCTOR');
  protected readonly vehicleOptions: Signal<VehicleOption[]>;

  protected readonly vehicleId = signal('');
  protected readonly selectedTypes = signal<VehicleHistoryEntryType[]>([]);
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');
  protected readonly errorMessage = signal<string | null>(null);

  private readonly filters = computed(() => ({
    vehicleId: this.vehicleId() || undefined,
    types: this.selectedTypes().length > 0 ? this.selectedTypes() : undefined,
    fromDate: this.fromDate() || undefined,
    toDate: this.toDate() || undefined,
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<VehicleHistoryFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  protected readonly page: Signal<VehicleHistoryPage>;

  constructor(
    private readonly vehicleHistoryService: VehicleHistoryService,
    private readonly vehiclesService: VehiclesService,
    protected readonly currentRole: CurrentRoleService,
  ) {
    // Se asigna aquí, no como inicializador de campo: un inicializador de
    // campo se ejecuta antes de que las propiedades de parámetro del
    // constructor queden asignadas (mismo motivo que MyVehicleComponent).
    this.vehicleOptions = toSignal(this.vehiclesService.listAllActiveOptions(), {
      initialValue: [],
    });
    this.page = toSignal(
      toObservable(this.query).pipe(
        switchMap((filter) => {
          this.errorMessage.set(null);
          if (this.needsVehiclePicker() && !filter.vehicleId) {
            return of({ items: [], total: 0 });
          }
          return this.vehicleHistoryService.list(filter).pipe(
            catchError((error) => {
              this.errorMessage.set(
                error instanceof Error ? error.message : 'No se pudo generar el historial.',
              );
              return of({ items: [], total: 0 });
            }),
          );
        }),
      ),
      { initialValue: { items: [], total: 0 } },
    );
  }

  /// Ninguno de estos reinicia la página a mano: `skip` es un `linkedSignal`
  /// sobre `filters`, así que vuelve a 0 solo al cambiar cualquier filtro.
  protected setVehicle(id: string): void {
    this.vehicleId.set(id);
  }

  protected toggleType(type: VehicleHistoryEntryType): void {
    this.selectedTypes.update((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    );
  }

  protected setFromDate(value: string): void {
    this.fromDate.set(value);
  }

  protected setToDate(value: string): void {
    this.toDate.set(value);
  }

  protected clearFilters(): void {
    this.selectedTypes.set([]);
    this.fromDate.set('');
    this.toDate.set('');
  }
}
