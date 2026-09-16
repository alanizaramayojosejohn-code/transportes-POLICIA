import { Component, computed, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { DrawerComponent } from '../../../shared/drawer/drawer.component';
import { DrawerTabsComponent } from '../../../shared/tabs/drawer-tabs.component';
import { TabItem } from '../../../shared/tabs/tab-item';
import { BadgeComponent } from '../../../shared/badge/badge.component';
import { ButtonDirective } from '../../../shared/button/button.directive';
import { DataCellComponent } from '../../../shared/data-cell/data-cell.component';
import { TimelineItemComponent } from '../../../shared/timeline-item/timeline-item.component';
import { FieldComponent } from '../../../shared/field/field.component';
import { FieldControlDirective } from '../../../shared/field/field-control.directive';
import { TableComponent } from '../../../shared/table/table.component';
import {
  TableCellDirective,
  TableHeadCellDirective,
  TableHeadRowDirective,
  TableRowDirective,
} from '../../../shared/table/table-parts.directive';
import { TableEmptyRowComponent } from '../../../shared/table/table-empty-row.component';
import { VehiclesService } from '../vehicles.service';
import {
  VEHICLE_CONDITION_BADGE,
  VEHICLE_CONDITION_LABEL,
  VEHICLE_TYPE_LABEL,
  VehicleConditionCode,
} from '../vehicle.model';
import { formatDateEs, formatDateTimeEs } from '../../../shared/date-format';
import { TripsService } from '../../trips/trips.service';
import { FuelRecordsService } from '../../fuel-records/fuel-records.service';
import { FUEL_TYPE_LABEL } from '../../fuel-records/fuel-record.model';
import { MaintenanceOrdersService } from '../../maintenance-orders/maintenance-orders.service';
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_TYPE_LABEL,
} from '../../maintenance-orders/maintenance-order.model';
import { VehicleDocumentsService } from '../../vehicle-documents/vehicle-documents.service';
import { DOCUMENT_TYPE_LABEL } from '../../vehicle-documents/vehicle-document.model';
import { IncidentsService } from '../../incidents/incidents.service';
import { INCIDENT_TYPE_LABEL } from '../../incidents/incident.model';

const CONDITION_CODES: VehicleConditionCode[] = [
  'BUENO',
  'REGULAR',
  'DETERIORADO',
  'FUERA_DE_USO',
  'INOPERABLE',
  'EXTRAVIADO',
  'DEVUELTO',
  'BAJA',
];

/** Orden y etiquetas de `prototipo/index.html:9557-9565` (`.drawer-tab`). */
const TABS: readonly TabItem[] = [
  { value: 'general', label: 'General' },
  { value: 'asignaciones', label: 'Asignaciones' },
  { value: 'conductores', label: 'Conductores' },
  { value: 'recorridos', label: 'Recorridos' },
  { value: 'combustible', label: 'Combustible' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'incidentes', label: 'Incidentes' },
];

const RELATED_TAKE = 20;

interface DriverSummary {
  readonly id: string;
  readonly name: string;
  readonly tripCount: number;
  readonly lastTripAt: string;
}

/**
 * Ficha del vehículo (spec 001, RF-10): datos, condición vigente e historial. Reproduce el
 * drawer dinámico real del prototipo (`prototipo/index.html:9549-9568`, `vehicleDrawer` +
 * `drawerData` en `js/app.js:1339-1575`) — no el modal estático `vehiculoDetalleModal` que
 * aparece más arriba en el mismo archivo: ese modal nunca se abre en la práctica, porque la
 * tabla de vehículos se re-renderiza por JS con botones `.vehicle-detail-btn` que abren este
 * drawer, no el modal (`data-open="vehiculoDetalleModal"` sólo existe en el HTML estático que
 * `renderVehiculos()` reemplaza al cargar la página).
 *
 * En el prototipo sólo la pestaña "General" tiene contenido real; las otras 7 son un `<h4>` +
 * una frase genérica sin datos. Aquí sí están conectadas: mismas consultas que usan las listas
 * de Recorridos, Combustible, Mantenimiento, Documentación e Incidentes, filtradas por
 * `vehicleId` (todas ya lo soportan). "Asignaciones" reutiliza el historial que ya trae el
 * vehículo; "Conductores" no tiene consulta propia (spec 001 deja la asignación de conductores
 * fuera de este módulo) y se deriva de los conductores con recorridos registrados.
 */
@Component({
  imports: [
    DrawerComponent,
    DrawerTabsComponent,
    BadgeComponent,
    ButtonDirective,
    DataCellComponent,
    TimelineItemComponent,
    FieldComponent,
    FieldControlDirective,
    TableComponent,
    TableHeadRowDirective,
    TableHeadCellDirective,
    TableRowDirective,
    TableCellDirective,
    TableEmptyRowComponent,
  ],
  selector: 'app-vehicle-detail',
  templateUrl: './vehicle-detail.component.html',
})
export class VehicleDetailComponent {
  readonly vehicleId = input.required<string>();
  readonly canWrite = input(false);
  readonly closed = output<void>();

