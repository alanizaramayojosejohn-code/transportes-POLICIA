# Spec 003 — Asignación de vehículos a unidades

> Alineado con `base_datos_transportes_postgresql_final.sql` (sección 7: `asignacion_unidad`) y
> con el prototipo `index.html` (pantalla «Asignaciones de unidad»). Cierra el hueco que dejó
> abierto el spec 001, donde la «unidad actual» de un vehículo es un dato de solo lectura sin nadie
> que lo produzca. Depende del spec 002: sin catálogo de unidades no hay a quién asignar.

## Contexto y objetivo

Un vehículo del Comando pertenece al parque automotor institucional, pero opera desde una unidad
concreta: la EPI 3, la UTOP, Radio Patrullas 110. Esa pertenencia cambia con el tiempo —por
reasignación, por necesidad operativa, por reestructuración— y cuando cambia, cambia también quién
responde por el vehículo, quién carga su combustible y a quién se le reclama la hoja de ruta.

Hoy el sistema sabe qué vehículos existen (spec 001) y qué unidades existen (spec 002), pero no
sabe qué vehículo está en qué unidad. Esta funcionalidad es ese vínculo, y lo guarda como
historial con fecha de inicio y fin, no como un campo suelto en el vehículo: la pregunta «¿en qué
unidad estaba este vehículo cuando ocurrió el incidente de julio?» sólo se puede responder si el
periodo quedó registrado.

Se mantiene el principio del prototipo, que aquí es especialmente importante: **este módulo
registra el resultado de una asignación ya determinada por el proceso institucional; no gestiona
solicitudes, aprobaciones ni trámites previos.** El sistema deja constancia de una decisión
tomada fuera de él.

## Usuarios / actores

- **ADMINISTRADOR** y **TRANSPORTES**: registran asignaciones, cierran la asignación vigente y
  corrigen los datos descriptivos de la asignación en curso.
- **Cualquier usuario autenticado** (incluye roles de solo consulta como CONSULTA, COMBUSTIBLE,
  MANTENIMIENTO, ALMACÉN): consulta el listado de asignaciones, la unidad actual de cualquier
  vehículo y el historial completo de asignaciones, sin poder modificar nada.

## Historias de usuario

- H1: Como usuario de Transportes quiero asignar un vehículo a una unidad indicando desde cuándo,
  para que el resto del sistema sepa dónde está operando ese vehículo.
- H2: Como usuario de Transportes quiero que al registrar una asignación nueva la anterior quede
  cerrada automáticamente, para que un vehículo nunca figure en dos unidades a la vez.
- H3: Como usuario de Transportes quiero cerrar la asignación vigente aunque todavía no se sepa a
  qué unidad va el vehículo, para que no siga figurando en una unidad que ya lo devolvió.
- H4: Como usuario de Transportes quiero registrar el motivo y el documento de referencia (acta,
  memorando) de la asignación, para poder rastrear después de dónde salió esa decisión.
- H5: Como usuario del sistema quiero ver el listado de asignaciones filtrado por unidad y por si
  son actuales o históricas, para saber con qué vehículos cuenta hoy cada unidad.
- H6: Como usuario del sistema quiero ver en la ficha de un vehículo su unidad actual y todo su
  historial de asignaciones, para entender por dónde pasó y desde cuándo está donde está.
- H7: Como usuario del sistema quiero ver cuántos vehículos tiene asignados una unidad, para
  dimensionar su parque sin contar a mano.

## Requisitos funcionales (criterios de aceptación en EARS)

### Registro de la asignación

- RF-1: CUANDO un usuario ADMINISTRADOR o TRANSPORTES registra una asignación indicando vehículo,
  unidad y fecha de inicio, EL SISTEMA la crea como asignación vigente, con el motivo, el documento
  de referencia y las observaciones opcionales.
- RF-2: SI el registro no incluye vehículo, unidad o fecha de inicio, ENTONCES EL SISTEMA rechaza
  la operación y señala el campo faltante.
- RF-3: CUANDO se registra una asignación para un vehículo que ya tiene una asignación vigente, EL
  SISTEMA cierra automáticamente la anterior con fecha de fin igual a la fecha de inicio de la
  nueva, de modo que un vehículo nunca tenga dos asignaciones vigentes a la vez.
- RF-4: SI la fecha de inicio de la nueva asignación es anterior a la fecha de inicio de la
  asignación vigente, ENTONCES EL SISTEMA rechaza la operación: el historial se construye hacia
  adelante, no intercalando periodos hacia atrás.
- RF-5: SI la fecha de inicio de una asignación es posterior a la fecha actual, ENTONCES EL SISTEMA
  rechaza la operación: «vigente» significa vigente hoy, no a futuro.
