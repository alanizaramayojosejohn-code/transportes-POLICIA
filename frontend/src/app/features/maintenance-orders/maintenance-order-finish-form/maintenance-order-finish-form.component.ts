import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { ToastService } from '../../../shared/toast/toast.service';
import { MaintenanceOrdersService } from '../maintenance-orders.service';
import { MaintenanceOrder } from '../maintenance-order.model';
import { FormValidation } from '../../../shared/validation/form-validation';
import { combine, min, required } from '../../../shared/validation/validators';

interface FinishFormShape {
  totalCost: number | null;
}

/** Registro de finalización de una orden en proceso (spec 008, RF-4). */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-maintenance-order-finish-form',
  templateUrl: './maintenance-order-finish-form.component.html',
})
export class MaintenanceOrderFinishFormComponent {
  readonly order = input.required<MaintenanceOrder>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly totalCost = signal<number | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly formShape = computed<FinishFormShape>(() => ({ totalCost: this.totalCost() }));
  protected readonly validation = new FormValidation(this.formShape, {
    totalCost: combine<number | null, FinishFormShape>(
      required('Ingrese el costo total.'),
      min(0, 'El costo total no puede ser negativo.'),
    ),
  });

  private readonly toast = inject(ToastService);

  constructor(private readonly maintenanceOrdersService: MaintenanceOrdersService) {}

  protected onCostInput(value: string): void {
    this.totalCost.set(value === '' ? null : Number(value));
  }

  protected async submit(): Promise<void> {
    if (!this.validation.validateAll()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.maintenanceOrdersService.finish(this.order().id, {
        totalCost: this.totalCost()!,
      });
      this.toast.success(`Orden ${this.order().code} finalizada.`);
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(this.toast.reportError(error, 'No se pudo finalizar la orden.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
