import { Component, input, output, signal } from '@angular/core';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { MaintenanceOrdersService } from '../maintenance-orders.service';
import { MaintenanceOrder } from '../maintenance-order.model';

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

  constructor(private readonly maintenanceOrdersService: MaintenanceOrdersService) {}

  protected onCostInput(value: string): void {
    this.totalCost.set(value === '' ? null : Number(value));
  }

  protected async submit(): Promise<void> {
    if (this.totalCost() === null) {
      this.errorMessage.set('El costo total es obligatorio.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.maintenanceOrdersService.finish(this.order().id, {
        totalCost: this.totalCost()!,
      });
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo finalizar la orden.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
