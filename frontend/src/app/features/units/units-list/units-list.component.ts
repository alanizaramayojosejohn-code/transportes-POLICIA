import { Component, computed, linkedSignal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { UnitsService } from '../units.service';
import { Unit, UnitFilter } from '../unit.model';
import { UnitFormComponent } from '../unit-form/unit-form.component';
import { UnitDetailComponent } from '../unit-detail/unit-detail.component';
import { ManagerAssignmentFormComponent } from '../manager-assignment-form/manager-assignment-form.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { formatDateEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';

@Component({
  imports: [
    ...LIST_PAGE_IMPORTS,
    UnitFormComponent,
    UnitDetailComponent,
    ManagerAssignmentFormComponent,
  ],
  selector: 'app-units-list',
  templateUrl: './units-list.component.html',
})
export class UnitsListComponent {
  protected readonly search = signal('');
  protected readonly isActive = signal<'true' | 'false' | ''>('');

  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    isActive: this.isActive() === '' ? undefined : this.isActive() === 'true',
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<UnitFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  protected readonly page = toSignal(
    toObservable(this.query).pipe(switchMap((filter) => this.unitsService.list(filter))),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly showUnitForm = signal(false);
  protected readonly editingUnitId = signal<string | null>(null);
  protected readonly detailUnitId = signal<string | null>(null);
  protected readonly showManagerAssignForm = signal(false);
  protected readonly assigningManagerUnitId = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly formatDate = formatDateEs;

  constructor(
    private readonly unitsService: UnitsService,
    protected readonly currentRole: CurrentRoleService,
  ) {}

  protected openDetail(id: string): void {
    this.detailUnitId.set(id);
  }

  protected closeDetail(): void {
    this.detailUnitId.set(null);
  }

  protected editFromDetail(): void {
    const id = this.detailUnitId();
    this.detailUnitId.set(null);
    this.editingUnitId.set(id);
  }

  protected edit(id: string): void {
    this.editingUnitId.set(id);
  }

  protected closeForm(): void {
    this.showUnitForm.set(false);
    this.editingUnitId.set(null);
  }

  /// spec 002 (enmienda): tras crear una unidad, ofrece designar su
  /// encargado en el mismo flujo, sin obligarlo (el modal se puede cancelar).
  protected onUnitCreated(unit: Unit): void {
    this.closeForm();
    this.assignManager(unit.id);
  }

  protected get editingUnit() {
    const id = this.editingUnitId();
    return id ? (this.page().items.find((u) => u.id === id) ?? null) : null;
  }

  protected assignManager(id: string): void {
    this.assigningManagerUnitId.set(id);
    this.showManagerAssignForm.set(true);
  }

  protected openManagerAssignForm(): void {
    this.assigningManagerUnitId.set(null);
    this.showManagerAssignForm.set(true);
  }

  protected closeAssignForm(): void {
    this.showManagerAssignForm.set(false);
    this.assigningManagerUnitId.set(null);
  }

  protected async toggleActive(id: string, isActive: boolean): Promise<void> {
    this.actionError.set(null);
    try {
      if (isActive) {
        await this.unitsService.deactivate(id);
      } else {
        await this.unitsService.reactivate(id);
      }
    } catch (error) {
      this.actionError.set(
        error instanceof Error ? error.message : 'No se pudo completar la operación.',
      );
    }
  }
}
