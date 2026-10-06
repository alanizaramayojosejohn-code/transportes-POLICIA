import { Component, computed, input, output } from '@angular/core';
import { DETAIL_MODAL_IMPORTS } from '../../../shared/detail-modal.imports';
import { formatDateTimeEs } from '../../../shared/date-format';
import { User } from '../user.model';

/**
 * Ficha de la cuenta de usuario (spec 013): reproduce `usuarioDetalleModal`
 * (`prototipo/index.html:9159-9232`) — cabecera con las iniciales del nombre, insignia de
 * estado y grilla de datos de la cuenta.
 *
 * «Cambio de contraseña» de la maqueta no tiene dato detrás: el backend no guarda cuándo se
 * cambió la clave (sí obliga a cambiarla al primer ingreso, spec 013 RF-6, pero no lo fecha).
 * En su lugar la grilla lleva el correo y el teléfono de contacto, que sí se registran.
 */
@Component({
  imports: [...DETAIL_MODAL_IMPORTS],
  selector: 'app-user-detail',
  templateUrl: './user-detail.component.html',
})
export class UserDetailComponent {
  readonly user = input.required<User>();
  readonly closed = output<void>();

  protected readonly formatDateTime = formatDateTimeEs;

  /// Iniciales del nombre completo, no las dos primeras letras: la maqueta rotula el avatar con
  /// `US` fijo porque era estático.
  protected readonly initials = computed(() => {
    const words = this.user()
      .fullName.split(/\s+/)
      .filter((word) => word.length > 0);
    if (words.length === 0) return 'US';
    const letters = words.slice(0, 2).map((word) => word[0]);
    return letters.join('').toUpperCase();
  });

  protected readonly personnelLabel = computed(() => {
    const personnel = this.user().personnel;
    if (!personnel) return 'Sin ficha de personal vinculada';
    const unit = personnel.unit ? ` · ${personnel.unit.name}` : '';
    return `${personnel.firstName} ${personnel.lastName} · CI ${personnel.ci}${unit}`;
  });
}
