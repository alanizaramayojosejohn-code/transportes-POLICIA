import { Component, Signal, computed, effect, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { ToastService } from '../../../shared/toast/toast.service';
import { TripsService } from '../trips.service';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';
import { PersonnelOption, PersonnelService } from '../../personnel/personnel.service';
import { AuthService } from '../../../core/auth.service';
import { ConnectivityService } from '../../../core/offline/connectivity.service';
import { CurrentRoleService } from '../../../core/current-role.service';
import { VehicleDriverAssignmentsService } from '../../vehicle-driver-assignments/vehicle-driver-assignments.service';
import { MyVehicleAssignment } from '../../vehicle-driver-assignments/vehicle-driver-assignment.model';
import { toDateTimeInputValue } from '../../../shared/date-format';
import { FormValidation } from '../../../shared/validation/form-validation';
import { combine, max, min, required, requiredIf } from '../../../shared/validation/validators';
import { TripOutboxMeta } from '../offline/trip-outbox.service';
import { TripConditionFieldComponent } from '../trip-condition-field/trip-condition-field.component';
import { TripConditionSelection, composeConditionNotes } from '../trip-condition';

interface TripFormShape {
  vehicleId: string;
  driverId: string;
  destination: string;
  departureAt: string;
  departureOdometer: number | null;
  departureFuelLevel: number | null;
  conditionCode: TripConditionSelection;
  conditionOther: string;
}

/**
 * Registro de salida de un recorrido (spec 006, RF-1). Un CONDUCTOR (spec
 * 014) no elige vehículo ni conductor: actúa siempre sobre su propio
 * vehículo a cargo, igual que en «Mi vehículo» (RF-13).
 */
@Component({
  imports: [...FORM_MODAL_IMPORTS, TripConditionFieldComponent],
  selector: 'app-trip-form',
  templateUrl: './trip-form.component.html',
})
export class TripFormComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly vehicles: Signal<VehicleOption[]>;
  protected readonly drivers: Signal<PersonnelOption[]>;
  protected readonly myAssignment: Signal<MyVehicleAssignment | null>;

  protected readonly isConductor: boolean;

  protected readonly vehicleId = signal('');
  protected readonly driverId = signal('');
  protected readonly destination = signal('');
  protected readonly departureAt = signal(toDateTimeInputValue());
  protected readonly departureOdometer = signal<number | null>(null);
  protected readonly departureFuelLevel = signal<number | null>(null);
  protected readonly conditionCode = signal<TripConditionSelection>('');
  protected readonly conditionOther = signal('');
  protected readonly observations = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly formShape = computed<TripFormShape>(() => ({
    vehicleId: this.vehicleId(),
    driverId: this.driverId(),
    destination: this.destination(),
    departureAt: this.departureAt(),
    departureOdometer: this.departureOdometer(),
    departureFuelLevel: this.departureFuelLevel(),
    conditionCode: this.conditionCode(),
    conditionOther: this.conditionOther(),
  }));
  protected readonly validation = new FormValidation(this.formShape, {
    vehicleId: required('Seleccione un vehículo.'),
    driverId: required('Seleccione un conductor.'),
    destination: required('Ingrese el destino del recorrido.'),
    departureAt: required('Ingrese la fecha y hora de salida.'),
    departureOdometer: combine<number | null, TripFormShape>(
      required('Ingrese el kilometraje de salida.'),
      min(0, 'El kilometraje no puede ser negativo.'),
    ),
    departureFuelLevel: combine<number | null, TripFormShape>(
      min(0, 'El nivel de combustible no puede ser menor a 0%.'),
      max(100, 'El nivel de combustible no puede ser mayor a 100%.'),
    ),
    /// El estado es opcional, pero «Otro» sin describir no dice nada.
    conditionOther: requiredIf<string, TripFormShape>(
      (form) => form.conditionCode === 'OTRO',
      'Describa el estado del vehículo.',
    ),
  });

  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  /** Para avisar, antes de guardar, que el registro va a quedar en cola. */
  protected readonly online = inject(ConnectivityService).online;

  constructor(
    private readonly tripsService: TripsService,
    vehiclesService: VehiclesService,
    personnelService: PersonnelService,
    currentRole: CurrentRoleService,
    vehicleDriverAssignmentsService: VehicleDriverAssignmentsService,
  ) {
    this.isConductor = currentRole.role() === 'CONDUCTOR';
    /// Un CONDUCTOR no elige ni vehículo ni conductor, así que ni se piden:
    /// son dos consultas que su rol no necesita y que sin conexión sólo
    /// podrían fallar (`toSignal` relanza el error en cada lectura).
    this.vehicles = this.isConductor
      ? signal<VehicleOption[]>([])
      : toSignal(vehiclesService.listAllActiveOptions(), { initialValue: [] });
    this.drivers = this.isConductor
      ? signal<PersonnelOption[]>([])
      : toSignal(personnelService.listActiveOptions({ isDriver: true }), { initialValue: [] });
    this.myAssignment = toSignal(vehicleDriverAssignmentsService.myAssignment(), {
      initialValue: null,
    });
    effect(() => {
      const assignment = this.myAssignment();
      if (this.isConductor && assignment) {
        this.vehicleId.set(assignment.vehicleId);
        this.driverId.set(assignment.driverId);
      }
    });
  }

  protected onOdometerInput(value: string): void {
    this.departureOdometer.set(value === '' ? null : Number(value));
  }

  protected onFuelLevelInput(value: string): void {
    this.departureFuelLevel.set(value === '' ? null : Number(value));
  }

  protected async submit(): Promise<void> {
    if (!this.validation.validateAll()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const meta = this.outboxMeta();
    try {
      const result = await this.tripsService.create(
        {
          vehicleId: this.vehicleId(),
          driverId: this.driverId(),
          destination: this.destination(),
          departureAt: new Date(this.departureAt()).toISOString(),
          departureOdometer: this.departureOdometer()!,
          departureFuelLevel: this.departureFuelLevel() ?? undefined,
          departureConditionNotes: composeConditionNotes(
            this.conditionCode(),
            this.conditionOther(),
            this.observations(),
          ),
        },
        meta,
      );
      if (result.queued) {
        this.toast.info(
          `Salida a ${this.destination()} guardada sin conexión; se enviará al reconectar.`,
        );
      } else {
        this.toast.success(
          `Salida a ${this.destination()} registrada para el vehículo ${meta.vehiclePlate}.`,
        );
      }
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(this.toast.reportError(error, 'No se pudo registrar la salida.'));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Placa y conductor en texto, para que la cola pueda describir el
   * pendiente sin volver a consultar al servidor. Un CONDUCTOR los toma de
   * su propio encargo y de su sesión: las listas de opciones no se cargan
   * para su rol.
   */
  private outboxMeta(): TripOutboxMeta {
    if (this.isConductor) {
      return {
        vehiclePlate: this.myAssignment()?.vehicle.plate ?? 'Sin placa',
        driverName: this.auth.currentUser()?.fullName ?? 'Conductor',
      };
    }
    const driver = this.drivers().find((candidate) => candidate.id === this.driverId());
    return {
      vehiclePlate:
        this.vehicles().find((candidate) => candidate.id === this.vehicleId())?.plate ??
        'Sin placa',
      driverName: driver ? `${driver.firstName} ${driver.lastName}` : 'Conductor',
    };
  }
}
