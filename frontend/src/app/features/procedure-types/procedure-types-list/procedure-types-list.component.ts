import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
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
import { activationConfirm } from '../../../shared/confirm/activation-confirm';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { errorMessage } from '../../../shared/error-message';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';

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

  private readonly result = loadable(
    this.query,
    (filter) => this.procedureTypesService.list(filter),
    {
      items: [],
      total: 0,
    },
  );
  protected readonly page = this.result.value;
  protected readonly loading = this.result.loading;

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);

  private readonly confirm = inject(ConfirmService);

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
    const type = this.page().items.find((t) => t.id === id);
    if (!type) return;

    const confirmed = await this.confirm.ask(
      activationConfirm(isActive, {
        subject: 'el tipo de trámite',
        name: type.name,
        effect:
          'dejará de aparecer en los checklists de nuevos trámites, sin tocar los ya emitidos',
        restoredEffect: 'vuelve a aparecer en los checklists de nuevos trámites',
        /// La pantalla rotula el botón «Desactivar», no «Dar de baja»: el diálogo usa el mismo
        /// verbo para que no parezcan dos acciones distintas.
        deactivateLabel: 'Desactivar',
      }),
    );
    if (!confirmed) return;

    try {
      if (isActive) {
        await this.procedureTypesService.deactivate(id);
        this.toast.success(`Tipo de trámite «${type.name}» desactivado.`);
      } else {
        await this.procedureTypesService.reactivate(id);
        this.toast.success(`Tipo de trámite «${type.name}» reactivado.`);
      }
    } catch (error) {
      this.toast.error(
        errorMessage(
          error,
          isActive
            ? 'No se pudo desactivar el tipo de trámite.'
            : 'No se pudo reactivar el tipo de trámite.',
        ),
      );
    }
  }

  /// RF-7/RF-8: el backend rechaza si ya se usó en un checklist; se muestra
  /// el motivo tal cual en vez de duplicar la validación en el cliente.
  /// Único borrado real del módulo —no marca `isActive`, borra la fila—, de ahí que el diálogo
  /// diga expresamente que no se puede deshacer y ofrezca desactivar en su lugar.
  protected async remove(id: string): Promise<void> {
    const type = this.page().items.find((t) => t.id === id);
    if (!type) return;

    const confirmed = await this.confirm.ask({
      title: '¿Eliminar el tipo de trámite?',
      message: `«${type.name}» se borra del catálogo y no se puede deshacer. Si sólo quiere dejar de usarlo, desactívelo: así se conserva en los trámites ya emitidos.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await this.procedureTypesService.remove(id);
      this.toast.success(`Tipo de trámite «${type.name}» eliminado.`);
    } catch (error) {
      this.toast.error(errorMessage(error, 'No se pudo eliminar el tipo de trámite.'));
    }
  }
}
