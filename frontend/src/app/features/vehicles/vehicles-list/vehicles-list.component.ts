import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { VehiclesService } from '../vehicles.service';
import {
  Vehicle,
  VEHICLE_CONDITION_BADGE,
  VEHICLE_CONDITION_LABEL,
  VEHICLE_TYPE_LABEL,
  VehicleConditionCode,
  VehicleFilter,
  VehicleType,
} from '../vehicle.model';
import { VehicleFormComponent } from '../vehicle-form/vehicle-form.component';
import { VehicleDetailComponent } from '../vehicle-detail/vehicle-detail.component';
import { CurrentRoleService } from '../../../core/current-role.service';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { ToastService } from '../../../shared/toast/toast.service';
import { ReportColumn } from '../../../shared/export/report-export';

@Component({
  imports: [...LIST_PAGE_IMPORTS, VehicleFormComponent, VehicleDetailComponent],
  selector: 'app-vehicles-list',
  templateUrl: './vehicles-list.component.html',
})
export class VehiclesListComponent {
  protected readonly conditionLabels = VEHICLE_CONDITION_LABEL;
  protected readonly conditionBadge = VEHICLE_CONDITION_BADGE;
  protected readonly typeLabels = VEHICLE_TYPE_LABEL;
  protected readonly conditionOptions: VehicleConditionCode[] = [
    'BUENO',
    'REGULAR',
    'DETERIORADO',
    'FUERA_DE_USO',
    'INOPERABLE',
    'EXTRAVIADO',
    'DEVUELTO',
    'BAJA',
  ];
  protected readonly typeOptions: VehicleType[] = [
    'CAMIONETA',
    'AUTOMOVIL',
    'MOTOCICLETA',
    'MINIBUS',
    'CAMION',
    'AMBULANCIA',
    'OTRO',
  ];

  private readonly route = inject(ActivatedRoute);

  /// El buscador del topbar navega aquí con `?buscar=<término>`; se siembra el filtro y desde ahí
  /// lo maneja la pantalla — escribir en la caja local no reescribe la URL, pero una búsqueda
  /// nueva desde el topbar (que sí cambia el parámetro) vuelve a imponerse.
  private readonly searchParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('buscar') ?? '')),
    { initialValue: this.route.snapshot.queryParamMap.get('buscar') ?? '' },
  );

  protected readonly search = linkedSignal(() => this.searchParam());
  protected readonly condition = signal<VehicleConditionCode | ''>('');
  protected readonly type = signal<VehicleType | ''>('');

  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    condition: this.condition() || undefined,
    type: this.type() || undefined,
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro: filtrar estando en la página 3
  /// dejaría la tabla vacía aunque el nuevo filtro sí tenga resultados.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<VehicleFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  /// El listado es reactivo al filtro: cada cambio dispara una nueva consulta,
  /// cancelando la anterior si seguía en vuelo (`loadable` usa `switchMap`).
  private readonly result = loadable(this.query, (filter) => this.vehiclesService.list(filter), {
    items: [],
    total: 0,
  });
  protected readonly page = this.result.value;
  protected readonly loading = this.result.loading;

  /// Exportar (fuera de alcance en spec 018, pedido explícitamente aparte): mismas columnas que
  /// la tabla en pantalla, en el mismo orden.
  protected readonly exportColumns: ReportColumn<Vehicle>[] = [
    { header: 'Placa', accessor: (v) => v.plate },
    { header: 'Marca', accessor: (v) => v.brand || '—' },
    { header: 'Modelo', accessor: (v) => v.model || '—' },
    { header: 'Unidad', accessor: (v) => v.currentUnit?.name || 'Sin unidad asignada' },
    {
      header: 'Condición',
      accessor: (v) =>
        v.currentCondition ? this.conditionLabels[v.currentCondition.code] : 'Sin evaluar',
    },
    { header: 'Último KM', accessor: (v) => v.lastOdometer ?? '—' },
  ];

  protected readonly filtersSummary = computed(() => {
    const parts: string[] = [];
    if (this.search()) parts.push(`Búsqueda: ${this.search()}`);
    if (this.condition())
      parts.push(`Condición: ${this.conditionLabels[this.condition() as VehicleConditionCode]}`);
    if (this.type()) parts.push(`Tipo: ${this.typeLabels[this.type() as VehicleType]}`);
    return parts.length ? parts.join(' · ') : undefined;
  });

  protected readonly fetchAllForExport = () => this.vehiclesService.listAll(this.filters());

  protected readonly showCreateForm = signal(false);
  protected readonly editingVehicleId = signal<string | null>(null);
  protected readonly detailVehicleId = signal<string | null>(null);

  constructor(
    private readonly vehiclesService: VehiclesService,
    protected readonly currentRole: CurrentRoleService,
    private readonly toast: ToastService,
  ) {}

  /// El spec 001 no incluye baja física de vehículos (sólo condición "Dado de baja", que se
  /// registra desde la ficha) y el backend no expone una mutación de borrado: el botón reproduce
  /// la posición y estilo del prototipo, pero todavía no elimina nada.
  protected deleteVehicle(): void {
    this.toast.info('Eliminación de vehículos aún no disponible.');
  }

  protected openDetail(id: string): void {
    this.detailVehicleId.set(id);
  }

  protected closeDetail(): void {
    this.detailVehicleId.set(null);
  }

  protected closeForm(): void {
    this.showCreateForm.set(false);
    this.editingVehicleId.set(null);
  }

  protected get editingVehicle() {
    const id = this.editingVehicleId();
    return id ? (this.page().items.find((v) => v.id === id) ?? null) : null;
  }
}
