/** Fechas en formato boliviano (dd/mm/aaaa), sin depender de una librería nueva. */
const FORMATTER = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDateEs(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return FORMATTER.format(date);
}

const DATETIME_FORMATTER = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateTimeEs(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return DATETIME_FORMATTER.format(date);
}

const pad = (part: number) => String(part).padStart(2, '0');

/**
 * Fecha del calendario local en `aaaa-mm-dd`: el día que el usuario tiene hoy.
 * Sirve de valor inicial de un `<input type="date">` y de «hoy» para lo que se
 * manda al backend como fecha sola (`startDate`, `endDate`…).
 *
 * `new Date().toISOString().slice(0, 10)` parece lo mismo y no lo es: está en
 * UTC, así que en Bolivia (UTC−4) desde las 20:00 devuelve **mañana**. Eso no
 * es cosmético: varias reglas del sistema rechazan fechas futuras (spec 002
 * RF-20, spec 014 RF-6), de modo que una designación hecha de noche se armaba
 * con esa fecha y el backend la rechazaba sin que el usuario hubiera tocado
 * nada.
 */
export function toDateInputValue(value: Date = new Date()): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/**
 * Valor inicial de un `<input type="datetime-local">`: `aaaa-mm-ddThh:mm` en
 * hora local.
 *
 * `new Date().toISOString().slice(0, 16)` parece lo mismo y no lo es: está en
 * UTC, así que en Bolivia (UTC−4) el campo aparece cuatro horas adelantado.
 * Y el desvío no es sólo visual — el navegador devuelve lo que muestra el
 * campo interpretado como hora local, de modo que `new Date(valor)` lo
 * convierte otra vez y guarda esas cuatro horas de más.
 */
export function toDateTimeInputValue(value: Date = new Date()): string {
  return `${toDateInputValue(value)}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
