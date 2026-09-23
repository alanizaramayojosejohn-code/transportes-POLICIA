import { Component, computed, effect, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { PersonnelService } from '../../personnel/personnel.service';
import { CreatePersonnelInput, Personnel } from '../../personnel/personnel.model';
import { UsersService } from '../../users/users.service';
import { Role } from '../../users/user.model';
import { POLICE_RANK_OPTIONS } from '../../../shared/police-ranks';
import { FormValidation } from '../../../shared/validation/form-validation';
import { requiredIf, required } from '../../../shared/validation/validators';

/// Roles de sistema que se asignan desde esta pantalla (spec 015, RF-2): los
/// roles operativos (TRANSPORTES, CONDUCTOR) se asignan desde Unidades y
/// Conductores, no desde aquí.
const ADMIN_OFFICE_ROLE_CODES = ['ADMINISTRADOR', 'COMBUSTIBLE', 'ALMACEN'] as const;

interface TransportOfficeFormState {
  ci: string;
  ciComplement: string;
  firstName: string;
  lastName: string;
  rank: string;
  phone: string;
  username: string;
  password: string;
  roleId: string;
}

function wantsAccount(form: TransportOfficeFormState): boolean {
  return !!(form.username || form.password || form.roleId);
}

const EMPTY_FORM: TransportOfficeFormState = {
  ci: '',
  ciComplement: '',
  firstName: '',
  lastName: '',
  rank: '',
  phone: '',
  username: '',
  password: '',
  roleId: '',
};

/** Alta combinada de personal administrativo + su cuenta (spec 015, RF-1 a RF-4). */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-transport-office-form',
  templateUrl: './transport-office-form.component.html',
})
export class TransportOfficeFormComponent {
  readonly person = input<Personnel | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly rankOptions = POLICE_RANK_OPTIONS;
  protected readonly form = signal<TransportOfficeFormState>(EMPTY_FORM);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly allRoles: () => Role[];
  protected readonly roleOptions = computed(() =>
    this.allRoles().filter((role) =>
      (ADMIN_OFFICE_ROLE_CODES as readonly string[]).includes(role.code),
    ),
  );

  protected readonly validation = new FormValidation(this.form, {
    ci: required<string, TransportOfficeFormState>('La CI es obligatoria.'),
    firstName: required('Los nombres son obligatorios.'),
    lastName: required('Los apellidos son obligatorios.'),
    username: requiredIf(
      (form) => this.canManageAccount && wantsAccount(form),
      'El usuario es obligatorio para crear la cuenta.',
    ),
    password: (value, form) => {
      if (!this.canManageAccount || !wantsAccount(form)) return null;
      if (!value.trim()) return 'La contraseña es obligatoria para crear la cuenta.';
      return value.length < 8 ? 'Debe tener al menos 8 caracteres.' : null;
    },
    roleId: requiredIf(
      (form) => this.canManageAccount && wantsAccount(form),
      'Seleccione un rol de sistema para crear la cuenta.',
    ),
  });

  constructor(
    private readonly personnelService: PersonnelService,
    private readonly usersService: UsersService,
  ) {
    this.allRoles = toSignal(this.usersService.listRoles(), { initialValue: [] });

    effect(() => {
      const person = this.person();
      this.form.set(
        person
          ? {
              ci: person.ci,
              ciComplement: person.ciComplement ?? '',
              firstName: person.firstName,
              lastName: person.lastName,
              rank: person.rank ?? '',
              phone: person.phone ?? '',
              username: '',
              password: '',
              roleId: '',
            }
          : EMPTY_FORM,
      );
    });
  }

  protected get isEdit(): boolean {
    return this.person() !== null;
  }

  /// La cuenta ya vinculada no se recrea desde aquí (RF-8): sólo se ofrece
  /// crear una cuenta nueva si la ficha todavía no tiene una.
  protected get canManageAccount(): boolean {
    return !this.person()?.userId;
  }

  protected patch(partial: Partial<TransportOfficeFormState>): void {
    this.form.update((current) => ({ ...current, ...partial }));
  }

  protected async submit(): Promise<void> {
    const value = this.form();
    if (!this.validation.validateAll()) {
      return;
    }
    const createsAccount = this.canManageAccount && wantsAccount(value);

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const payload: CreatePersonnelInput = {
        ci: value.ci,
        ciComplement: value.ciComplement || undefined,
        firstName: value.firstName,
        lastName: value.lastName,
        rank: value.rank || undefined,
        phone: value.phone || undefined,
        isAdmin: true,
      };
      const current = this.person();
      const personnel = current
        ? await this.personnelService.update(current.id, payload)
        : await this.personnelService.create(payload);

      if (createsAccount) {
        await this.usersService.create({
          username: value.username,
          password: value.password,
          fullName: `${value.firstName} ${value.lastName}`,
          roleId: value.roleId,
          personnelId: personnel.id,
        });
      }

      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo guardar el registro.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
