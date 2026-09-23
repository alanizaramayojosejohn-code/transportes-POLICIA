import { Component, computed, effect, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ProcedureTypesService } from '../../features/procedure-types/procedure-types.service';
import {
  ProcedureAction,
  ProcedureChecklistItemDraft,
  ProcedureType,
} from '../../features/procedure-types/procedure-type.model';
import { FieldControlDirective } from '../field/field-control.directive';

/**
 * Checklist de trámites embebido en el formulario de alta de una de las
 * cuatro acciones (spec 016, RF-9/RF-10): una casilla y un código físico
 * opcional por cada tipo de trámite activo de la acción. Si no hay ninguno
 * configurado, no se muestra nada (RF-13). El formulario contenedor lee
 * `items()` al enviar — no emite eventos porque el valor sólo se necesita
 * una vez, al hacer submit.
 */
@Component({
  imports: [FieldControlDirective],
  selector: 'app-procedure-checklist-fields',
  templateUrl: './procedure-checklist-fields.component.html',
})
export class ProcedureChecklistFieldsComponent {
  readonly action = input.required<ProcedureAction>();

  protected readonly types = toSignal(
    toObservable(this.action).pipe(
      switchMap((action) => this.procedureTypesService.listActive(action)),
    ),
    { initialValue: [] as ProcedureType[] },
  );

  private readonly draft = signal<Map<string, ProcedureChecklistItemDraft>>(new Map());

  readonly items = computed<ProcedureChecklistItemDraft[]>(() =>
    this.types().map(
      (type) => this.draft().get(type.id) ?? { procedureTypeId: type.id, completed: false },
    ),
  );

  constructor(private readonly procedureTypesService: ProcedureTypesService) {
    effect(() => {
      const types = this.types();
      this.draft.update((current) => {
        const next = new Map(current);
        for (const type of types) {
          if (!next.has(type.id)) {
            next.set(type.id, { procedureTypeId: type.id, completed: false });
          }
        }
        return next;
      });
    });
  }

  protected itemFor(typeId: string): ProcedureChecklistItemDraft {
    return this.draft().get(typeId) ?? { procedureTypeId: typeId, completed: false };
  }

  protected toggle(typeId: string): void {
    this.draft.update((current) => {
      const next = new Map(current);
      const existing = next.get(typeId) ?? { procedureTypeId: typeId, completed: false };
      next.set(typeId, { ...existing, completed: !existing.completed });
      return next;
    });
  }

  protected setDocumentCode(typeId: string, documentCode: string): void {
    this.draft.update((current) => {
      const next = new Map(current);
      const existing = next.get(typeId) ?? { procedureTypeId: typeId, completed: false };
      next.set(typeId, { ...existing, documentCode: documentCode || undefined });
      return next;
    });
  }
}
