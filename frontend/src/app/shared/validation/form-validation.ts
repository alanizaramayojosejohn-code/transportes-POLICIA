import { Signal, computed, signal } from '@angular/core';
import { FieldValidator } from './validators';

export type FieldValidators<T> = {
  [K in keyof T]?: FieldValidator<T[K], T>;
};

/**
 * Validación por campo sobre el formulario existente (`signal<FormShape>` +
 * `patch()`, sin librería de formularios — convención ya fijada en el
 * proyecto). No duplica el estado del formulario: lee de `form` y sólo
 * agrega "¿qué campos se tocaron?" y "¿qué error tiene cada uno?". El error
 * de un campo sólo se muestra una vez que se tocó (`touch`, típicamente en
 * `(blur)`), para no fastidiar al usuario mientras todavía está escribiendo.
 */
export class FormValidation<T extends object> {
  private readonly touched = signal<ReadonlySet<keyof T>>(new Set());
  private readonly errors: { [K in keyof T]?: Signal<string | null> } = {};

  constructor(
    private readonly form: Signal<T>,
    private readonly validators: FieldValidators<T>,
  ) {
    for (const key of Object.keys(validators) as (keyof T)[]) {
      const validator = validators[key];
      if (!validator) continue;
      this.errors[key] = computed(() =>
        this.touched().has(key) ? validator(this.form()[key], this.form()) : null,
      );
    }
  }

  /** Marca un campo como tocado; su error (si tiene) pasa a mostrarse. */
  touch(field: keyof T): void {
    if (this.touched().has(field)) return;
    this.touched.update((set) => new Set(set).add(field));
  }

  /** Error visible del campo (`null` si no tiene, o si todavía no se tocó). */
  error(field: keyof T): string | null {
    return this.errors[field]?.() ?? null;
  }

  /**
   * Marca todos los campos con validador como tocados y evalúa si el
   * formulario completo es válido — para llamar al enviar, así un campo
   * inválido que el usuario nunca "tocó" (nunca hizo blur) también se marca
   * y muestra su error en vez de dejar pasar el envío en silencio.
   */
  validateAll(): boolean {
    const form = this.form();
    let valid = true;
    const allKeys = Object.keys(this.validators) as (keyof T)[];
    for (const key of allKeys) {
      const validator = this.validators[key];
      if (validator && validator(form[key], form) !== null) {
        valid = false;
      }
    }
    this.touched.update((set) => new Set([...set, ...allKeys]));
    return valid;
  }

  /** Reinicia el estado "tocado" — usar al reabrir el formulario con datos nuevos. */
  reset(): void {
    this.touched.set(new Set());
  }
}
