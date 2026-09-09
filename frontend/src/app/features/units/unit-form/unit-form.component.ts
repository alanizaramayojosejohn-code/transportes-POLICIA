import { Component, effect, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { UnitsService } from '../units.service';
import { CreateUnitInput, Unit, UnitOption } from '../unit.model';

/** Alta y edición de unidad (spec 002, RF-01/RF-04). Sólo el nombre es obligatorio. */
@Component({
  imports: [ModalComponent],
  selector: 'app-unit-form',
  templateUrl: './unit-form.component.html',
})
export class UnitFormComponent {
  readonly unit = input<Unit | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly units: () => UnitOption[];
  protected readonly form = signal<CreateUnitInput>({ name: '' });
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(private readonly unitsService: UnitsService) {
    // Se asigna aquí, no como inicializador de campo: un inicializador de
    // campo se ejecuta antes de que la propiedad de parámetro del
    // constructor (`unitsService`) quede asignada.
    this.units = toSignal(this.unitsService.listAllActiveOptions(), { initialValue: [] });

    effect(() => {
      const unit = this.unit();
      this.form.set(
        unit
          ? {
              code: unit.code ?? undefined,
              name: unit.name,
              type: unit.type ?? undefined,
              location: unit.location ?? undefined,
              parentId: unit.parentId ?? undefined,
            }
          : { name: '' },
      );
    });
  }

  protected get isEdit(): boolean {
    return this.unit() !== null;
  }

  /// La unidad no puede ser su propia superior (RF-05; el ciclo indirecto lo
  /// valida el backend, que recorre todo el árbol).
  protected get parentOptions(): UnitOption[] {
    const current = this.unit();
    return this.units().filter((u) => !current || u.id !== current.id);
  }

  protected patch(partial: Partial<CreateUnitInput>): void {
    this.form.update((current) => ({ ...current, ...partial }));
  }

  protected async submit(): Promise<void> {
    const value = this.form();
    if (!value.name.trim()) {
      this.errorMessage.set('El nombre es obligatorio.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const current = this.unit();
      if (current) {
        await this.unitsService.update(current.id, value);
      } else {
        await this.unitsService.create(value);
      }
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo guardar la unidad.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
