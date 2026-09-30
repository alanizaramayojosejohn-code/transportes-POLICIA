import { Component, Signal, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { PageHeadComponent } from '../../shared/page-head/page-head.component';
import { CardComponent } from '../../shared/card/card.component';
import { DataCellComponent } from '../../shared/data-cell/data-cell.component';
import { NoticeComponent } from '../../shared/notice/notice.component';
import { ButtonDirective } from '../../shared/button/button.directive';
import { BadgeComponent } from '../../shared/badge/badge.component';
import { FieldComponent } from '../../shared/field/field.component';
import { FieldControlDirective } from '../../shared/field/field-control.directive';
import { TableComponent } from '../../shared/table/table.component';
import { TableEmptyRowComponent } from '../../shared/table/table-empty-row.component';
import {
  TableCellDirective,
  TableHeadCellDirective,
  TableHeadRowDirective,
  TableRowDirective,
} from '../../shared/table/table-parts.directive';
import { VehicleDriverAssignmentsService } from '../vehicle-driver-assignments/vehicle-driver-assignments.service';
import { MyVehicleAssignment } from '../vehicle-driver-assignments/vehicle-driver-assignment.model';
import { OdometerReadingsService } from '../odometer-readings/odometer-readings.service';
import { TripsService } from '../trips/trips.service';
import { TripPage } from '../trips/trip.model';
import { FuelRecordsService } from '../fuel-records/fuel-records.service';
import { FUEL_TYPE_LABEL, FuelRecordPage } from '../fuel-records/fuel-record.model';
import { formatDateTimeEs } from '../../shared/date-format';
import { loadable } from '../../shared/loadable';
import { ToastService } from '../../shared/toast/toast.service';

type Panel = 'none' | 'odometer';

/**
 * «Mi vehículo» (spec 014, RF-15): página de inicio del rol CONDUCTOR. Sólo
 * muestra datos del vehículo a cargo y un resumen de su actividad reciente;
 * el registro de recorridos y de combustible vive en las pantallas
 * dedicadas (`/recorridos`, `/combustible`), acotadas a este mismo vehículo
 * cuando el usuario es CONDUCTOR (ver `TripsListComponent`/`FuelRecordsListComponent`).
 * El kilometraje suelto (RF-16) no tiene pantalla propia, así que se registra
 * aquí mismo.
 */
@Component({
  imports: [
    PageHeadComponent,
    CardComponent,
    DataCellComponent,
    NoticeComponent,
    ButtonDirective,
    BadgeComponent,
    FieldComponent,
    FieldControlDirective,
    RouterLink,
    TableComponent,
    TableEmptyRowComponent,
    TableHeadRowDirective,
    TableHeadCellDirective,
    TableRowDirective,
    TableCellDirective,
  ],
  selector: 'app-my-vehicle',
  templateUrl: './my-vehicle.component.html',
})
export class MyVehicleComponent {
  protected readonly assignment: Signal<MyVehicleAssignment | null>;
  protected readonly recentTrips: Signal<TripPage>;
  protected readonly recentTripsLoading: Signal<boolean>;
  protected readonly recentFuelRecords: Signal<FuelRecordPage>;
  protected readonly recentFuelRecordsLoading: Signal<boolean>;

  protected readonly panel = signal<Panel>('none');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly formatDateTime = formatDateTimeEs;
  protected readonly fuelTypeLabel = FUEL_TYPE_LABEL;

  protected readonly odometerValue = signal<number | null>(null);
  protected readonly odometerNotes = signal('');

  private readonly toast = inject(ToastService);

  constructor(
    private readonly vehicleDriverAssignmentsService: VehicleDriverAssignmentsService,
    private readonly odometerReadingsService: OdometerReadingsService,
    private readonly tripsService: TripsService,
    private readonly fuelRecordsService: FuelRecordsService,
  ) {
    // Se asigna aquí, no como inicializador de campo: un inicializador de
    // campo se ejecuta antes de que las propiedades de parámetro del
    // constructor queden asignadas (mismo motivo que UnitFormComponent).
    this.assignment = toSignal(this.vehicleDriverAssignmentsService.myAssignment(), {
      initialValue: null,
    });
    const trips = loadable(
      this.assignment,
      (assignment) =>
        assignment
          ? this.tripsService.list({ vehicleId: assignment.vehicleId, take: 5 })
          : of({ items: [], total: 0 }),
      { items: [], total: 0 },
    );
    this.recentTrips = trips.value;
    this.recentTripsLoading = trips.loading;
    const fuelRecords = loadable(
      this.assignment,
      (assignment) =>
        assignment
          ? this.fuelRecordsService.list({ vehicleId: assignment.vehicleId, take: 5 })
          : of({ items: [], total: 0 }),
      { items: [], total: 0 },
    );
    this.recentFuelRecords = fuelRecords.value;
    this.recentFuelRecordsLoading = fuelRecords.loading;
  }

  protected toggleOdometerPanel(): void {
    this.errorMessage.set(null);
    const opening = this.panel() !== 'odometer';
    this.panel.set(opening ? 'odometer' : 'none');
    if (opening) {
      this.odometerValue.set(this.assignment()?.vehicle.lastOdometer ?? null);
    }
  }

  protected async registerOdometer(): Promise<void> {
    const vehicleId = this.assignment()?.vehicleId;
    if (!vehicleId || this.odometerValue() === null) {
      this.errorMessage.set('Indique el kilometraje actual.');
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.odometerReadingsService.register({
        vehicleId,
        value: this.odometerValue()!,
        notes: this.odometerNotes() || undefined,
      });
      const registered = this.odometerValue()!;
      this.odometerValue.set(null);
      this.odometerNotes.set('');
      this.panel.set('none');
      this.toast.success(`Kilometraje registrado: ${registered} km.`);
    } catch (error) {
      this.errorMessage.set(this.toast.reportError(error, 'No se pudo completar la operación.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
