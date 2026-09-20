import { Component, effect, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { PersonnelService } from '../../personnel/personnel.service';
import { CreatePersonnelInput, Personnel } from '../../personnel/personnel.model';
import { UnitOption } from '../../units/unit.model';
import { UnitsService } from '../../units/units.service';
import { VehicleOption, VehiclesService } from '../../vehicles/vehicles.service';
import { VehicleDriverAssignmentsService } from '../../vehicle-driver-assignments/vehicle-driver-assignments.service';
import { UsersService } from '../../users/users.service';
import { POLICE_RANK_OPTIONS } from '../../../shared/police-ranks';

interface DriverFormState {
  firstName: string;
  lastName: string;
  ci: string;
  ciComplement: string;
  rank: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiresAt: string;
  phone: string;
  unitId: string;
  observations: string;
  isDriver: boolean;
  isOfficer: boolean;
  isAdmin: boolean;
  /// Vehículo a cargo (spec 014): '' = sin vehículo asignado.
  vehicleId: string;
  createAccount: boolean;
  username: string;
  password: string;
}

/// Esta pantalla registra conductores primero que nada: nace con `isDriver`
/// marcado, aunque la persona pueda además ejercer otros roles.
const EMPTY_FORM: DriverFormState = {
  firstName: '',
  lastName: '',
  ci: '',
  ciComplement: '',
  rank: '',
  licenseNumber: '',
  licenseCategory: '',
  licenseExpiresAt: '',
  phone: '',
  unitId: '',
  observations: '',
  isDriver: true,
  isOfficer: false,
  isAdmin: false,
  vehicleId: '',
  createAccount: false,
  username: '',
  password: '',
};

/** Alta y edición de conductores (spec 005, RF-1/RF-5), sobre el personal unificado. */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-driver-form',
  templateUrl: './driver-form.component.html',
})
export class DriverFormComponent {
  readonly driver = input<Personnel | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly units: () => UnitOption[];
  protected readonly vehicles: () => VehicleOption[];
  protected readonly rankOptions = POLICE_RANK_OPTIONS;
  protected readonly form = signal<DriverFormState>(EMPTY_FORM);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly personnelService: PersonnelService,
    private readonly unitsService: UnitsService,
    private readonly vehiclesService: VehiclesService,
    private readonly vehicleDriverAssignmentsService: VehicleDriverAssignmentsService,
    private readonly usersService: UsersService,
  ) {
    this.units = toSignal(this.unitsService.listAllActiveOptions(), { initialValue: [] });
    this.vehicles = toSignal(this.vehiclesService.listAllActiveOptions(), { initialValue: [] });

    effect(() => {
      const driver = this.driver();
      this.form.set(
        driver
          ? {
              firstName: driver.firstName,
              lastName: driver.lastName,
              ci: driver.ci,
              ciComplement: driver.ciComplement ?? '',
              rank: driver.rank ?? '',
              licenseNumber: driver.licenseNumber ?? '',
              licenseCategory: driver.licenseCategory ?? '',
              licenseExpiresAt: driver.licenseExpiresAt?.slice(0, 10) ?? '',
              phone: driver.phone ?? '',
              unitId: driver.unitId ?? '',
              observations: driver.observations ?? '',
              isDriver: driver.isDriver,
              isOfficer: driver.isOfficer,
              isAdmin: driver.isAdmin,
              vehicleId: driver.currentVehicle?.id ?? '',
              createAccount: false,
              username: '',
              password: '',
            }
          : EMPTY_FORM,
      );
    });
  }

  /// La cuenta de acceso sólo se ofrece para una ficha que todavía no tiene
  /// una vinculada (spec 014, RF-12: la cuenta y el vehículo son estados
  /// independientes, pero una ficha sólo tiene una cuenta a la vez).
  protected get canCreateAccount(): boolean {
    return !this.driver()?.userId;
  }

  protected get isEdit(): boolean {
    return this.driver() !== null;
  }

  protected patch(partial: Partial<DriverFormState>): void {
    this.form.update((current) => ({ ...current, ...partial }));
  }

  protected async submit(): Promise<void> {
    const value = this.form();
    if (!value.firstName.trim() || !value.lastName.trim() || !value.ci.trim()) {
      this.errorMessage.set('CI, nombres y apellidos son obligatorios.');
      return;
    }
    if (!value.isDriver && !value.isOfficer && !value.isAdmin) {
      this.errorMessage.set('Debe marcar al menos un rol: conductor, encargado o administrativo.');
      return;
    }
    if (
      value.isDriver &&
      (!value.licenseNumber.trim() || !value.licenseCategory.trim() || !value.licenseExpiresAt)
    ) {
      this.errorMessage.set(
        'Número de licencia, categoría y vencimiento son obligatorios para el rol de conductor.',
      );
      return;
    }
    if (value.createAccount && (!value.username.trim() || value.password.length < 8)) {
      this.errorMessage.set(
        'El usuario y una contraseña de al menos 8 caracteres son obligatorios para crear la cuenta.',
      );
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const payload: CreatePersonnelInput = {
        firstName: value.firstName,
        lastName: value.lastName,
        ci: value.ci,
        ciComplement: value.ciComplement || undefined,
        rank: value.rank || undefined,
        isDriver: value.isDriver,
        isOfficer: value.isOfficer,
        isAdmin: value.isAdmin,
        licenseNumber: value.isDriver ? value.licenseNumber : undefined,
        licenseCategory: value.isDriver ? value.licenseCategory : undefined,
        licenseExpiresAt: value.isDriver ? value.licenseExpiresAt : undefined,
        phone: value.phone || undefined,
        unitId: value.unitId || undefined,
        observations: value.observations || undefined,
      };
      const current = this.driver();
      const personnel = current
        ? await this.personnelService.update(current.id, payload)
        : await this.personnelService.create(payload);

      await this.saveVehicleCharge(personnel.id, current, value);

      if (value.isDriver && value.createAccount) {
        await this.createDriverAccount(personnel.id, value);
      }

      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo guardar el conductor.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  /// spec 014: designa o cierra el encargo de vehículo sólo si el valor
  /// cambió respecto al vigente.
  private async saveVehicleCharge(
    driverId: string,
    current: Personnel | null,
    value: DriverFormState,
  ): Promise<void> {
    const previousVehicleId = current?.currentVehicle?.id ?? '';
    if (value.vehicleId === previousVehicleId) {
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (value.vehicleId) {
      await this.vehicleDriverAssignmentsService.assign({
        vehicleId: value.vehicleId,
        driverId,
        startDate: today,
      });
    } else if (previousVehicleId) {
      await this.vehicleDriverAssignmentsService.close({
        vehicleId: previousVehicleId,
        endDate: today,
      });
    }
  }

  /// spec 014/015: cuenta con rol CONDUCTOR vinculada a la ficha recién
  /// creada o editada.
  private async createDriverAccount(personnelId: string, value: DriverFormState): Promise<void> {
    const roles = await firstValueFrom(this.usersService.listRoles());
    const conductorRole = roles.find((role) => role.code === 'CONDUCTOR');
    if (!conductorRole) {
      throw new Error('No existe el rol Conductor en el sistema.');
    }
    await this.usersService.create({
      username: value.username,
      password: value.password,
      fullName: `${value.firstName} ${value.lastName}`,
      roleId: conductorRole.id,
      personnelId,
    });
  }
}
