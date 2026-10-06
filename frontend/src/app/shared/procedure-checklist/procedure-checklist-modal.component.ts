import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import {
  ProcedureChecklistItem,
  UpdateProcedureChecklistItemInput,
} from '../../features/procedure-types/procedure-type.model';
import { ModalComponent } from '../modal/modal.component';
import { FieldControlDirective } from '../field/field-control.directive';
import { ButtonDirective } from '../button/button.directive';
import { FormActionsComponent } from '../form-actions/form-actions.component';
import { ToastService } from '../toast/toast.service';

/**
 * Ver y completar el checklist de trámites de un registro ya guardado (spec
 * 016, RF-15 a RF-17): marca/desmarca ítems y corrige el código físico, sin
 * agregar ni quitar ítems. `onSave` recibe el arreglo actualizado y hace la
 * mutación correspondiente a la acción (una por cada una de las cuatro
 * pantallas que usan este modal); este componente no sabe cuál es.
 */
@Component({
  imports: [ModalComponent, FieldControlDirective, ButtonDirective, FormActionsComponent],
  selector: 'app-procedure-checklist-modal',
  templateUrl: './procedure-checklist-modal.component.html',
})
export class ProcedureChecklistModalComponent {
  readonly items = input.required<ProcedureChecklistItem[]>();
  readonly editable = input(true);
  readonly onSave =
    input.required<(items: UpdateProcedureChecklistItemInput[]) => Promise<unknown>>();
  readonly closed = output<void>();

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly draft = signal<Map<string, UpdateProcedureChecklistItemInput>>(new Map());
  private readonly toast = inject(ToastService);

  protected readonly draftItems = computed(() =>
    this.items().map((item) => {
      const override = this.draft().get(item.id);
      return {
        id: item.id,
        procedureType: item.procedureType,
        completed: override?.completed ?? item.completed,
        documentCode: override?.documentCode ?? item.documentCode ?? undefined,
      };
    }),
  );

  constructor() {
    effect(() => {
      const items = this.items();
      this.draft.set(
        new Map(
          items.map((item) => [
            item.id,
            {
              id: item.id,
              completed: item.completed,
              documentCode: item.documentCode ?? undefined,
            },
          ]),
        ),
      );
    });
  }

  protected toggle(id: string): void {
    this.draft.update((current) => {
      const next = new Map(current);
      const existing = next.get(id);
      if (existing) next.set(id, { ...existing, completed: !existing.completed });
      return next;
    });
  }

  protected setDocumentCode(id: string, documentCode: string): void {
    this.draft.update((current) => {
      const next = new Map(current);
      const existing = next.get(id);
      if (existing) next.set(id, { ...existing, documentCode: documentCode || undefined });
      return next;
    });
  }

  protected async submit(): Promise<void> {
    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.onSave()(Array.from(this.draft().values()));
      const done = this.draftItems().filter((item) => item.completed).length;
      this.toast.success(`Checklist guardado: ${done} de ${this.draftItems().length} completados.`);
      this.closed.emit();
    } catch (error) {
      this.errorMessage.set(this.toast.reportError(error, 'No se pudo guardar el checklist.'));
    } finally {
      this.submitting.set(false);
    }
  }
}
