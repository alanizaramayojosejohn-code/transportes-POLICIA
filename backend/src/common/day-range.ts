/**
 * Rango de fechas de un filtro «Desde / Hasta» sobre una columna de timestamp.
 *
 * Los filtros de la interfaz son `<input type="date">`, o sea días
 * (`2026-10-02`), y el resto del sistema los convierte con `new Date(...)` a
 * secas: eso los interpreta como medianoche UTC, así que «Hasta 02/10» corta
 * el día elegido antes de que empiece y «Desde = Hasta = hoy» no devuelve
 * nada. En un reporte consolidado ese recorte silencioso cambia los totales,
 * así que aquí el día se expande al día completo de Bolivia: desde 00:00 hasta
 * 23:59:59.999 hora local.
 *
 * Bolivia es UTC-4 todo el año (no tiene horario de verano), así que alcanza
 * con un desplazamiento fijo — no hace falta una librería de zonas horarias.
 */
const BOLIVIA_UTC_OFFSET_HOURS = 4;

const DAY_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/// Inicio del día boliviano, en UTC. Un valor que ya trae hora (ISO completo)
/// se respeta tal cual: ya es un instante, no un día.
function startOfDay(value: string): Date {
  const match = DAY_ONLY.exec(value);
  if (!match) {
    return new Date(value);
  }
  const [, year, month, day] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      BOLIVIA_UTC_OFFSET_HOURS,
    ),
  );
}

/// Último milisegundo del día boliviano, en UTC.
function endOfDay(value: string): Date {
  const match = DAY_ONLY.exec(value);
  if (!match) {
    return new Date(value);
  }
  const [, year, month, day] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day) + 1,
      BOLIVIA_UTC_OFFSET_HOURS,
      0,
      0,
      -1,
    ),
  );
}

/** `undefined` si no hay ninguna de las dos fechas: sin filtro de rango. */
export function dayRange(
  fromDate?: string,
  toDate?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!fromDate && !toDate) {
    return undefined;
  }
  return {
    ...(fromDate ? { gte: startOfDay(fromDate) } : {}),
    ...(toDate ? { lte: endOfDay(toDate) } : {}),
  };
}
