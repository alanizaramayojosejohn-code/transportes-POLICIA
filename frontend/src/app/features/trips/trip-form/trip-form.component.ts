import { Component, effect, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { TripsService } from '../trips.service';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';
import { PersonnelOption, PersonnelService } from '../../personnel/personnel.service';
import { CurrentRoleService } from '../../../core/current-role.service';
import { VehicleDriverAssignmentsService } from '../../vehicle-driver-assignments/vehicle-driver-assignments.service';
import { MyVehicleAssignment } from '../../vehicle-driver-assignments/vehicle-driver-assignment.model';

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
    if (
      !this.vehicleId() ||
      !this.driverId() ||
      !this.destination().trim() ||
      this.departureOdometer() === null
    ) {
      this.errorMessage.set(
        'Vehículo, conductor, destino y kilometraje de salida son obligatorios.',
      );
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
