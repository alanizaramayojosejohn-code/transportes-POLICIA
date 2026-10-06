/**
 * Mensaje legible de un error de mutación. El backend manda el motivo real en `Error.message`
 * («El repuesto ya se usó en una orden», «La placa ya existe»…) y es siempre más útil que un
 * texto genérico; `fallback` sólo cubre los fallos sin mensaje (red caída, error no tipado).
 */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
