import { Component, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { UsersService } from '../users.service';
import { Role, User, UserFilter } from '../user.model';
import { UserFormComponent } from '../user-form/user-form.component';
import { formatDateEs } from '../../../shared/date-format';
import { LIST_PAGE_IMPORTS } from '../../../shared/list-page.imports';

/// Agrupación visual (spec 015, RF-9 a RF-11): la consulta y los filtros
/// siguen siendo los mismos de `users`; sólo cambia cómo se presenta.
const MANAGER_ROLE_CODE = 'TRANSPORTES';
const DRIVER_ROLE_CODE = 'CONDUCTOR';

/** Listado y alta/edición de usuarios (spec 004). Sólo ADMINISTRADOR llega aquí. */
@Component({
  imports: [...LIST_PAGE_IMPORTS, UserFormComponent],
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
})
export class UsersListComponent {
  protected readonly search = signal('');
  protected readonly roleId = signal('');
  protected readonly isActive = signal<'true' | 'false' | ''>('');

  private readonly filter = computed<UserFilter>(() => ({
    search: this.search() || undefined,
    roleId: this.roleId() || undefined,
    isActive: this.isActive() === '' ? undefined : this.isActive() === 'true',
    take: 20,
  }));

  protected readonly page = toSignal(
    toObservable(this.filter).pipe(switchMap((filter) => this.usersService.list(filter))),
    { initialValue: { items: [], total: 0 } },
  );

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
    if (isActive) {
      await this.usersService.deactivate(id);
    } else {
      await this.usersService.reactivate(id);
    }
  }
}
