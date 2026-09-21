import { Component, computed, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { InventoryService } from '../inventory.service';
import { SparePart, SparePartPage, StockMovementType } from '../spare-part.model';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';

/** Movimiento de entrada o salida de inventario (spec 009, RF-6/RF-7). */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-stock-movement-form',
  templateUrl: './stock-movement-form.component.html',
})
export class StockMovementFormComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly partsPage: () => SparePartPage;
  protected readonly parts: () => SparePart[];
  protected readonly vehicles: () => VehicleOption[];

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
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly vehiclesService: VehiclesService,
  ) {
    this.partsPage = toSignal(this.inventoryService.list({ isActive: true, take: 100 }), {
      initialValue: { items: [], total: 0 },
    });
    this.parts = computed(() => this.partsPage().items);
    this.vehicles = toSignal(this.vehiclesService.listAllActiveOptions(), { initialValue: [] });
  }

  protected get isOut(): boolean {
    return this.type() === 'OUT';
  }

  protected onNumberInput(target: 'quantity' | 'unitCost', value: string): void {
    const parsed = value === '' ? null : Number(value);
    this[target].set(parsed);
  }

  protected async submit(): Promise<void> {
    if (!this.sparePartId() || this.quantity() === null) {
      this.errorMessage.set('Artículo y cantidad son obligatorios.');
      return;
    }
    if (this.isOut && !this.reason().trim()) {
      this.errorMessage.set('El motivo es obligatorio para una salida.');
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
        lotNumber: !this.isOut && this.lotNumber() ? this.lotNumber() : undefined,
        lotExpiresAt: !this.isOut && this.lotExpiresAt() ? this.lotExpiresAt() : undefined,
        vehicleId: this.isOut && this.vehicleId() ? this.vehicleId() : undefined,
      });
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo registrar el movimiento.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
