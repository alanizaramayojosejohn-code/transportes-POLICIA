import { Component, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { UnitsService } from '../units.service';
import { UnitFilter } from '../unit.model';
import { UnitFormComponent } from '../unit-form/unit-form.component';
import { UnitDetailComponent } from '../unit-detail/unit-detail.component';
import { OfficerFormComponent } from '../officer-form/officer-form.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';

@Component({
  imports: [...LIST_PAGE_IMPORTS, UnitFormComponent, UnitDetailComponent, OfficerFormComponent],
  selector: 'app-units-list',
  templateUrl: './units-list.component.html',
})
export class UnitsListComponent {
  protected readonly search = signal('');
  protected readonly isActive = signal<'true' | 'false' | ''>('');

  private readonly filter = computed<UnitFilter>(() => ({
    search: this.search() || undefined,
    isActive: this.isActive() === '' ? undefined : this.isActive() === 'true',
    take: 20,
  }));

  protected readonly page = toSignal(
    toObservable(this.filter).pipe(switchMap((filter) => this.unitsService.list(filter))),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly showUnitForm = signal(false);
  protected readonly showOfficerForm = signal(false);
  protected readonly editingUnitId = signal<string | null>(null);
  protected readonly detailUnitId = signal<string | null>(null);

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

  protected closeForm(): void {
    this.showUnitForm.set(false);
    this.editingUnitId.set(null);
  }

  protected get editingUnit() {
    const id = this.editingUnitId();
    return id ? (this.page().items.find((u) => u.id === id) ?? null) : null;
  }
}
