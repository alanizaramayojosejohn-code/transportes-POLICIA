import { ConfirmRequest } from './confirm.service';

export interface ActivationCopy {
  /** Sujeto con artículo, tal como sigue al verbo: «al usuario», «la unidad», «el repuesto». */
  readonly subject: string;
  /** Nombre del registro concreto, para que se vea sobre cuál se está actuando. */
  readonly name: string;
  /** Qué deja de poder hacerse tras la baja; se completa como «<name> <effect>.». */
  readonly effect: string;
  /** Qué vuelve a poder hacerse al reactivar; se completa como «<name> <restoredEffect>.». */
  readonly restoredEffect: string;
  /** Verbo de la baja, cuando la pantalla no dice «Dar de baja» (p. ej. «Desactivar»). */
  readonly deactivateLabel?: string;
}

/**
 * Diálogo de los botones que alternan activo/inactivo. Un mismo botón hace dos cosas muy
 * distintas, así que el diálogo también: la baja avisa y va en rojo, la reactivación sólo
 * confirma y va en verde — reactivar no es una acción peligrosa y no debe leerse como tal.
 *
 * Todas las bajas del sistema son reversibles (marcan `isActive`, no borran), y el diálogo lo
 * dice siempre con la misma frase para que el usuario no dude de si está perdiendo el registro.
 */
export function activationConfirm(isActive: boolean, copy: ActivationCopy): ConfirmRequest {
  const deactivateLabel = copy.deactivateLabel ?? 'Dar de baja';
  return isActive
    ? {
        title: `¿${deactivateLabel} ${copy.subject}?`,
        message: `${copy.name} ${copy.effect}. La baja es reversible: se puede reactivar más adelante.`,
        confirmLabel: deactivateLabel,
        danger: true,
      }
    : {
        title: `¿Reactivar ${copy.subject}?`,
        message: `${copy.name} ${copy.restoredEffect}.`,
        confirmLabel: 'Reactivar',
        danger: false,
      };
}
