import { Component, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { PageHeadComponent } from '../../shared/page-head/page-head.component';
import { CardComponent } from '../../shared/card/card.component';
import { DataCellComponent } from '../../shared/data-cell/data-cell.component';
import { NoticeComponent } from '../../shared/notice/notice.component';
import { ButtonDirective } from '../../shared/button/button.directive';
import { FieldComponent } from '../../shared/field/field.component';
import { FieldControlDirective } from '../../shared/field/field-control.directive';
import { VehicleDriverAssignmentsService } from '../vehicle-driver-assignments/vehicle-driver-assignments.service';
import { MyVehicleAssignment } from '../vehicle-driver-assignments/vehicle-driver-assignment.model';
import { OdometerReadingsService } from '../odometer-readings/odometer-readings.service';
import { FuelRecordsService } from '../fuel-records/fuel-records.service';
import { FUEL_TYPE_LABEL, FUEL_TYPES, FuelType } from '../fuel-records/fuel-record.model';
import { TripsService } from '../trips/trips.service';
import { TripPage } from '../trips/trip.model';
import { formatDateTimeEs } from '../../shared/date-format';

type Panel = 'none' | 'odometer' | 'fuel' | 'trip';

/**
 * «Mi vehículo» (spec 014, RF-15): pantalla del rol CONDUCTOR sobre el
 * vehículo del que es encargado vigente. Sin selects de vehículo/conductor:
 * los tres registros (kilometraje, combustible, recorrido) actúan siempre
 * sobre `myVehicleAssignment`, nunca sobre un vehículo elegido a mano.
 */
@Component({
  imports: [
    PageHeadComponent,
    CardComponent,
    DataCellComponent,
    NoticeComponent,
    ButtonDirective,
    FieldComponent,
    FieldControlDirective,
  ],
  selector: 'app-my-vehicle',
  templateUrl: './my-vehicle.component.html',
})
export class MyVehicleComponent {
  protected readonly assignment: Signal<MyVehicleAssignment | null>;
  protected readonly openTrip: Signal<TripPage>;

  protected readonly panel = signal<Panel>('none');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly formatDateTime = formatDateTimeEs;

  protected readonly odometerValue = signal<number | null>(null);
  protected readonly odometerNotes = signal('');

  protected readonly fuelTypes = FUEL_TYPES;
  protected readonly fuelTypeLabel = FUEL_TYPE_LABEL;
  protected readonly fuelType = signal<FuelType>('DIESEL');
  protected readonly fuelQuantity = signal<number | null>(null);
  protected readonly fuelUnitPrice = signal<number | null>(null);
  protected readonly fuelStation = signal('');
  protected readonly fuelOdometer = signal<number | null>(null);

  protected readonly tripDestination = signal('');
  protected readonly tripOdometer = signal<number | null>(null);
  protected readonly tripFuelLevel = signal<number | null>(null);
  protected readonly returnOdometer = signal<number | null>(null);
  protected readonly returnFuelLevel = signal<number | null>(null);
  protected readonly damagesFound = signal('');

  constructor(
    private readonly vehicleDriverAssignmentsService: VehicleDriverAssignmentsService,
    private readonly odometerReadingsService: OdometerReadingsService,
    private readonly fuelRecordsService: FuelRecordsService,
    private readonly tripsService: TripsService,
  ) {
    // Se asigna aquí, no como inicializador de campo: un inicializador de
    // campo se ejecuta antes de que las propiedades de parámetro del
    // constructor queden asignadas (mismo motivo que UnitFormComponent).
    this.assignment = toSignal(this.vehicleDriverAssignmentsService.myAssignment(), {
      initialValue: null,
    });
    this.openTrip = toSignal(
      toObservable(this.assignment).pipe(
        switchMap((assignment) =>
          assignment
            ? this.tripsService.list({ vehicleId: assignment.vehicleId, open: true, take: 1 })
            : of({ items: [], total: 0 }),
        ),
      ),
      { initialValue: { items: [], total: 0 } },
    );
  }

  protected openPanel(panel: Panel): void {
    this.errorMessage.set(null);
    const opening = this.panel() !== panel;
    this.panel.set(opening ? panel : 'none');
    if (!opening) {
      return;
    }
    const lastOdometer = this.assignment()?.vehicle.lastOdometer ?? null;
    if (panel === 'odometer') {
      this.odometerValue.set(lastOdometer);
    } else if (panel === 'fuel') {
      this.fuelOdometer.set(lastOdometer);
    } else if (panel === 'trip') {
      this.tripOdometer.set(lastOdometer);
    }
  }

  protected async registerOdometer(): Promise<void> {
    const vehicleId = this.assignment()?.vehicleId;
    if (!vehicleId || this.odometerValue() === null) {
      this.errorMessage.set('Indique el kilometraje actual.');
      return;
    }
    await this.run(async () => {
      await this.odometerReadingsService.register({
        vehicleId,
        value: this.odometerValue()!,
        notes: this.odometerNotes() || undefined,
      });
      this.odometerValue.set(null);
      this.odometerNotes.set('');
    });
  }

  protected async registerFuel(): Promise<void> {
    const vehicleId = this.assignment()?.vehicleId;
    if (
      !vehicleId ||
      this.fuelQuantity() === null ||
      this.fuelUnitPrice() === null ||
      this.fuelOdometer() === null
    ) {
      this.errorMessage.set('Cantidad, precio unitario y kilometraje son obligatorios.');
      return;
    }
    await this.run(async () => {
      await this.fuelRecordsService.create({
        vehicleId,
        suppliedAt: new Date().toISOString(),
        fuelType: this.fuelType(),
        quantity: this.fuelQuantity()!,
        unitPrice: this.fuelUnitPrice()!,
        station: this.fuelStation() || undefined,
        odometer: this.fuelOdometer()!,
      });
      this.fuelQuantity.set(null);
      this.fuelUnitPrice.set(null);
      this.fuelStation.set('');
      this.fuelOdometer.set(null);
    });
  }

  protected async registerDeparture(): Promise<void> {
    const assignment = this.assignment();
    if (!assignment || !this.tripDestination().trim() || this.tripOdometer() === null) {
      this.errorMessage.set('Destino y kilometraje de salida son obligatorios.');
      return;
    }
    await this.run(async () => {
      await this.tripsService.create({
        vehicleId: assignment.vehicleId,
        driverId: assignment.driverId,
        destination: this.tripDestination(),
        departureAt: new Date().toISOString(),
        departureOdometer: this.tripOdometer()!,
        departureFuelLevel: this.tripFuelLevel() ?? undefined,
      });
      this.tripDestination.set('');
      this.tripOdometer.set(null);
      this.tripFuelLevel.set(null);
    });
  }

  protected async registerArrival(): Promise<void> {
    const trip = this.openTrip().items[0];
    if (!trip || this.returnOdometer() === null) {
      this.errorMessage.set('Indique el kilometraje de llegada.');
      return;
    }
    await this.run(async () => {
      await this.tripsService.close(trip.id, {
        returnOdometer: this.returnOdometer()!,
        returnFuelLevel: this.returnFuelLevel() ?? undefined,
        damagesFound: this.damagesFound() || undefined,
      });
      this.returnOdometer.set(null);
      this.returnFuelLevel.set(null);
      this.damagesFound.set('');
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await action();
      this.panel.set('none');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo completar la operación.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
