import { Component, computed, linkedSignal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { PersonnelService } from '../../personnel/personnel.service';
import { PersonnelFilter } from '../../personnel/personnel.model';
import { DriverFormComponent } from '../driver-form/driver-form.component';
import { DriverDetailComponent } from '../driver-detail/driver-detail.component';
import { UnitOption } from '../../units/unit.model';
import { UnitsService } from '../../units/units.service';
import { CurrentRoleService } from '../../../core/current-role.service';
import { formatDateEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';

/** Padrón de conductores (spec 005), sobre el personal unificado (isDriver = true). */
@Component({
  imports: [...LIST_PAGE_IMPORTS, DriverFormComponent, DriverDetailComponent],
  selector: 'app-drivers-list',
  templateUrl: './drivers-list.component.html',
})
export class DriversListComponent {
  protected readonly search = signal('');
  protected readonly unitId = signal('');
  protected readonly isActive = signal<'true' | 'false' | ''>('');

  private readonly filters = computed(() => ({
    isDriver: true,
    search: this.search() || undefined,
    unitId: this.unitId() || undefined,
    isActive: this.isActive() === '' ? undefined : this.isActive() === 'true',
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<PersonnelFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  protected readonly page = toSignal(
    toObservable(this.query).pipe(switchMap((filter) => this.personnelService.list(filter))),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly units: () => UnitOption[];

  protected readonly showForm = signal(false);
  protected readonly editingDriverId = signal<string | null>(null);
  protected readonly detailDriverId = signal<string | null>(null);
  protected readonly formatDate = formatDateEs;

  constructor(
    private readonly personnelService: PersonnelService,
    private readonly unitsService: UnitsService,
    protected readonly currentRole: CurrentRoleService,
  ) {
    this.units = toSignal(this.unitsService.listAllActiveOptions(), { initialValue: [] });
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingDriverId.set(null);
  }

  protected edit(id: string): void {
    this.editingDriverId.set(id);
  }

  protected openDetail(id: string): void {
    this.detailDriverId.set(id);
  }

  protected closeDetail(): void {
    this.detailDriverId.set(null);
  }

  protected get editingDriver() {
    const id = this.editingDriverId();
    return id ? (this.page().items.find((d) => d.id === id) ?? null) : null;
  }

  protected async toggleActive(id: string, isActive: boolean): Promise<void> {
    if (isActive) {
      await this.personnelService.deactivate(id);
    } else {
      await this.personnelService.reactivate(id);
    }
  }

  /// RF-9: señala visualmente una licencia ya vencida.
  protected isLicenseExpired(licenseExpiresAt: string | null): boolean {
    return !!licenseExpiresAt && new Date(licenseExpiresAt).getTime() < Date.now();
  }
}
