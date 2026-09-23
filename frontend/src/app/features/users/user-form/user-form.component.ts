import { Component, effect, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FORM_MODAL_IMPORTS } from '../../../shared/form-modal.imports';
import { UsersService } from '../users.service';
import { CreateUserInput, Role, User } from '../user.model';
import { FormValidation } from '../../../shared/validation/form-validation';
import { email, required } from '../../../shared/validation/validators';

interface UserFormState {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  rank?: string;
  phone?: string;
  roleId: string;
}

const EMPTY_FORM: UserFormState = {
  username: '',
  password: '',
  fullName: '',
  roleId: '',
};

/** Alta y edición de usuarios (spec 004, RF-1/RF-7/RF-8). */
@Component({
  imports: [...FORM_MODAL_IMPORTS],
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
})
export class UserFormComponent {
  readonly user = input<User | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly roles: () => Role[];
  protected readonly form = signal<UserFormState>(EMPTY_FORM);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly validation = new FormValidation(this.form, {
    username: required<string, UserFormState>('El nombre de usuario es obligatorio.'),
    fullName: required('El nombre completo es obligatorio.'),
    roleId: required('Seleccione un rol.'),
    password: (value) => {
      if (!this.isEdit && !value.trim()) return 'La contraseña es obligatoria.';
      if (value && value.length < 8) return 'Debe tener al menos 8 caracteres.';
      return null;
    },
    email: email<UserFormState>(),
  });

  constructor(private readonly usersService: UsersService) {
    this.roles = toSignal(this.usersService.listRoles(), { initialValue: [] });

    effect(() => {
      const user = this.user();
      this.form.set(
        user
          ? {
              username: user.username,
              password: '',
              fullName: user.fullName,
              email: user.email ?? undefined,
              rank: user.rank ?? undefined,
              phone: user.phone ?? undefined,
              roleId: user.roleId,
            }
          : EMPTY_FORM,
      );
    });
  }

  protected get isEdit(): boolean {
    return this.user() !== null;
  }

  protected patch(partial: Partial<UserFormState>): void {
    this.form.update((current) => ({ ...current, ...partial }));
  }

  protected async submit(): Promise<void> {
    const value = this.form();
    if (!this.validation.validateAll()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const current = this.user();
      const { password, ...rest } = value;
      const payload = password ? { ...rest, password } : rest;
      if (current) {
        await this.usersService.update(current.id, payload);
      } else {
        await this.usersService.create(payload as CreateUserInput);
      }
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'No se pudo guardar el usuario.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
