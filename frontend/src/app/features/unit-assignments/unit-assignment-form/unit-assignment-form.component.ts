import { Component, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { UnitAssignmentsService } from '../unit-assignments.service';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';
import { UnitOption } from '../../units/unit.model';
import { UnitsService } from '../../units/units.service';

/** Nueva asignación de vehículo a unidad (spec 003, RF-01/RF-02). */
@Component({
  imports: [ModalComponent],
  selector: 'app-unit-assignment-form',
  templateUrl: './unit-assignment-form.component.html',
})
export class UnitAssignmentFormComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly vehicles: () => VehicleOption[];
  protected readonly units: () => UnitOption[];

  protected readonly vehicleId = signal('');
  protected readonly unitId = signal('');
  protected readonly startDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly reason = signal('');
  protected readonly referenceDocument = signal('');
  protected readonly notes = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly unitAssignmentsService: UnitAssignmentsService,
    private readonly vehiclesService: VehiclesService,
    private readonly unitsService: UnitsService,
  ) {
    this.vehicles = toSignal(this.vehiclesService.listAllActiveOptions(), { initialValue: [] });
    this.units = toSignal(this.unitsService.listAllActiveOptions(), { initialValue: [] });
  }

  protected async submit(): Promise<void> {
    if (!this.vehicleId() || !this.unitId()) {
      this.errorMessage.set('Debe seleccionar vehículo y unidad.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.unitAssignmentsService.create({
        vehicleId: this.vehicleId(),
        unitId: this.unitId(),
        startDate: this.startDate(),
        reason: this.reason() || undefined,
        referenceDocument: this.referenceDocument() || undefined,
        notes: this.notes() || undefined,
      });
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo registrar la asignación.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
