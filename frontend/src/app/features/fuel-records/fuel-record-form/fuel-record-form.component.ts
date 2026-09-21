import { Component, effect, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { FuelRecordsService } from '../fuel-records.service';
import { FUEL_TYPE_LABEL, FUEL_TYPES, FuelType } from '../fuel-record.model';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';
import { PersonnelOption, PersonnelService } from '../../personnel/personnel.service';
import { CurrentRoleService } from '../../../core/current-role.service';
import { VehicleDriverAssignmentsService } from '../../vehicle-driver-assignments/vehicle-driver-assignments.service';
import { MyVehicleAssignment } from '../../vehicle-driver-assignments/vehicle-driver-assignment.model';

/**
 * Registro de abastecimiento (spec 007, RF-1). Un CONDUCTOR (spec 014) sólo
 * carga combustible del vehículo del que es encargado, a su propio nombre:
 * no elige vehículo ni conductor.
 */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-fuel-record-form',
  templateUrl: './fuel-record-form.component.html',
})
export class FuelRecordFormComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly fuelTypes = FUEL_TYPES;
  protected readonly fuelTypeLabel = FUEL_TYPE_LABEL;
  protected readonly vehicles: () => VehicleOption[];
  protected readonly drivers: () => PersonnelOption[];
  protected readonly myAssignment: () => MyVehicleAssignment | null;

  protected readonly isConductor: boolean;

  protected readonly vehicleId = signal('');
  protected readonly driverId = signal('');
  protected readonly suppliedAt = signal(new Date().toISOString().slice(0, 16));
  protected readonly fuelType = signal<FuelType>('DIESEL');
  protected readonly quantity = signal<number | null>(null);
  protected readonly unitPrice = signal<number | null>(null);
  protected readonly station = signal('');
  protected readonly ticketNumber = signal('');
  protected readonly odometer = signal<number | null>(null);
  protected readonly notes = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly fuelRecordsService: FuelRecordsService,
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

  protected onNumberInput(target: 'quantity' | 'unitPrice' | 'odometer', value: string): void {
    const parsed = value === '' ? null : Number(value);
    this[target].set(parsed);
  }

  protected async submit(): Promise<void> {
    if (
      !this.vehicleId() ||
      !this.suppliedAt() ||
      this.quantity() === null ||
      this.unitPrice() === null ||
      this.odometer() === null
    ) {
      this.errorMessage.set(
        'Vehículo, fecha, tipo, cantidad, precio unitario y kilometraje son obligatorios.',
      );
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.fuelRecordsService.create({
        vehicleId: this.vehicleId(),
        driverId: this.driverId() || undefined,
        suppliedAt: new Date(this.suppliedAt()).toISOString(),
        fuelType: this.fuelType(),
        quantity: this.quantity()!,
        unitPrice: this.unitPrice()!,
        station: this.station() || undefined,
        ticketNumber: this.ticketNumber() || undefined,
        odometer: this.odometer()!,
        notes: this.notes() || undefined,
      });
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo registrar el abastecimiento.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
