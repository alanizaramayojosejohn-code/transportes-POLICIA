/**
 * Fábricas de validadores de campo. Cada una devuelve un `FieldValidator`
 * (`(value, form) => string | null`) para usar con `FormValidation`
 * (`./form-validation`). Mensajes en español boliviano, impersonales, igual
 * que el resto de la interfaz.
 */
export type FieldValidator<V, T = unknown> = (value: V, form: T) => string | null;

const isBlank = (value: unknown): boolean =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

export function required<V, T = unknown>(
  message = 'Este campo es obligatorio.',
): FieldValidator<V, T> {
  return (value) => (isBlank(value) ? message : null);
}

/** Sólo valida cuando `condition(form)` es verdadero; útil para campos condicionalmente obligatorios. */
export function requiredIf<V, T = unknown>(
  condition: (form: T) => boolean,
  message = 'Este campo es obligatorio.',
): FieldValidator<V, T> {
  return (value, form) => (condition(form) && isBlank(value) ? message : null);
}

export function pattern<T = unknown>(regex: RegExp, message: string): FieldValidator<string, T> {
  return (value) => (isBlank(value) || regex.test(value) ? null : message);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function email<T = unknown>(
  message = 'Ingrese un correo electrónico válido.',
): FieldValidator<string | null | undefined, T> {
  return (value) => (isBlank(value) || EMAIL_RE.test(value as string) ? null : message);
}

export function minLength<T = unknown>(
  n: number,
  message?: string,
): FieldValidator<string | null | undefined, T> {
  return (value) =>
    isBlank(value) || (value as string).trim().length >= n
      ? null
      : (message ?? `Debe tener al menos ${n} caracteres.`);
}

export function maxLength<T = unknown>(
  n: number,
  message?: string,
): FieldValidator<string | null | undefined, T> {
  return (value) =>
    isBlank(value) || (value as string).length <= n
      ? null
      : (message ?? `No puede superar los ${n} caracteres.`);
}

export function min<T = unknown>(
  n: number,
  message?: string,
): FieldValidator<number | null | undefined, T> {
  return (value) =>
    value === null || value === undefined || Number.isNaN(value) || value >= n
      ? null
      : (message ?? `El valor no puede ser menor a ${n}.`);
}

export function max<T = unknown>(
  n: number,
  message?: string,
): FieldValidator<number | null | undefined, T> {
  return (value) =>
    value === null || value === undefined || Number.isNaN(value) || value <= n
      ? null
      : (message ?? `El valor no puede ser mayor a ${n}.`);
}

export function positive<T = unknown>(
  message = 'El valor debe ser mayor a cero.',
): FieldValidator<number | null | undefined, T> {
  return (value) =>
    value === null || value === undefined || Number.isNaN(value) || value > 0 ? null : message;
}

/** Compara contra otro campo del mismo formulario (p.ej. kilometraje de llegada vs. de salida). */
export function minField<T>(
  otherValue: (form: T) => number | null | undefined,
  message: (other: number) => string,
): FieldValidator<number | null | undefined, T> {
  return (value, form) => {
    const other = otherValue(form);
    if (value === null || value === undefined || other === null || other === undefined) {
      return null;
    }
    return value >= other ? null : message(other);
  };
}

/** Encadena varios validadores sobre el mismo campo: el primer error gana. */
export function combine<V, T = unknown>(
  ...validators: FieldValidator<V, T>[]
): FieldValidator<V, T> {
  return (value, form) => {
    for (const validator of validators) {
      const error = validator(value, form);
      if (error) return error;
    }
    return null;
  };
}
