import { Component, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { MaintenanceOrdersService } from '../maintenance-orders.service';
import {
  MAINTENANCE_TYPE_LABEL,
  MAINTENANCE_TYPES,
  MaintenanceType,
} from '../maintenance-order.model';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';

/** Registro de ingreso a mantenimiento (spec 008, RF-1). */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-maintenance-order-form',
  templateUrl: './maintenance-order-form.component.html',
})
export class MaintenanceOrderFormComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly types = MAINTENANCE_TYPES;
  protected readonly typeLabel = MAINTENANCE_TYPE_LABEL;
  protected readonly vehicles: () => VehicleOption[];

  protected readonly vehicleId = signal('');
  protected readonly type = signal<MaintenanceType>('PREVENTIVE');
  protected readonly workshopName = signal('');
  protected readonly odometer = signal<number | null>(null);
  protected readonly startedAt = signal(new Date().toISOString().slice(0, 16));
  protected readonly description = signal('');
  protected readonly invoiceNumber = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly maintenanceOrdersService: MaintenanceOrdersService,
    private readonly vehiclesService: VehiclesService,
  ) {
    this.vehicles = toSignal(this.vehiclesService.listAllActiveOptions(), { initialValue: [] });
  }

  protected onOdometerInput(value: string): void {
    this.odometer.set(value === '' ? null : Number(value));
  }

  protected async submit(): Promise<void> {
    if (!this.vehicleId() || this.odometer() === null || !this.description().trim()) {
      this.errorMessage.set('Vehículo, kilometraje y descripción son obligatorios.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.maintenanceOrdersService.create({
        vehicleId: this.vehicleId(),
        type: this.type(),
        workshopName: this.workshopName() || undefined,
        odometer: this.odometer()!,
        startedAt: new Date(this.startedAt()).toISOString(),
        description: this.description(),
        invoiceNumber: this.invoiceNumber() || undefined,
      });
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo registrar el mantenimiento.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