- RF-6: SI el vehículo está inactivo (dado de baja según el spec 001) o la unidad está inactiva
  (spec 002), ENTONCES EL SISTEMA rechaza la asignación e indica el motivo.
- RF-7: SI el vehículo ya tiene una asignación vigente a esa misma unidad, ENTONCES EL SISTEMA
  rechaza la operación e indica desde qué fecha está asignado ahí, en vez de crear un periodo nuevo
  idéntico al anterior.

### Cierre y corrección

- RF-8: CUANDO un usuario ADMINISTRADOR o TRANSPORTES cierra la asignación vigente de un vehículo
  indicando una fecha de fin, EL SISTEMA la cierra y el vehículo pasa a mostrarse sin unidad, sin
  exigir una unidad de destino.
- RF-9: SI la fecha de fin informada es anterior a la fecha de inicio de esa asignación, o es
  posterior a la fecha actual, ENTONCES EL SISTEMA rechaza la operación.
- RF-10: CUANDO un usuario ADMINISTRADOR o TRANSPORTES corrige una asignación vigente, EL SISTEMA
  permite modificar únicamente el motivo, el documento de referencia y las observaciones; el
  vehículo, la unidad y las fechas no se editan.
- RF-11: EL SISTEMA no permite editar ni borrar una asignación ya cerrada: corregir un periodo
  histórico mal cargado no se hace modificándolo, y queda fuera del alcance de este módulo.

### Consulta

- RF-12: CUANDO un usuario autenticado consulta el listado de asignaciones, EL SISTEMA lo muestra
  paginado con vehículo, unidad, fecha de inicio, fecha de fin, motivo, documento de referencia y
  estado (Actual o Histórica), y permite filtrarlo por unidad, estado, rango de fechas y texto
  libre (placa, nombre de la unidad, documento de referencia).
- RF-13: CUANDO un usuario autenticado abre la ficha de un vehículo, EL SISTEMA muestra su unidad
  actual y su historial de asignaciones ordenado de más reciente a más antiguo, completando el
  RF-10 del spec 001.
- RF-14: MIENTRAS un vehículo no tenga ninguna asignación vigente, EL SISTEMA lo muestra como «Sin
  unidad asignada» en listado y ficha, sin bloquear ninguna otra operación sobre él.
- RF-15: CUANDO un usuario autenticado consulta el listado o la ficha de unidades, EL SISTEMA
  muestra cuántos vehículos tiene cada unidad asignados vigentes, completando el listado definido
  en el spec 002.

### Reglas de cruce con otros módulos

- RF-16: CUANDO la condición vigente de un vehículo pasa a «Dado de baja» (spec 001, RF-7), EL
  SISTEMA cierra su asignación vigente con fecha de fin igual a la fecha de esa baja: un vehículo
  fuera del parque activo no puede seguir figurando como parte del parque de una unidad.
- RF-17: SI se intenta dar de baja una unidad que tiene vehículos con asignación vigente, ENTONCES
  EL SISTEMA rechaza la operación e indica cuántos vehículos hay que reasignar primero. *(Es la
  resolución propuesta para la primera duda abierta del spec 002; confirmar antes de implementar.)*

### Permisos

- RF-18: SI un usuario sin rol ADMINISTRADOR ni TRANSPORTES intenta registrar una asignación,
  cerrarla o corregir sus datos, ENTONCES EL SISTEMA rechaza la operación por falta de permiso.

## Requisitos no funcionales

- Toda la interfaz, los mensajes de validación y los de error están en español de Bolivia. Los
  textos se dirigen al usuario de forma impersonal o de usted; no se usa voseo.
- Las fechas se muestran en formato boliviano `dd/mm/aaaa`, y con nombres de mes y día en español
  cuando se muestran en formato largo. Este módulo no maneja importes.
- La unidad actual de un vehículo nunca se guarda como un campo mutable del vehículo: siempre se
  deriva de la asignación sin fecha de fin, para que no puedan desincronizarse.
- Que exista a lo sumo una asignación vigente por vehículo lo garantiza el esquema con un índice
  único parcial, no sólo la validación de la aplicación.
- El historial de asignaciones es inmutable una vez cerrado un periodo: ninguna operación de la
  aplicación lo edita ni lo borra.
- El listado de vehículos del spec 001 filtra por unidad actual y muestra esa unidad en cada fila:
  debe resolverse sin una consulta por fila.
- El módulo registra el resultado de una decisión institucional. La interfaz debe decirlo de forma
  visible, como en el prototipo, para que nadie espere encontrar aquí un flujo de solicitud o
  aprobación.

## Casos límite

- Una asignación cuya fecha de inicio coincide con la fecha de fin de la anterior es lo normal, no
  un solapamiento: es el día del acta de entrega, que cuenta para quien entrega y para quien
  recibe.
