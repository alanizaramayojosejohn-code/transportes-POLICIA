import { Component, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { IncidentsService } from '../incidents.service';
import { INCIDENT_TYPE_LABEL, INCIDENT_TYPES, IncidentType } from '../incident.model';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';
import { PersonnelOption, PersonnelService } from '../../personnel/personnel.service';
import { VEHICLE_CONDITION_LABEL, VehicleConditionCode } from '../../vehicles/vehicle.model';

const POST_CONDITION_OPTIONS: VehicleConditionCode[] = [
  'BUENO',
  'REGULAR',
  'INOPERABLE',
  'SEPARADO_POR_INCIDENTE',
];

/** Registro de un incidente vehicular (spec 011, RF-1). */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-incident-form',
  templateUrl: './incident-form.component.html',
})
export class IncidentFormComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly types = INCIDENT_TYPES;
  protected readonly typeLabel = INCIDENT_TYPE_LABEL;
  protected readonly postConditionOptions = POST_CONDITION_OPTIONS;
  protected readonly conditionLabel = VEHICLE_CONDITION_LABEL;
  protected readonly vehicles: () => VehicleOption[];
  protected readonly drivers: () => PersonnelOption[];

  protected readonly vehicleId = signal('');
  protected readonly driverId = signal('');
  protected readonly type = signal<IncidentType>('ACCIDENTE');
  protected readonly occurredAt = signal(new Date().toISOString().slice(0, 16));
  protected readonly place = signal('');
  protected readonly description = signal('');
  protected readonly damages = signal('');
  protected readonly policeReportNumber = signal('');
  protected readonly postCondition = signal<VehicleConditionCode | ''>('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly vehiclesService: VehiclesService,
    private readonly personnelService: PersonnelService,
  ) {
    this.vehicles = toSignal(this.vehiclesService.listAllActiveOptions(), { initialValue: [] });
    this.drivers = toSignal(this.personnelService.listActiveOptions({ isDriver: true }), {
      initialValue: [],
    });
  }

  protected async submit(): Promise<void> {
    if (!this.vehicleId() || !this.place().trim() || !this.description().trim()) {
      this.errorMessage.set('Vehículo, lugar y descripción son obligatorios.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      await this.incidentsService.create({
        vehicleId: this.vehicleId(),
        driverId: this.driverId() || undefined,
        type: this.type(),
        occurredAt: new Date(this.occurredAt()).toISOString(),
        place: this.place(),
        description: this.description(),
        damages: this.damages() || undefined,
        policeReportNumber: this.policeReportNumber() || undefined,
        postCondition: this.postCondition() || undefined,
      });
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo registrar el incidente.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
