import { CombinedGraphQLErrors } from '@apollo/client/errors';

/**
 * ¿Vale la pena reintentar esta operación más tarde, o ya está decidida?
 *
 * Es la frontera entre «no se pudo enviar» y «el servidor lo rechazó», y de
 * ella depende que una mutación se encole para reenviarla sin conexión
 * (`TripsService`, `TripOutboxService`) o se muestre como error al usuario.
 * Encolar un rechazo del servidor sería lo peor de los dos mundos: el
 * usuario creería que quedó registrado y la cola reintentaría para siempre
 * algo que nunca va a pasar.
 *
 * - Errores GraphQL (`CombinedGraphQLErrors`): el servidor entendió la
 *   operación y la rechazó con un motivo. Decidido, no se reintenta.
 * - Respuestas 4xx: la petición está mal formada o no autorizada. Tampoco
 *   cambia reintentándola.
 * - Todo lo demás —red caída (`status: 0`), 5xx, timeout, respuesta
 *   ilegible— es transporte: se reintenta.
 */
export function isRetryableError(error: unknown): boolean {
  if (CombinedGraphQLErrors.is(error)) return false;
  const status = statusOf(error);
  return status === null || status < 400 || status >= 500;
}

/**
 * Código HTTP del error, mirando también una causa anidada: según por dónde
 * falle, `HttpLink` entrega el `HttpErrorResponse` de Angular tal cual o
 * envuelto por Apollo.
 */
function statusOf(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { status?: unknown; statusCode?: unknown; cause?: unknown };
  for (const value of [candidate.status, candidate.statusCode]) {
    if (typeof value === 'number') return value;
  }
  return candidate.cause ? statusOf(candidate.cause) : null;
}
