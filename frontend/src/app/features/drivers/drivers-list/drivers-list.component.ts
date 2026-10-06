import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PersonnelService } from '../../personnel/personnel.service';
import { Personnel, PersonnelFilter } from '../../personnel/personnel.model';
import { ReportColumn } from '../../../shared/export/report-export';
import { DriverFormComponent } from '../driver-form/driver-form.component';
import { DriverDetailComponent } from '../driver-detail/driver-detail.component';
import { UnitOption } from '../../units/unit.model';
import { UnitsService } from '../../units/units.service';
import { CurrentRoleService } from '../../../core/current-role.service';
import { formatDateEs } from '../../../shared/date-format';
import { activationConfirm } from '../../../shared/confirm/activation-confirm';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { errorMessage } from '../../../shared/error-message';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { ToastService } from '../../../shared/toast/toast.service';

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

  private readonly result = loadable(this.query, (filter) => this.personnelService.list(filter), {
    items: [],
    total: 0,
  });
  protected readonly page = this.result.value;
  protected readonly loading = this.result.loading;

  protected readonly exportColumns: ReportColumn<Personnel>[] = [
    { header: 'CI', accessor: (d) => d.ci },
    { header: 'Nombre', accessor: (d) => `${d.firstName} ${d.lastName}` },
    { header: 'Grado', accessor: (d) => d.rank || '—' },
    { header: 'Licencia', accessor: (d) => d.licenseNumber || '—' },
    { header: 'Vencimiento licencia', accessor: (d) => formatDateEs(d.licenseExpiresAt) },
    { header: 'Unidad', accessor: (d) => d.unit?.name || 'Sin asignar' },
    { header: 'Vehículo a cargo', accessor: (d) => d.currentVehicle?.plate || 'Sin asignar' },
    { header: 'Estado', accessor: (d) => (d.isActive ? 'Activo' : 'Inactivo') },
  ];

  protected readonly filtersSummary = computed(() => {
    const parts: string[] = [];
    if (this.search()) parts.push(`Búsqueda: ${this.search()}`);
    if (this.unitId()) {
      const unit = this.units().find((u) => u.id === this.unitId());
      if (unit) parts.push(`Unidad: ${unit.name}`);
    }
    if (this.isActive())
      parts.push(`Estado: ${this.isActive() === 'true' ? 'Activos' : 'Inactivos'}`);
    return parts.length ? parts.join(' · ') : undefined;
  });

  protected readonly fetchAllForExport = () => this.personnelService.listAll(this.filters());

  protected readonly units: () => UnitOption[];

  protected readonly showForm = signal(false);
  protected readonly editingDriverId = signal<string | null>(null);
  protected readonly detailDriverId = signal<string | null>(null);
  protected readonly formatDate = formatDateEs;

  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

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
    const driver = this.page().items.find((d) => d.id === id);
    if (!driver) return;

    const name = `${driver.firstName} ${driver.lastName}`;
    /// Un conductor de baja con vehículo a cargo deja ese vehículo sin encargado: avisarlo antes
    /// evita descubrirlo después desde la ficha del vehículo.
    const vehicle = driver.currentVehicle
      ? `, y el vehículo ${driver.currentVehicle.plate} quedará sin conductor encargado`
      : '';

    const confirmed = await this.confirm.ask(
      activationConfirm(isActive, {
        subject: 'al conductor',
        name,
        effect: `dejará de poder registrarse en recorridos, vales de combustible e incidentes${vehicle}`,
        restoredEffect:
          'vuelve a poder registrarse en recorridos, vales de combustible e incidentes',
      }),
    );
    if (!confirmed) return;

    try {
      if (isActive) {
        await this.personnelService.deactivate(id);
        this.toast.success(`Conductor ${name} dado de baja.`);
      } else {
        await this.personnelService.reactivate(id);
        this.toast.success(`Conductor ${name} reactivado.`);
      }
    } catch (error) {
      this.toast.error(
        errorMessage(
          error,
          isActive ? 'No se pudo dar de baja al conductor.' : 'No se pudo reactivar al conductor.',
        ),
      );
    }
  }

  /// RF-9: señala visualmente una licencia ya vencida.
  protected isLicenseExpired(licenseExpiresAt: string | null): boolean {
    return !!licenseExpiresAt && new Date(licenseExpiresAt).getTime() < Date.now();
  }
}
