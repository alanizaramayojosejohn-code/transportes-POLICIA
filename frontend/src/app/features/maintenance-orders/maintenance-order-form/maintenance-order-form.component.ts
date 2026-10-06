import { Component, computed, inject, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { ToastService } from '../../../shared/toast/toast.service';
import { MaintenanceOrdersService } from '../maintenance-orders.service';
import {
  MAINTENANCE_TYPE_LABEL,
  MAINTENANCE_TYPES,
  MaintenanceType,
} from '../maintenance-order.model';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';
import { ProcedureChecklistFieldsComponent } from '../../../shared/procedure-checklist/procedure-checklist-fields.component';
import { toDateTimeInputValue } from '../../../shared/date-format';
import { FormValidation } from '../../../shared/validation/form-validation';
import { combine, min, required } from '../../../shared/validation/validators';

interface MaintenanceOrderFormShape {
  vehicleId: string;
  odometer: number | null;
  description: string;
}

/** Registro de ingreso a mantenimiento (spec 008, RF-1). */
@Component({
  imports: [...FORM_MODAL_IMPORTS, ProcedureChecklistFieldsComponent],
  selector: 'app-maintenance-order-form',
  templateUrl: './maintenance-order-form.component.html',
})
export class MaintenanceOrderFormComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly checklistFields = viewChild(ProcedureChecklistFieldsComponent);

  protected readonly types = MAINTENANCE_TYPES;
  protected readonly typeLabel = MAINTENANCE_TYPE_LABEL;
  protected readonly vehicles: () => VehicleOption[];

  protected readonly vehicleId = signal('');
  protected readonly type = signal<MaintenanceType>('PREVENTIVE');
  protected readonly workshopName = signal('');
  protected readonly odometer = signal<number | null>(null);
  protected readonly startedAt = signal(toDateTimeInputValue());
  protected readonly description = signal('');
  protected readonly invoiceNumber = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly formShape = computed<MaintenanceOrderFormShape>(() => ({
    vehicleId: this.vehicleId(),
    odometer: this.odometer(),
    description: this.description(),
  }));
  protected readonly validation = new FormValidation(this.formShape, {
    vehicleId: required('Seleccione un vehículo.'),
    odometer: combine<number | null, MaintenanceOrderFormShape>(
      required('Ingrese el kilometraje de ingreso.'),
      min(0, 'El kilometraje no puede ser negativo.'),
    ),
    description: required('Ingrese una descripción o diagnóstico.'),
  });

  private readonly toast = inject(ToastService);

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
    if (!this.validation.validateAll()) {
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
        checklistItems: this.checklistFields()?.items(),
      });
      const plate = this.vehicles().find((v) => v.id === this.vehicleId())?.plate;
      this.toast.success(
        `Orden de mantenimiento abierta${plate ? ` para el vehículo ${plate}` : ''}.`,
      );
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        this.toast.reportError(error, 'No se pudo registrar el mantenimiento.'),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
