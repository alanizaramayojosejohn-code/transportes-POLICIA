import { Component, effect, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { InventoryService } from '../inventory.service';
import {
  CreateSparePartInput,
  SPARE_PART_TYPE_LABELS,
  SparePart,
  SparePartCategory,
  SparePartType,
} from '../spare-part.model';

interface SparePartFormState {
  code: string;
  name: string;
  categoryId: string;
  type: SparePartType;
  tireSize: string;
  weight: string;
  unit: string;
  minStock: string;
  location: string;
  description: string;
}

const EMPTY_FORM: SparePartFormState = {
  code: '',
  name: '',
  categoryId: '',
  type: 'OTRO',
  tireSize: '',
  weight: '',
  unit: '',
  minStock: '',
  location: '',
  description: '',
};

const SPARE_PART_TYPES: SparePartType[] = ['LIQUIDO', 'LLANTA', 'PIEZA', 'OTRO'];

/** Alta y edición de artículos de inventario (spec 009, RF-1/RF-4). */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-spare-part-form',
  templateUrl: './spare-part-form.component.html',
})
export class SparePartFormComponent {
  readonly part = input<SparePart | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly categories: () => SparePartCategory[];
  protected readonly form = signal<SparePartFormState>(EMPTY_FORM);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly types = SPARE_PART_TYPES;
  protected readonly typeLabels = SPARE_PART_TYPE_LABELS;

  constructor(private readonly inventoryService: InventoryService) {
    this.categories = toSignal(this.inventoryService.listCategories(), { initialValue: [] });

    effect(() => {
      const part = this.part();
      this.form.set(
        part
          ? {
              code: part.code,
              name: part.name,
              categoryId: part.categoryId ?? '',
              type: part.type,
              tireSize: part.tireSize ?? '',
              weight: part.weight !== null ? String(part.weight) : '',
              unit: part.unit,
              minStock: String(part.minStock),
              location: part.location ?? '',
              description: part.description ?? '',
            }
          : EMPTY_FORM,
      );
    });
  }

  protected get isEdit(): boolean {
    return this.part() !== null;
  }

  protected get isTire(): boolean {
    return this.form().type === 'LLANTA';
  }

  protected patch(partial: Partial<SparePartFormState>): void {
    this.form.update((current) => ({ ...current, ...partial }));
  }

  protected async submit(): Promise<void> {
    const value = this.form();
    if (!value.code.trim() || !value.name.trim() || !value.categoryId || !value.unit.trim()) {
      this.errorMessage.set('Código, nombre, categoría y unidad de medida son obligatorios.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const payload: CreateSparePartInput = {
        code: value.code,
        name: value.name,
        categoryId: value.categoryId,
        type: value.type,
        tireSize: value.type === 'LLANTA' && value.tireSize ? value.tireSize : undefined,
        weight: value.weight ? Number(value.weight) : undefined,
        unit: value.unit,
        minStock: value.minStock ? Number(value.minStock) : undefined,
        location: value.location || undefined,
        description: value.description || undefined,
      };
      const current = this.part();
      if (current) {
        await this.inventoryService.update(current.id, payload);
      } else {
        await this.inventoryService.create(payload);
      }
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo guardar el artículo.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
