import { Component, computed, linkedSignal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { VehiclesService } from '../vehicles.service';
import {
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
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { ToastService } from '../../../shared/toast/toast.service';

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

  protected readonly search = signal('');
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

  /// El listado es reactivo al filtro: cada cambio dispara una nueva
  /// consulta vía `switchMap`, cancelando la anterior si seguía en vuelo.
  protected readonly page = toSignal(
    toObservable(this.query).pipe(switchMap((filter) => this.vehiclesService.list(filter))),
    { initialValue: { items: [], total: 0 } },
  );

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
    this.toast.show('Eliminación de vehículos aún no disponible.');
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
