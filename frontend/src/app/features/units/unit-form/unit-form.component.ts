import { Component, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { ToastService } from '../../../shared/toast/toast.service';
import { UnitsService } from '../units.service';
import { CreateUnitInput, Unit, UnitOption } from '../unit.model';
import { FormValidation } from '../../../shared/validation/form-validation';
import { maxLength, required } from '../../../shared/validation/validators';

/** Alta y edición de unidad (spec 002, RF-01/RF-04). Sólo el nombre es obligatorio. */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-unit-form',
  templateUrl: './unit-form.component.html',
})
export class UnitFormComponent {
  readonly unit = input<Unit | null>(null);
  /// Emite la unidad creada o editada: el llamador la usa para encadenar la
  /// designación de encargado en el mismo flujo de alta (spec 002, enmienda).
  readonly saved = output<Unit>();
  readonly cancelled = output<void>();

  protected readonly units: () => UnitOption[];
  protected readonly form = signal<CreateUnitInput>({ name: '' });
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly validation = new FormValidation(this.form, {
    name: required<string, CreateUnitInput>('El nombre es obligatorio.'),
    code: maxLength<CreateUnitInput>(30, 'El código no puede superar los 30 caracteres.'),
  });

  private readonly toast = inject(ToastService);

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
    if (!this.validation.validateAll()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const current = this.unit();
      const result = current
        ? await this.unitsService.update(current.id, value)
        : await this.unitsService.create(value);
      this.toast.success(
        current ? `Unidad ${result.name} actualizada.` : `Unidad ${result.name} registrada.`,
      );
      this.saved.emit(result);
    } catch (error) {
      this.errorMessage.set(this.toast.reportError(error, 'No se pudo guardar la unidad.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
