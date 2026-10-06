import { Component, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PageHeadComponent } from '../../../shared/page-head/page-head.component';
import { CardComponent } from '../../../shared/card/card.component';
import { StatCardComponent } from '../../../shared/stat-card/stat-card.component';
import { DataCellComponent } from '../../../shared/data-cell/data-cell.component';
import { BadgeComponent } from '../../../shared/badge/badge.component';
import { TableComponent } from '../../../shared/table/table.component';
import { TableEmptyRowComponent } from '../../../shared/table/table-empty-row.component';
import {
  TableCellDirective,
  TableHeadCellDirective,
  TableHeadRowDirective,
  TableRowDirective,
} from '../../../shared/table/table-parts.directive';
import { UnitsService } from '../../units/units.service';
import { UnitPage } from '../../units/unit.model';
import { VehiclesService } from '../../vehicles/vehicles.service';
import { VehiclePage } from '../../vehicles/vehicle.model';
import { PersonnelService } from '../../personnel/personnel.service';
import { PersonnelPage } from '../../personnel/personnel.model';
import { TripsService } from '../../trips/trips.service';
import { TripPage } from '../../trips/trip.model';
import { FuelRecordsService } from '../../fuel-records/fuel-records.service';
import { FUEL_TYPE_LABEL, FuelRecordPage } from '../../fuel-records/fuel-record.model';
import { IncidentsService } from '../../incidents/incidents.service';
import { INCIDENT_TYPE_LABEL, IncidentPage } from '../../incidents/incident.model';
import { formatDateEs, formatDateTimeEs } from '../../../shared/date-format';
import { loadableOf } from '../../../shared/loadable';

const RECENT_TAKE = 5;

/**
 * Panel de inicio del rol TRANSPORTES: reemplaza al panel general (spec 012),
 * que agrega datos de todo el parque, por uno acotado a su propia unidad —
 * mismo alcance que ya aplica el backend a Vehículos/Conductores/Recorridos/
 * Combustible/Incidentes/Asignaciones para este rol (spec 015, RF-12). No
 * hay endpoint de agregados propio: reutiliza los mismos `list()` que las
 * pantallas de cada módulo, ya acotados, en vez de duplicar lógica.
 */
@Component({
  imports: [
    PageHeadComponent,
    CardComponent,
    StatCardComponent,
    DataCellComponent,
    BadgeComponent,
    RouterLink,
    TableComponent,
    TableEmptyRowComponent,
    TableHeadRowDirective,
    TableHeadCellDirective,
    TableRowDirective,
    TableCellDirective,
  ],
  selector: 'app-transportes-dashboard',
  templateUrl: './transportes-dashboard.component.html',
})
export class TransportesDashboardComponent {
  protected readonly formatDate = formatDateEs;
  protected readonly formatDateTime = formatDateTimeEs;
  protected readonly fuelTypeLabel = FUEL_TYPE_LABEL;
  protected readonly incidentTypeLabel = INCIDENT_TYPE_LABEL;

  protected readonly units: Signal<UnitPage>;
  protected readonly vehicles: Signal<VehiclePage>;
  protected readonly drivers: Signal<PersonnelPage>;
  protected readonly openTrips: Signal<TripPage>;
  protected readonly recentTrips: Signal<TripPage>;
  protected readonly recentTripsLoading: Signal<boolean>;
  protected readonly recentFuelRecords: Signal<FuelRecordPage>;
  protected readonly recentFuelRecordsLoading: Signal<boolean>;
  protected readonly recentIncidents: Signal<IncidentPage>;
  protected readonly recentIncidentsLoading: Signal<boolean>;

  constructor(
    private readonly unitsService: UnitsService,
    private readonly vehiclesService: VehiclesService,
    private readonly personnelService: PersonnelService,
    private readonly tripsService: TripsService,
    private readonly fuelRecordsService: FuelRecordsService,
    private readonly incidentsService: IncidentsService,
  ) {
    this.units = toSignal(this.unitsService.list({ take: 10 }), {
      initialValue: { items: [], total: 0 },
    });
    this.vehicles = toSignal(this.vehiclesService.list({ take: 100 }), {
      initialValue: { items: [], total: 0 },
    });
    this.drivers = toSignal(
      this.personnelService.list({ isDriver: true, isActive: true, take: 100 }),
      { initialValue: { items: [], total: 0 } },
    );
    this.openTrips = toSignal(this.tripsService.list({ open: true, take: 100 }), {
      initialValue: { items: [], total: 0 },
    });
    const recentTrips = loadableOf(this.tripsService.list({ take: RECENT_TAKE }), {
      items: [],
      total: 0,
    });
    this.recentTrips = recentTrips.value;
    this.recentTripsLoading = recentTrips.loading;
    const recentFuelRecords = loadableOf(this.fuelRecordsService.list({ take: RECENT_TAKE }), {
      items: [],
      total: 0,
    });
    this.recentFuelRecords = recentFuelRecords.value;
    this.recentFuelRecordsLoading = recentFuelRecords.loading;
    const recentIncidents = loadableOf(this.incidentsService.list({ take: RECENT_TAKE }), {
      items: [],
      total: 0,
    });
    this.recentIncidents = recentIncidents.value;
    this.recentIncidentsLoading = recentIncidents.loading;
  }
}
