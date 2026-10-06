import { Component, computed, linkedSignal, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { VehicleHistoryService } from './vehicle-history.service';
import {
  INCIDENT_SEVERITY_LABEL,
  VEHICLE_HISTORY_ENTRY_TYPE_LABEL,
  VEHICLE_HISTORY_ENTRY_TYPES,
  VehicleHistoryEntry,
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
import { loadable } from '../../../shared/loadable';
import { NoticeComponent } from '../../../shared/notice/notice.component';
import { formatDateEs, formatDateTimeEs } from '../../../shared/date-format';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { ReportColumn } from '../../../shared/export/report-export';

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
  protected readonly loading: Signal<boolean>;

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
    const result = loadable<VehicleHistoryFilter, VehicleHistoryPage>(
      this.query,
      (filter) => {
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
      },
      { items: [], total: 0 },
    );
    this.page = result.value;
    this.loading = result.loading;
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

  /// Misma lógica que el `@switch` de la plantilla (columna «Detalle»), pero en texto plano: el
  /// Excel/PDF no puede renderizar los `<span>` de matiz que ahí se usan.
  private detailText(entry: VehicleHistoryEntry): string {
    switch (entry.type) {
      case 'UNIT_ASSIGNMENT': {
        const base = `Asignado a ${entry.unitName || 'unidad sin nombre'}`;
        return entry.description ? `${base} · ${entry.description}` : base;
      }
      case 'DRIVER_ASSIGNMENT':
        return `Encargado: ${
          entry.driver
            ? `${entry.driver.rank ? entry.driver.rank + ' ' : ''}${entry.driver.firstName} ${entry.driver.lastName}`
            : 'Sin conductor'
        }`;
      case 'TRIP': {
        const driver = entry.driver
          ? `${entry.driver.firstName} ${entry.driver.lastName}`
          : 'Sin conductor';
        const parts = [entry.destination || 'Sin destino', driver];
        parts.push(entry.returnAt ? `retorno ${this.formatDateTime(entry.returnAt)}` : 'en curso');
        if (entry.distanceKm !== null) parts.push(`${entry.distanceKm} km`);
        return parts.join(' · ');
      }
      case 'FUEL': {
        const parts = [
          entry.fuelType ? this.fuelTypeLabel[entry.fuelType] : '—',
          `${entry.quantity} L`,
          `Bs. ${entry.amount?.toFixed(2)}`,
        ];
        if (entry.station) parts.push(entry.station);
        return parts.join(' · ');
      }
      case 'MAINTENANCE': {
        const parts = [
          entry.maintenanceType ? this.maintenanceTypeLabel[entry.maintenanceType] : '—',
          entry.maintenanceStatus ? this.maintenanceStatusLabel[entry.maintenanceStatus] : '—',
        ];
        if (entry.workshopName) parts.push(entry.workshopName);
        if (entry.amount !== null) parts.push(`Bs. ${entry.amount.toFixed(2)}`);
        return parts.join(' · ');
      }
      case 'INCIDENT': {
        const parts = [entry.incidentType ? this.incidentTypeLabel[entry.incidentType] : '—'];
        if (entry.incidentSeverity) parts.push(this.incidentSeverityLabel[entry.incidentSeverity]);
        if (entry.place) parts.push(entry.place);
        return parts.join(' · ');
      }
      case 'STOCK_MOVEMENT': {
        const parts = [
          entry.stockMovementType ? this.stockMovementTypeLabel[entry.stockMovementType] : '—',
          entry.sparePartName || 'Artículo',
          `${entry.quantity}`,
        ];
        if (entry.description) parts.push(entry.description);
        return parts.join(' · ');
      }
    }
  }

  protected readonly exportColumns: ReportColumn<VehicleHistoryEntry>[] = [
    { header: 'Fecha', accessor: (e) => this.formatDateTime(e.occurredAt) },
    { header: 'Tipo', accessor: (e) => this.entryTypeLabel[e.type] },
    { header: 'Detalle', accessor: (e) => this.detailText(e) },
  ];

  protected readonly filtersSummary = computed(() => {
    const parts: string[] = [];
    if (this.needsVehiclePicker() && this.vehicleId()) {
      const plate = this.vehicleOptions().find((v) => v.id === this.vehicleId())?.plate;
      if (plate) parts.push(`Vehículo: ${plate}`);
    }
    if (this.selectedTypes().length > 0) {
      parts.push(
        `Tipo: ${this.selectedTypes()
          .map((t) => this.entryTypeLabel[t])
          .join(', ')}`,
      );
    }
    if (this.fromDate()) parts.push(`Desde: ${formatDateEs(this.fromDate())}`);
    if (this.toDate()) parts.push(`Hasta: ${formatDateEs(this.toDate())}`);
    return parts.length ? parts.join(' · ') : undefined;
  });

  protected readonly fetchAllForExport = () => {
    const filter = this.filters();
    if (this.needsVehiclePicker() && !filter.vehicleId) {
      return Promise.resolve<VehicleHistoryEntry[]>([]);
    }
    return this.vehicleHistoryService.listAll(filter);
  };
}
