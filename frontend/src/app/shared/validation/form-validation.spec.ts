import { signal } from '@angular/core';
import { FormValidation } from './form-validation';
import { combine, email, minField, positive, required } from './validators';

/// Forma reducida del cierre de recorrido (spec 006): el caso real donde la validación cruzada
/// entre campos importa — el kilometraje de llegada no puede ser menor al de salida.
interface CloseTripForm {
  returnOdometer: number | null;
  returnFuelLevel: number | null;
  notifyTo: string;
}

function setup(initial: Partial<CloseTripForm> = {}) {
  const form = signal<CloseTripForm>({
    returnOdometer: null,
    returnFuelLevel: null,
    notifyTo: '',
    ...initial,
  });
  const departureOdometer = 12000;
  const validation = new FormValidation<CloseTripForm>(form, {
    returnOdometer: combine(
      required('Este campo es obligatorio.'),
      minField(
        () => departureOdometer,
        (other) => `No puede ser menor a ${other}.`,
      ),
    ),
    returnFuelLevel: positive(),
    notifyTo: email(),
  });
  return { form, validation };
}

describe('FormValidation', () => {
  it('no muestra errores de un campo que el usuario todavía no tocó', () => {
    const { validation } = setup();

    expect(validation.error('returnOdometer')).toBeNull();
  });

  it('muestra el error del campo una vez tocado', () => {
    const { validation } = setup();

    validation.touch('returnOdometer');

    expect(validation.error('returnOdometer')).toBe('Este campo es obligatorio.');
  });

  it('el error desaparece al corregir el valor', () => {
    const { form, validation } = setup();
    validation.touch('returnOdometer');

    form.update((f) => ({ ...f, returnOdometer: 12500 }));

    expect(validation.error('returnOdometer')).toBeNull();
  });

  /// El cierre de recorrido no debe pasar en silencio con un campo inválido que nunca se tocó.
  it('validateAll marca todos los campos y bloquea el envío inválido', () => {
    const { validation } = setup();

    expect(validation.validateAll()).toBe(false);
    expect(validation.error('returnOdometer')).toBe('Este campo es obligatorio.');
  });

  it('validateAll deja pasar un formulario completo y coherente', () => {
    const { validation } = setup({ returnOdometer: 12500, returnFuelLevel: 40 });

    expect(validation.validateAll()).toBe(true);
    expect(validation.error('returnOdometer')).toBeNull();
  });

  it('rechaza un kilometraje de llegada menor al de salida', () => {
    const { validation } = setup({ returnOdometer: 11000 });

    expect(validation.validateAll()).toBe(false);
    expect(validation.error('returnOdometer')).toBe('No puede ser menor a 12000.');
  });

  it('un campo opcional vacío no es un error; uno con formato inválido sí', () => {
    const { form, validation } = setup({ returnOdometer: 12500 });

    expect(validation.validateAll()).toBe(true);

    form.update((f) => ({ ...f, notifyTo: 'no-es-correo' }));

    expect(validation.error('notifyTo')).toBe('Ingrese un correo electrónico válido.');
  });

  it('reset vuelve a ocultar los errores al reabrir el formulario', () => {
    const { validation } = setup();
    validation.validateAll();

    validation.reset();

    expect(validation.error('returnOdometer')).toBeNull();
  });
});

describe('validators', () => {
  it('required trata los espacios en blanco como vacío', () => {
    const validate = required<string>();

    expect(validate('   ', {})).toBe('Este campo es obligatorio.');
    expect(validate('x', {})).toBeNull();
  });

  it('positive rechaza cero y negativos pero deja pasar el campo sin llenar', () => {
    const validate = positive();

    expect(validate(0, {})).toBe('El valor debe ser mayor a cero.');
    expect(validate(-1, {})).toBe('El valor debe ser mayor a cero.');
    expect(validate(null, {})).toBeNull();
    expect(validate(1, {})).toBeNull();
  });

  it('minField no opina si falta alguno de los dos valores', () => {
    const validate = minField<{ from: number | null }>(
      (form) => form.from,
      (other) => `>= ${other}`,
    );

    expect(validate(null, { from: 10 })).toBeNull();
    expect(validate(5, { from: null })).toBeNull();
    expect(validate(5, { from: 10 })).toBe('>= 10');
    expect(validate(10, { from: 10 })).toBeNull();
  });

  it('combine devuelve el primer error de la cadena', () => {
    const validate = combine<string>(required('falta'), email('mal correo'));

    expect(validate('', {})).toBe('falta');
    expect(validate('x', {})).toBe('mal correo');
    expect(validate('a@b.co', {})).toBeNull();
  });
});
