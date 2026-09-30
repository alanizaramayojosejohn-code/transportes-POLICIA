import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UsersService } from '../users.service';
import { Role, User, UserFilter } from '../user.model';
import { UserFormComponent } from '../user-form/user-form.component';
import { UserDetailComponent } from '../user-detail/user-detail.component';
import { formatDateEs } from '../../../shared/date-format';
import { activationConfirm } from '../../../shared/confirm/activation-confirm';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { errorMessage } from '../../../shared/error-message';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';
import { loadable } from '../../../shared/loadable';
import { PAGE_SIZE } from '../../../shared/pagination/pagination.component';
import { ToastService } from '../../../shared/toast/toast.service';

/// Agrupación visual (spec 015, RF-9 a RF-11): la consulta y los filtros
/// siguen siendo los mismos de `users`; sólo cambia cómo se presenta.
const MANAGER_ROLE_CODE = 'TRANSPORTES';
const DRIVER_ROLE_CODE = 'CONDUCTOR';

/** Listado y alta/edición de usuarios (spec 004). Sólo ADMINISTRADOR llega aquí. */
@Component({
  imports: [...LIST_PAGE_IMPORTS, UserFormComponent, UserDetailComponent],
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
})
export class UsersListComponent {
  protected readonly search = signal('');
  protected readonly roleId = signal('');
  protected readonly isActive = signal<'true' | 'false' | ''>('');

  private readonly filters = computed(() => ({
    search: this.search() || undefined,
    roleId: this.roleId() || undefined,
    isActive: this.isActive() === '' ? undefined : this.isActive() === 'true',
  }));

  /// Vuelve a la primera página cuando cambia cualquier filtro.
  protected readonly skip = linkedSignal({ source: this.filters, computation: () => 0 });

  private readonly query = computed<UserFilter>(() => ({
    ...this.filters(),
    skip: this.skip(),
    take: PAGE_SIZE,
  }));

  private readonly result = loadable(this.query, (filter) => this.usersService.list(filter), {
    items: [],
    total: 0,
  });
  protected readonly page = this.result.value;
  protected readonly loading = this.result.loading;

  /// RF-9: Administrativos, Encargados y Conductores, en ese orden.
  protected readonly managerUsers = computed<User[]>(() =>
    this.page().items.filter((u) => u.role.code === MANAGER_ROLE_CODE),
  );
  protected readonly driverUsers = computed<User[]>(() =>
    this.page().items.filter((u) => u.role.code === DRIVER_ROLE_CODE),
  );
  protected readonly administrativeUsers = computed<User[]>(() =>
    this.page().items.filter(
      (u) => u.role.code !== MANAGER_ROLE_CODE && u.role.code !== DRIVER_ROLE_CODE,
    ),
  );

  protected readonly roles: () => Role[];

  protected readonly showForm = signal(false);
  protected readonly editingUserId = signal<string | null>(null);
  protected readonly formatDate = formatDateEs;

  protected readonly detailUserId = signal<string | null>(null);
  protected readonly detailUser = computed(
    () => this.page().items.find((u) => u.id === this.detailUserId()) ?? null,
  );

  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  constructor(private readonly usersService: UsersService) {
    this.roles = toSignal(this.usersService.listRoles(), { initialValue: [] });
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingUserId.set(null);
  }

  protected edit(id: string): void {
    this.editingUserId.set(id);
  }

  protected get editingUser() {
    const id = this.editingUserId();
    return id ? (this.page().items.find((u) => u.id === id) ?? null) : null;
  }

  protected async toggleActive(id: string, isActive: boolean): Promise<void> {
    const user = this.page().items.find((u) => u.id === id);
    if (!user) return;

    const confirmed = await this.confirm.ask(
      activationConfirm(isActive, {
        subject: 'al usuario',
        name: `${user.fullName} (${user.username})`,
        effect: 'no podrá volver a iniciar sesión',
        restoredEffect: 'podrá volver a iniciar sesión',
      }),
    );
    if (!confirmed) return;

    try {
      if (isActive) {
        await this.usersService.deactivate(id);
        this.toast.success(`Usuario ${user.fullName} dado de baja.`);
      } else {
        await this.usersService.reactivate(id);
        this.toast.success(`Usuario ${user.fullName} reactivado.`);
      }
    } catch (error) {
      this.toast.error(
        errorMessage(
          error,
          isActive ? 'No se pudo dar de baja al usuario.' : 'No se pudo reactivar al usuario.',
        ),
      );
    }
  }
}
