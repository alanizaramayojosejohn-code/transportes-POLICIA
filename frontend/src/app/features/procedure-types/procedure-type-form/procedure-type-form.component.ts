import { Component, effect, input, output, signal } from '@angular/core';
import { ProcedureTypesService } from '../procedure-types.service';
import {
  CreateProcedureTypeInput,
  PROCEDURE_ACTION_LABELS,
  PROCEDURE_ACTIONS,
  ProcedureAction,
  ProcedureType,
} from '../procedure-type.model';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { FormValidation } from '../../../shared/validation/form-validation';
import { required } from '../../../shared/validation/validators';

/**
 * Alta y edición de un tipo de trámite (spec 016, RF-1 a RF-4). La acción
 * sólo se elige al crear: RF-4 la fija desde la creación para no invalidar
 * los checklists ya guardados con esa definición.
 */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-procedure-type-form',
  templateUrl: './procedure-type-form.component.html',
})
export class ProcedureTypeFormComponent {
  readonly procedureType = input<ProcedureType | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly actions = PROCEDURE_ACTIONS;
  protected readonly actionLabels = PROCEDURE_ACTION_LABELS;

  protected readonly form = signal<CreateProcedureTypeInput>({
    name: '',
    action: 'VEHICLE_REGISTRATION',
  });
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly validation = new FormValidation(this.form, {
    name: required<string, CreateProcedureTypeInput>('El nombre es obligatorio.'),
  });

  constructor(private readonly procedureTypesService: ProcedureTypesService) {
    effect(() => {
      this.form.set(this.initialValue());
    });
  }

  protected get isEdit(): boolean {
    return this.procedureType() !== null;
  }

  protected patch(partial: Partial<CreateProcedureTypeInput>): void {
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
      const current = this.procedureType();
      if (current) {
        await this.procedureTypesService.update(current.id, {
          name: value.name,
          description: value.description,
        });
      } else {
        await this.procedureTypesService.create(value);
      }
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo guardar el tipo de trámite.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private initialValue(): CreateProcedureTypeInput {
    const type = this.procedureType();
    if (!type) {
      return { name: '', action: 'VEHICLE_REGISTRATION' as ProcedureAction };
    }
    return {
      name: type.name,
      description: type.description ?? undefined,
      action: type.action,
    };
  }
}
