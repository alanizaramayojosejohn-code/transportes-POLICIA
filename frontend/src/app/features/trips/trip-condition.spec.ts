import { composeConditionNotes } from './trip-condition';

describe('composeConditionNotes', () => {
  it('guarda la etiqueta del estado elegido', () => {
    expect(composeConditionNotes('BUENO', '')).toBe('Bueno');
  });

  it('agrega la observación detrás del estado', () => {
    expect(composeConditionNotes('REGULAR', '', 'Ruido en el motor')).toBe(
      'Regular — Ruido en el motor',
    );
  });

  /// Con «Otro» el estado es lo que escribió el usuario: guardar la etiqueta
  /// «Otro» perdería la descripción, que es justamente el dato.
  it('con «Otro» guarda la descripción como estado', () => {
    expect(composeConditionNotes('OTRO', 'Llanta delantera baja', 'Se cambió en ruta')).toBe(
      'Llanta delantera baja — Se cambió en ruta',
    );
  });

  it('deja la observación sola si no se eligió estado', () => {
    expect(composeConditionNotes('', '', 'Sin novedad')).toBe('Sin novedad');
  });

  /// El campo sigue siendo opcional (RF-1/RF-5): sin nada que guardar no se
  /// manda una cadena vacía al backend.
  it('devuelve undefined cuando no hay nada que guardar', () => {
    expect(composeConditionNotes('', '', '   ')).toBeUndefined();
    expect(composeConditionNotes('OTRO', '  ')).toBeUndefined();
  });
});