- Un vehículo que va de la unidad A a la B y después vuelve a la A genera tres periodos distintos
  en el historial; el tercero es válido y no es un duplicado del primero.
- Reasignar un vehículo a la unidad en la que ya está vigente se rechaza (RF-7): a diferencia de la
  designación de un encargado, aquí no hay renovación periódica, así que repetir la unidad es un
  error de carga.
- Una asignación de un solo día (fecha de inicio igual a fecha de fin) es válida: un préstamo
  puntual documentado.
- Un vehículo «Sin evaluar» —sin ninguna entrada en su historial de condición, spec 001 RF-13—
  puede asignarse igual a una unidad: no tener condición registrada no lo inhabilita. *(Es la
  resolución propuesta para la cuarta duda abierta del spec 001.)*
- Una unidad dada de baja conserva su historial de asignaciones y sigue apareciendo en el historial
  de cada vehículo que pasó por ella; lo que no admite es asignaciones nuevas.
- Buscar con el campo de texto vacío debe devolver el listado completo (paginado), no un error ni
  una lista vacía.
- Registrar una asignación con fecha de inicio muy antigua (carga inicial del histórico) debe
  permitirse mientras respete el RF-4: el sistema arranca con años de historia en papel.

## Fuera de alcance

- Solicitudes, autorizaciones y trámites administrativos previos a la asignación: el sistema
  registra el resultado, no el trámite.
- Asignación de conductores a vehículos: módulo aparte, con su propio historial.
- Corrección de periodos históricos ya cerrados: si hace falta, se resolverá en un módulo de
  correcciones con auditoría, no aquí.
- Archivos adjuntos del acta o memorando de asignación: sólo se guarda el número o referencia del
  documento como texto.
- Reserva o disponibilidad de vehículos por fecha, y planificación de asignaciones futuras.
- Traslados masivos (reasignar de golpe todos los vehículos de una unidad a otra).
- Notificaciones al encargado de transportes de la unidad que recibe o entrega el vehículo.
- Kilometraje, recorridos, combustible y mantenimiento asociados al periodo de asignación.
- Reportes y exportación del historial de asignaciones: el prototipo lo lista como reporte, y los
  reportes son un módulo aparte.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (SQL tentativo / interfaz) | Inglés (esquema y código) |
| --- | --- |
| `asignacion_unidad` | `UnitAssignment` / tabla `unit_assignment` |
| `id_vehiculo` | `vehicleId` |
| `id_unidad` | `unitId` |
| `fecha_inicio`, `fecha_fin` | `startDate`, `endDate` |
| `motivo` | `reason` |
| `documento_referencia` | `referenceDocument` |
| `observaciones` | `notes` |
| `creado_en` | `createdAt` |

Etiquetas de interfaz: «Asignación de unidad», «Unidad actual», «Actual», «Histórica», «Sin unidad
asignada», «Motivo», «Documento / referencia».

## Criterios de finalización

- Los 18 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual del flujo principal: asignar un vehículo a una unidad → verlo como «Actual» en el
  listado de asignaciones y como unidad actual en la ficha del vehículo y en el listado del spec
  001 → registrar una asignación nueva a otra unidad y comprobar que la anterior quedó cerrada con
  la fecha correcta y aparece como «Histórica» → corregir el motivo de la asignación vigente →
  cerrar la asignación vigente y ver el vehículo como «Sin unidad asignada» → comprobar que el
  contador de vehículos de cada unidad cuadra.
- Un usuario sin rol ADMINISTRADOR/TRANSPORTES puede listar asignaciones y ver el historial de
  cualquier vehículo, pero recibe un error claro al intentar registrar, cerrar o corregir una
  asignación.

## Dudas abiertas

- [NECESITA ACLARACIÓN] La tabla tentativa `asignacion_unidad` no guarda qué usuario registró la
  asignación, a diferencia del historial de condición del vehículo. ¿Hace falta guardarlo (quién y
  cuándo la cargó en el sistema), o basta con el documento de referencia?
- [NECESITA ACLARACIÓN] Cuando un vehículo cambia de unidad, ¿su conductor asignado debe cerrarse
  automáticamente, o el conductor puede acompañar al vehículo a la unidad nueva?
- [NECESITA ACLARACIÓN] ¿Existe el caso real de un vehículo compartido por dos unidades al mismo
  tiempo? La base tentativa lo impide (una sola asignación vigente por vehículo) y este spec
  también; conviene confirmarlo antes de implementar.
- [NECESITA ACLARACIÓN] Para la carga inicial del histórico en papel, ¿se van a registrar los
  periodos antiguos uno por uno respetando el orden (RF-4), o hace falta un camino de importación
  distinto que permita cargar periodos cerrados directamente?
