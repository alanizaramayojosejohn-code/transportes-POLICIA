import { Component, computed, effect, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { TripsService } from '../trips.service';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';
import { PersonnelOption, PersonnelService } from '../../personnel/personnel.service';
import { CurrentRoleService } from '../../../core/current-role.service';
import { VehicleDriverAssignmentsService } from '../../vehicle-driver-assignments/vehicle-driver-assignments.service';
import { MyVehicleAssignment } from '../../vehicle-driver-assignments/vehicle-driver-assignment.model';
import { FormValidation } from '../../../shared/validation/form-validation';
import { combine, max, min, required } from '../../../shared/validation/validators';

interface TripFormShape {
  vehicleId: string;
  driverId: string;
  destination: string;
  departureAt: string;
  departureOdometer: number | null;
  departureFuelLevel: number | null;
}

/**
 * Registro de salida de un recorrido (spec 006, RF-1). Un CONDUCTOR (spec
 * 014) no elige vehículo ni conductor: actúa siempre sobre su propio
 * vehículo a cargo, igual que en «Mi vehículo» (RF-13).
 */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-trip-form',
  templateUrl: './trip-form.component.html',
})
export class TripFormComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly vehicles: () => VehicleOption[];
  protected readonly drivers: () => PersonnelOption[];
  protected readonly myAssignment: () => MyVehicleAssignment | null;

  protected readonly isConductor: boolean;

  protected readonly vehicleId = signal('');
  protected readonly driverId = signal('');
  protected readonly destination = signal('');
  protected readonly departureAt = signal(new Date().toISOString().slice(0, 16));
  protected readonly departureOdometer = signal<number | null>(null);
  protected readonly departureFuelLevel = signal<number | null>(null);
  protected readonly departureConditionNotes = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly formShape = computed<TripFormShape>(() => ({
    vehicleId: this.vehicleId(),
    driverId: this.driverId(),
    destination: this.destination(),
    departureAt: this.departureAt(),
    departureOdometer: this.departureOdometer(),
    departureFuelLevel: this.departureFuelLevel(),
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
  });

  constructor(
    private readonly tripsService: TripsService,
    private readonly vehiclesService: VehiclesService,
    private readonly personnelService: PersonnelService,
    currentRole: CurrentRoleService,
    vehicleDriverAssignmentsService: VehicleDriverAssignmentsService,
  ) {
    this.isConductor = currentRole.role() === 'CONDUCTOR';
    this.vehicles = toSignal(this.vehiclesService.listAllActiveOptions(), { initialValue: [] });
    this.drivers = toSignal(this.personnelService.listActiveOptions({ isDriver: true }), {
      initialValue: [],
    });
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
    try {
      await this.tripsService.create({
        vehicleId: this.vehicleId(),
        driverId: this.driverId(),
        destination: this.destination(),
        departureAt: new Date(this.departureAt()).toISOString(),
        departureOdometer: this.departureOdometer()!,
        departureFuelLevel: this.departureFuelLevel() ?? undefined,
        departureConditionNotes: this.departureConditionNotes() || undefined,
      });
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo registrar la salida.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
