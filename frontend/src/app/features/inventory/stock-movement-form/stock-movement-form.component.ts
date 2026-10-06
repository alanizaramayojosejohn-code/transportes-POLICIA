import { Component, computed, inject, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { ToastService } from '../../../shared/toast/toast.service';
import { InventoryService } from '../inventory.service';
import { SparePart, SparePartPage, StockMovementType } from '../spare-part.model';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';
import { MaintenanceOrdersService } from '../../maintenance-orders/maintenance-orders.service';
import { MaintenanceOrder } from '../../maintenance-orders/maintenance-order.model';
import { ProcedureChecklistFieldsComponent } from '../../../shared/procedure-checklist/procedure-checklist-fields.component';
import { FormValidation } from '../../../shared/validation/form-validation';
import { requiredIf, required } from '../../../shared/validation/validators';

interface StockMovementFormShape {
  type: StockMovementType;
  sparePartId: string;
  quantity: number | null;
  reason: string;
}

/** Movimiento de entrada o salida de inventario (spec 009, RF-6/RF-7). */
@Component({
  imports: [...FORM_MODAL_IMPORTS, ProcedureChecklistFieldsComponent],
  selector: 'app-stock-movement-form',
  templateUrl: './stock-movement-form.component.html',
})
export class StockMovementFormComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly checklistFields = viewChild(ProcedureChecklistFieldsComponent);

  private readonly partsPage: () => SparePartPage;
  protected readonly parts: () => SparePart[];
  protected readonly vehicles: () => VehicleOption[];
  /// Spec 016 RF-11: sólo órdenes abiertas tienen sentido como destino de
  /// una entrega de refacciones en curso.
  protected readonly maintenanceOrders: () => MaintenanceOrder[];

  protected readonly type = signal<StockMovementType>('IN');
  protected readonly sparePartId = signal('');
  protected readonly quantity = signal<number | null>(null);
  protected readonly unitCost = signal<number | null>(null);
  protected readonly reason = signal('');
  protected readonly supplier = signal('');
  protected readonly reference = signal('');
  protected readonly lotNumber = signal('');
  protected readonly lotExpiresAt = signal('');
  protected readonly vehicleId = signal('');
  protected readonly maintenanceOrderId = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly formShape = computed<StockMovementFormShape>(() => ({
    type: this.type(),
    sparePartId: this.sparePartId(),
    quantity: this.quantity(),
    reason: this.reason(),
  }));
  protected readonly validation = new FormValidation(this.formShape, {
    sparePartId: required('Seleccione un artículo.'),
    /// Para IN/OUT la cantidad es siempre una magnitud positiva; para
    /// ADJUSTMENT es un delta con signo (puede bajar el stock), así que sólo
    /// se exige que no sea cero (mismo criterio que InventoryService).
    quantity: (value, form) => {
      if (value === null || value === undefined) return 'Ingrese la cantidad.';
      if (form.type === 'ADJUSTMENT') {
        return value !== 0 ? null : 'El ajuste no puede ser de cero.';
      }
      return value >= 0.01 ? null : 'La cantidad debe ser mayor a cero.';
    },
    reason: requiredIf(
      (form) => form.type === 'OUT' || form.type === 'ADJUSTMENT',
      'El motivo es obligatorio.',
    ),
  });

  private readonly toast = inject(ToastService);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly vehiclesService: VehiclesService,
    private readonly maintenanceOrdersService: MaintenanceOrdersService,
  ) {
    this.partsPage = toSignal(this.inventoryService.list({ isActive: true, take: 100 }), {
      initialValue: { items: [], total: 0 },
    });
    this.parts = computed(() => this.partsPage().items);
    this.vehicles = toSignal(this.vehiclesService.listAllActiveOptions(), { initialValue: [] });
    const maintenanceOrdersPage = toSignal(
      this.maintenanceOrdersService.list({ status: 'IN_PROGRESS', take: 100 }),
      { initialValue: { items: [], total: 0 } },
    );
    this.maintenanceOrders = computed(() => maintenanceOrdersPage().items);
  }

  protected get isOut(): boolean {
    return this.type() === 'OUT';
  }

  protected get isAdjustment(): boolean {
    return this.type() === 'ADJUSTMENT';
  }

  protected get quantityLabel(): string {
    return this.isAdjustment ? 'Cantidad * (use negativo para bajar el stock)' : 'Cantidad *';
  }

  protected onNumberInput(target: 'quantity' | 'unitCost', value: string): void {
    const parsed = value === '' ? null : Number(value);
    this[target].set(parsed);
  }

  protected async submit(): Promise<void> {
    if (!this.validation.validateAll()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.inventoryService.registerMovement({
        sparePartId: this.sparePartId(),
        type: this.type(),
        quantity: this.quantity()!,
        unitCost: this.unitCost() ?? undefined,
        reason: this.reason() || undefined,
        supplier: this.supplier() || undefined,
        reference: this.reference() || undefined,
        lotNumber:
          !this.isOut && !this.isAdjustment && this.lotNumber() ? this.lotNumber() : undefined,
        lotExpiresAt:
          !this.isOut && !this.isAdjustment && this.lotExpiresAt()
            ? this.lotExpiresAt()
            : undefined,
        vehicleId: this.isOut && this.vehicleId() ? this.vehicleId() : undefined,
        maintenanceOrderId:
          this.isOut && this.maintenanceOrderId() ? this.maintenanceOrderId() : undefined,
        checklistItems: this.isOut ? this.checklistFields()?.items() : undefined,
      });
      const part = this.parts().find((p) => p.id === this.sparePartId());
      const typeLabel = this.isOut ? 'salida' : this.isAdjustment ? 'ajuste' : 'entrada';
      this.toast.success(
        `Movimiento de ${typeLabel} registrado${part ? ` para ${part.name}` : ''}.`,
      );
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(this.toast.reportError(error, 'No se pudo registrar el movimiento.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
