import { Component, computed, effect, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { UnitsService } from '../units.service';
import { PersonnelOption, PersonnelService } from '../../personnel/personnel.service';
import { UnitOption } from '../unit.model';
import { UsersService } from '../../users/users.service';
import { POLICE_RANK_OPTIONS } from '../../../shared/police-ranks';
import { FormValidation } from '../../../shared/validation/form-validation';
import { requiredIf, required } from '../../../shared/validation/validators';

interface NewOfficerFormState {
  ci: string;
  ciComplement: string;
  firstName: string;
  lastName: string;
  rank: string;
  phone: string;
}

const EMPTY_NEW_OFFICER: NewOfficerFormState = {
  ci: '',
  ciComplement: '',
  firstName: '',
  lastName: '',
  rank: '',
  phone: '',
};

type OfficerMode = 'existing' | 'new';

interface ManagerAssignmentFormShape {
  selectedUnitId: string;
  mode: OfficerMode;
  officerId: string;
  newOfficerCi: string;
  newOfficerFirstName: string;
  newOfficerLastName: string;
  startDate: string;
  createAccount: boolean;
  username: string;
  password: string;
}

/**
 * Designa al encargado de transportes de una unidad (spec 002, RF-18 a RF-22). Reproduce el
 * modal combinado del prototipo (`prototipo/index.html:7486-7636`, `encargadoModal`): unidad,
 * datos de la persona y fecha desde, en un solo paso. El personal puede ser uno ya registrado
 * (cualquier persona activa, no sólo quienes ya son encargados: designarla la marca `isOfficer`
 * automáticamente, `UnitsService.assignTransportManager` en el backend) o cargarse aquí mismo con
 * el atajo de crear su ficha de `Personnel` sin salir de este formulario.
 */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-manager-assignment-form',
  templateUrl: './manager-assignment-form.component.html',
})
export class ManagerAssignmentFormComponent {
  readonly unitId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly officers: () => PersonnelOption[];
  protected readonly units: () => UnitOption[];
  protected readonly rankOptions = POLICE_RANK_OPTIONS;

  protected readonly selectedUnitId = signal('');
  /// Texto del buscador de unidad (`prototipo/index.html:2914`, `#unitSearch`): a diferencia del
  /// select fijo del prototipo, se puede filtrar por nombre en vez de desplazarse por la lista
  /// completa. `<datalist>` resuelve el filtrado nativo del navegador; `onUnitQueryInput` traduce
  /// el texto elegido de vuelta al id de la unidad.
  protected readonly unitQuery = signal('');
  protected readonly mode = signal<OfficerMode>('existing');
  protected readonly officerId = signal('');
  protected readonly newOfficer = signal<NewOfficerFormState>(EMPTY_NEW_OFFICER);
  protected readonly startDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly referenceDocument = signal('');
  protected readonly notes = signal('');
  protected readonly createAccount = signal(false);
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly formShape = computed<ManagerAssignmentFormShape>(() => ({
    selectedUnitId: this.selectedUnitId(),
    mode: this.mode(),
    officerId: this.officerId(),
    newOfficerCi: this.newOfficer().ci,
    newOfficerFirstName: this.newOfficer().firstName,
    newOfficerLastName: this.newOfficer().lastName,
    startDate: this.startDate(),
    createAccount: this.createAccount(),
    username: this.username(),
    password: this.password(),
  }));
  protected readonly validation = new FormValidation(this.formShape, {
    selectedUnitId: required('Debe seleccionar la unidad.'),
    officerId: requiredIf(
      (form) => form.mode === 'existing',
      'Debe seleccionar a la persona designada.',
    ),
    newOfficerCi: requiredIf((form) => form.mode === 'new', 'La CI es obligatoria.'),
    newOfficerFirstName: requiredIf((form) => form.mode === 'new', 'Los nombres son obligatorios.'),
    newOfficerLastName: requiredIf(
      (form) => form.mode === 'new',
      'Los apellidos son obligatorios.',
    ),
    startDate: required('Ingrese la fecha desde.'),
    username: requiredIf((form) => form.createAccount, 'El usuario es obligatorio.'),
    password: (value, form) => {
      if (!form.createAccount) return null;
      if (!value.trim()) return 'La contraseña es obligatoria.';
      return value.length < 8 ? 'Debe tener al menos 8 caracteres.' : null;
    },
  });

  constructor(
    private readonly unitsService: UnitsService,
    private readonly personnelService: PersonnelService,
    private readonly usersService: UsersService,
  ) {
    this.officers = toSignal(this.personnelService.listActiveOptions(), { initialValue: [] });
    this.units = toSignal(this.unitsService.listAllActiveOptions(), { initialValue: [] });

    effect(() => {
      const id = this.unitId() ?? '';
      this.selectedUnitId.set(id);
      const match = this.units().find((u) => u.id === id);
      this.unitQuery.set(match?.name ?? '');
    });
  }

  protected patchNewOfficer(partial: Partial<NewOfficerFormState>): void {
    this.newOfficer.update((current) => ({ ...current, ...partial }));
  }

  protected onUnitQueryInput(value: string): void {
    this.unitQuery.set(value);
    const match = this.units().find((u) => u.name === value);
    this.selectedUnitId.set(match ? match.id : '');
  }

  protected async submit(): Promise<void> {
    if (!this.validation.validateAll()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      let officerId = this.officerId();
      let officerFullName = '';

      if (this.mode() === 'new') {
        const value = this.newOfficer();
        const created = await this.personnelService.create({
          ci: value.ci,
          ciComplement: value.ciComplement || undefined,
          firstName: value.firstName,
          lastName: value.lastName,
          rank: value.rank || undefined,
          phone: value.phone || undefined,
          isOfficer: true,
        });
        officerId = created.id;
        officerFullName = `${value.firstName} ${value.lastName}`;
      } else {
        const officer = this.officers().find((o) => o.id === officerId);
        officerFullName = officer ? `${officer.firstName} ${officer.lastName}` : '';
      }

      await this.unitsService.assignTransportManager({
        unitId: this.selectedUnitId(),
        officerId,
        startDate: this.startDate(),
        referenceDocument: this.referenceDocument() || undefined,
        notes: this.notes() || undefined,
      });

      if (this.createAccount()) {
        await this.createManagerAccount(officerId, officerFullName);
      }

      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo registrar la designación.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  /// spec 002/015: cuenta con rol TRANSPORTES vinculada al encargado
  /// designado, acotada por unidad desde el backend.
  private async createManagerAccount(officerId: string, fullName: string): Promise<void> {
    const roles = await firstValueFrom(this.usersService.listRoles());
    const transportesRole = roles.find((role) => role.code === 'TRANSPORTES');
    if (!transportesRole) {
      throw new Error('No existe el rol Área de Transportes en el sistema.');
    }
    await this.usersService.create({
      username: this.username(),
      password: this.password(),
      fullName: fullName || this.username(),
      roleId: transportesRole.id,
      personnelId: officerId,
    });
  }
}