  protected readonly tabs = TABS;
  protected readonly activeTab = signal('general');

  protected readonly conditionLabels = VEHICLE_CONDITION_LABEL;
  protected readonly conditionBadge = VEHICLE_CONDITION_BADGE;
  protected readonly typeLabels = VEHICLE_TYPE_LABEL;
  protected readonly conditionCodes = CONDITION_CODES;
  protected readonly fuelTypeLabel = FUEL_TYPE_LABEL;
  protected readonly maintenanceTypeLabel = MAINTENANCE_TYPE_LABEL;
  protected readonly maintenanceStatusLabel = MAINTENANCE_STATUS_LABEL;
  protected readonly documentTypeLabel = DOCUMENT_TYPE_LABEL;
  protected readonly incidentTypeLabel = INCIDENT_TYPE_LABEL;
  protected readonly formatDate = formatDateEs;
  protected readonly formatDateTime = formatDateTimeEs;

  protected readonly showConditionForm = signal(false);
  protected readonly newCode = signal<VehicleConditionCode>('BUENO');
  protected readonly newReason = signal('');
  protected readonly submitting = signal(false);

  private readonly vehicleId$ = toObservable(this.vehicleId);

  protected readonly vehicle = toSignal(
    this.vehicleId$.pipe(switchMap((id) => this.vehiclesService.get(id))),
    { initialValue: null },
  );

  /// "{{plate}} · {{marca}} {{modelo}}" (`js/app.js:1607-1611`); a diferencia del resto de la
  /// ficha, el prototipo omite marca/modelo si faltan en vez de mostrar un guion.
  protected readonly title = computed(() => {
    const v = this.vehicle();
    if (!v) return '';
    const brandModel = [v.brand, v.model].filter(Boolean).join(' ');
    return brandModel ? `${v.plate} · ${brandModel}` : v.plate;
  });

  protected readonly trips = toSignal(
    this.vehicleId$.pipe(
      switchMap((id) => this.tripsService.list({ vehicleId: id, take: RELATED_TAKE })),
    ),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly fuelRecords = toSignal(
    this.vehicleId$.pipe(
      switchMap((id) => this.fuelRecordsService.list({ vehicleId: id, take: RELATED_TAKE })),
    ),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly maintenanceOrders = toSignal(
    this.vehicleId$.pipe(
      switchMap((id) => this.maintenanceOrdersService.list({ vehicleId: id, take: RELATED_TAKE })),
    ),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly documents = toSignal(
    this.vehicleId$.pipe(
      switchMap((id) => this.vehicleDocumentsService.list({ vehicleId: id, take: RELATED_TAKE })),
    ),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly incidents = toSignal(
    this.vehicleId$.pipe(
      switchMap((id) => this.incidentsService.list({ vehicleId: id, take: RELATED_TAKE })),
    ),
    { initialValue: { items: [], total: 0 } },
  );

  /// Sin consulta propia (spec 001, "Fuera de alcance": asignación de conductores a vehículos es
  /// otro módulo): se deriva de qué conductores registraron recorridos con este vehículo.
  protected readonly drivers = computed<DriverSummary[]>(() => {
    const byDriver = new Map<string, DriverSummary>();
    for (const trip of this.trips().items) {
      const existing = byDriver.get(trip.driver.id);
      if (existing) {
        byDriver.set(trip.driver.id, {
          ...existing,
          tripCount: existing.tripCount + 1,
          lastTripAt:
            trip.departureAt > existing.lastTripAt ? trip.departureAt : existing.lastTripAt,
        });
      } else {
        byDriver.set(trip.driver.id, {
          id: trip.driver.id,
          name: `${trip.driver.firstName} ${trip.driver.lastName}`,
          tripCount: 1,
          lastTripAt: trip.departureAt,
        });
      }
    }
    return Array.from(byDriver.values()).sort((a, b) => b.lastTripAt.localeCompare(a.lastTripAt));
  });

  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly tripsService: TripsService,
    private readonly fuelRecordsService: FuelRecordsService,
    private readonly maintenanceOrdersService: MaintenanceOrdersService,
    private readonly vehicleDocumentsService: VehicleDocumentsService,
    private readonly incidentsService: IncidentsService,
  ) {}

  protected isExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() < Date.now();
  }

  protected async registerCondition(): Promise<void> {
    this.submitting.set(true);
    try {
      await this.vehiclesService.registerCondition(this.vehicleId(), {
        code: this.newCode(),
        reason: this.newReason() || undefined,
      });
      this.showConditionForm.set(false);
      this.newReason.set('');
    } finally {
      this.submitting.set(false);
    }
  }
}
