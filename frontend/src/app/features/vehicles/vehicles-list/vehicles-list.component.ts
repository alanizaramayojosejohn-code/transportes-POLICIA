import { Component, computed, signal } from '@angular/core';
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
import { BadgeComponent } from '../../../shared/badge/badge.component';
import { CurrentRoleService } from '../../../core/current-role.service';

@Component({
  imports: [VehicleFormComponent, VehicleDetailComponent, BadgeComponent],
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

  private readonly filter = computed<VehicleFilter>(() => ({
    search: this.search() || undefined,
    condition: this.condition() || undefined,
    type: this.type() || undefined,
    take: 20,
  }));

  /// El listado es reactivo al filtro: cada cambio dispara una nueva
  /// consulta vía `switchMap`, cancelando la anterior si seguía en vuelo.
  protected readonly page = toSignal(
    toObservable(this.filter).pipe(switchMap((filter) => this.vehiclesService.list(filter))),
    { initialValue: { items: [], total: 0 } },
  );

  protected readonly showCreateForm = signal(false);
  protected readonly editingVehicleId = signal<string | null>(null);
  protected readonly detailVehicleId = signal<string | null>(null);

  constructor(
    private readonly vehiclesService: VehiclesService,
    protected readonly currentRole: CurrentRoleService,
  ) {}

  protected openDetail(id: string): void {
    this.detailVehicleId.set(id);
  }

  protected closeDetail(): void {
    this.detailVehicleId.set(null);
  }

  protected editFromDetail(): void {
    const id = this.detailVehicleId();
    this.detailVehicleId.set(null);
    this.editingVehicleId.set(id);
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
