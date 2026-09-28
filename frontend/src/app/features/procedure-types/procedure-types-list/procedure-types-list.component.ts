import { Component, computed, linkedSignal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ProcedureTypesService } from '../procedure-types.service';
import {
  PROCEDURE_ACTION_LABELS,
  PROCEDURE_ACTIONS,
  ProcedureAction,
  ProcedureTypeFilter,
} from '../procedure-type.model';
import { ProcedureTypeFormComponent } from '../procedure-type-form/procedure-type-form.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';

/** Catálogo de tipos de trámite (spec 016, RF-1 a RF-8/RF-18). */
@Component({
  imports: [...LIST_PAGE_IMPORTS, ProcedureTypeFormComponent],
  selector: 'app-procedure-types-list',
  templateUrl: './procedure-types-list.component.html',
})
export class ProcedureTypesListComponent {
  protected readonly search = signal('');
  protected readonly action = signal<ProcedureAction | ''>('');
  protected readonly isActive = signal<'true' | 'false' | ''>('');
  protected readonly actions = PROCEDURE_ACTIONS;
  protected readonly actionLabels = PROCEDURE_ACTION_LABELS;

  /// Catálogo corto y de referencia: cabe casi siempre en una sola página, de
  /// ahí el tamaño mayor al de los demás listados.
  protected readonly pageSize = 50;

  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    action: this.action() || undefined,
    isActive: this.isActive() === '' ? undefined : this.isActive() === 'true',
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<ProcedureTypeFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: this.pageSize,
  }));

  protected readonly page = toSignal(
    toObservable(this.query).pipe(switchMap((filter) => this.procedureTypesService.list(filter))),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);

  constructor(
    private readonly procedureTypesService: ProcedureTypesService,
    private readonly toast: ToastService,
    protected readonly currentRole: CurrentRoleService,
  ) {}

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  protected edit(id: string): void {
    this.editingId.set(id);
  }

  protected get editingType() {
    const id = this.editingId();
    return id ? (this.page().items.find((t) => t.id === id) ?? null) : null;
  }

  protected async toggleActive(id: string, isActive: boolean): Promise<void> {
    if (isActive) {
      await this.procedureTypesService.deactivate(id);
    } else {
      await this.procedureTypesService.reactivate(id);
    }
  }

  /// RF-7/RF-8: el backend rechaza si ya se usó en un checklist; se muestra
  /// el motivo tal cual en vez de duplicar la validación en el cliente.
  protected async remove(id: string): Promise<void> {
    try {
      await this.procedureTypesService.remove(id);
    } catch (error) {
      this.toast.show(
        error instanceof Error ? error.message : 'No se pudo eliminar el tipo de trámite.',
      );
    }
  }
}
