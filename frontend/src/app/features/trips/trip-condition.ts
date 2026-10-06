/**
 * Estado del vehículo declarado en la salida y en la llegada de un recorrido
 * (spec 006, RF-10/RF-11).
 *
 * Era texto libre («Bueno» como simple *placeholder*), así que cada conductor
 * escribía lo que quería y el dato no servía ni para agrupar. Ahora se elige
 * de una lista corta —lo que alguien puede juzgar mirando el vehículo en el
 * momento— con «Otro» para lo que no entre ahí.
 *
 * No es el enum `VehicleConditionCode` del esquema (spec 001): ese describe
 * la condición *administrativa* del vehículo (`FUERA_DE_USO`, `BAJA`,
 * `EXTRAVIADO`…), la declara el Área de Transportes y vive en un historial
 * propio. Lo que el conductor reporta al salir o al volver no cambia esa
 * condición, y por eso tampoco se guarda ahí.
 *
 * Deliberadamente sin columna nueva: el valor elegido se compone en el mismo
 * campo de texto que ya existía (`departureConditionNotes` /
 * `returnConditionNotes`), así que no hay migración y los registros viejos
 * siguen leyéndose tal cual.
 */
export const TRIP_CONDITION_CODES = ['BUENO', 'REGULAR', 'DETERIORADO', 'OTRO'] as const;

export type TripConditionCode = (typeof TRIP_CONDITION_CODES)[number];

/** `''` es «sin especificar»: el estado sigue siendo opcional (RF-1/RF-5). */
export type TripConditionSelection = TripConditionCode | '';

export const TRIP_CONDITION_LABEL: Record<TripConditionCode, string> = {
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  DETERIORADO: 'Deteriorado',
  OTRO: 'Otro',
};

/** Separador entre el estado y la observación dentro del mismo campo de texto. */
const SEPARATOR = ' — ';

/**
 * Arma el texto que se guarda: el estado elegido y, detrás, la observación
 * si se escribió una («Regular — se escucha ruido en el motor»).
 *
 * Con «Otro», el estado es lo que el usuario escribió en `otherText`: no
 * tiene sentido guardar la etiqueta «Otro» y perder la descripción.
 *
 * Devuelve `undefined` cuando no hay nada que guardar, para no mandar una
 * cadena vacía al backend.
 */
export function composeConditionNotes(
  code: TripConditionSelection,
  otherText: string,
  observations = '',
): string | undefined {
  const state = code === 'OTRO' ? otherText.trim() : code === '' ? '' : TRIP_CONDITION_LABEL[code];
  const notes = observations.trim();
  if (!state) return notes || undefined;
  return notes ? `${state}${SEPARATOR}${notes}` : state;
}
