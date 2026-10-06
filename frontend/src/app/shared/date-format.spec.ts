import { toDateInputValue, toDateTimeInputValue } from './date-format';

/**
 * Lo que se prueba acá es justamente lo que `toISOString()` hacía mal: estas
 * dos funciones leen el calendario y el reloj **locales**, no UTC. Las fechas
 * se construyen con `new Date(año, mes, día, ...)`, que también es local, así
 * que la prueba vale en cualquier zona en la que se corra.
 */
describe('toDateInputValue', () => {
  it('devuelve la fecha local en aaaa-mm-dd', () => {
    expect(toDateInputValue(new Date(2026, 9, 6, 14, 30))).toBe('2026-10-06');
  });

  it('rellena mes y día de un dígito', () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  /// El caso que rompía: a las 22:00 en Bolivia (UTC−4) ya es el día
  /// siguiente en UTC, y `toISOString()` devolvía mañana. Varias reglas
  /// rechazan fechas futuras, así que el formulario se armaba inválido.
  it('sigue siendo hoy de noche, aunque en UTC ya sea mañana', () => {
    expect(toDateInputValue(new Date(2026, 9, 6, 22, 0))).toBe('2026-10-06');
  });

  it('respeta el último día del mes a última hora', () => {
    expect(toDateInputValue(new Date(2026, 9, 31, 23, 59))).toBe('2026-10-31');
  });
});

describe('toDateTimeInputValue', () => {
  it('devuelve fecha y hora locales en aaaa-mm-ddThh:mm', () => {
    expect(toDateTimeInputValue(new Date(2026, 9, 6, 8, 5))).toBe('2026-10-06T08:05');
  });

  /// Mismo desvío que arriba, pero visible en la hora: `toISOString()`
  /// mostraba las 12:05 para una salida de las 08:05.
  it('no adelanta la hora al desplazamiento de la zona', () => {
    const value = toDateTimeInputValue(new Date(2026, 9, 6, 8, 5));
    expect(value.endsWith('T08:05')).toBe(true);
  });

  it('rellena hora y minuto de un dígito', () => {
    expect(toDateTimeInputValue(new Date(2026, 9, 6, 0, 0))).toBe('2026-10-06T00:00');
  });
});
