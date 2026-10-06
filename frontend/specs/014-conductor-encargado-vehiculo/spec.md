# Spec 014 — Conductor encargado de vehículo y rol CONDUCTOR

> Continúa los specs 002 (encargados de transportes de unidad), 003 (asignación de vehículos a
> unidades) y 005 (conductores). Introduce el dato de dominio que ninguno de esos tres cubre: quién
> es el conductor a cargo de cada vehículo. Hoy la pestaña «Conductores» de la ficha vehicular se
> deriva de quién registró recorridos (`Trip.assignment.driverId`), que es un historial de uso, no
> una designación. Este spec agrega la designación, y con ella el primer rol operativo real
> (`CONDUCTOR`) acotado a un único vehículo.

## Contexto y objetivo

El Área de Transportes necesita saber, para cada vehículo, quién responde por él: quién lo tiene a
cargo hoy y quién lo tuvo antes. Es el mismo problema que el spec 002 resolvió para «¿quién es el
encargado de esta unidad?», aplicado un nivel más abajo: «¿quién es el conductor de este vehículo?».
Se resuelve con el mismo patrón — historial con fecha de inicio y fin, una fila vigente por vehículo
— para no inventar un mecanismo nuevo donde ya existe uno probado.

Además, esa designación deja de ser sólo informativa: el conductor designado recibe (opcionalmente)
una cuenta de sistema con el nuevo rol `CONDUCTOR`, que sólo puede operar sobre el vehículo del que
es encargado vigente. Es el primer rol del sistema cuyo permiso de escritura depende de un dato
(la designación vigente), no sólo del código de rol.

## Usuarios / actores

- **ADMINISTRADOR**: designa y cierra encargos de vehículo en cualquier unidad.
- **TRANSPORTES**: acotado a su unidad (spec 015): designa y cierra encargos sólo de vehículos de las
  unidades donde es encargado de transportes vigente, y sólo entre conductores de esas unidades.
- **CONDUCTOR**: sin acceso a este módulo; consume el resultado desde «Mi vehículo» (más abajo).
- Cualquier otro usuario autenticado consulta el encargado vigente y el historial en modo lectura.

## Historias de usuario

- H1: Como TRANSPORTES quiero designar al conductor encargado de un vehículo de mi unidad, para saber
  quién responde por él sin tener que revisar el historial de recorridos.
- H2: Como TRANSPORTES quiero que al designar un conductor nuevo el encargo anterior de ese vehículo
  quede cerrado automáticamente, para que el vehículo nunca tenga dos encargados vigentes.
- H3: Como TRANSPORTES quiero que el sistema impida designar a un conductor que ya está a cargo de
  otro vehículo, para que quede claro de cuál responde.
- H4: Como TRANSPORTES quiero cerrar el encargo vigente de un vehículo sin designar reemplazo de
  inmediato, para reflejar que quedó sin conductor fijo.
- H5: Como ADMINISTRADOR o TRANSPORTES quiero crear una cuenta de acceso para el conductor al
  designarlo (o después), para que pueda registrar kilometraje y combustible de su vehículo.
- H6: Como CONDUCTOR quiero entrar al sistema y ver sólo el vehículo del que soy encargado, con su
  kilometraje actual, para registrar mi actividad sin ver el resto del parque.
- H7: Como CONDUCTOR quiero registrar el kilometraje actual de mi vehículo y una carga de combustible,
  para dejar constancia de su uso.
- H8: Como usuario del sistema quiero ver, en la ficha del vehículo, quién es su conductor encargado
  y el historial de quienes lo fueron antes.

## Requisitos funcionales (criterios de aceptación en EARS)

### Designación de conductor encargado

- RF-1: CUANDO un usuario ADMINISTRADOR o TRANSPORTES designa al conductor encargado de un vehículo
  indicando vehículo, conductor y fecha de inicio, EL SISTEMA registra la designación como vigente,
  con documento de referencia y observaciones opcionales.
- RF-2: SI el vehículo o el conductor están inactivos, ENTONCES EL SISTEMA rechaza la designación.
- RF-3: SI la persona indicada no tiene marcado el rol de conductor (`isDriver`) o le faltan datos de
  licencia, ENTONCES EL SISTEMA rechaza la designación indicando que debe habilitarse como conductor
  primero (spec 005) — a diferencia del encargado de transportes de unidad (spec 002, RF-18), aquí el
  rol no se enciende automáticamente porque exige datos (licencia) que esta operación no recoge.
- RF-4: CUANDO se registra una designación sobre un vehículo que ya tiene conductor encargado vigente,
  EL SISTEMA cierra automáticamente la designación anterior con fecha de fin igual a la fecha de
  inicio de la nueva.
- RF-5: SI el conductor indicado ya es encargado vigente de otro vehículo, ENTONCES EL SISTEMA rechaza
  la designación: un conductor está a cargo de un solo vehículo a la vez.
- RF-6: SI la fecha de inicio es posterior a hoy, o anterior a la fecha de inicio del encargo vigente
  del vehículo, ENTONCES EL SISTEMA rechaza la operación (mismas reglas que spec 002 RF-20/RF-21).
- RF-7: CUANDO un usuario ADMINISTRADOR o TRANSPORTES cierra el encargo vigente de un vehículo
  indicando una fecha de fin, EL SISTEMA lo cierra y el vehículo pasa a mostrarse sin conductor
  encargado, sin exigir reemplazo.
- RF-8: SI la fecha de fin es anterior a la fecha de inicio del encargo, o posterior a hoy, ENTONCES EL
  SISTEMA rechaza la operación.
- RF-9: SI un usuario TRANSPORTES intenta designar o cerrar un encargo sobre un vehículo que no
  pertenece a ninguna de sus unidades (spec 015), ENTONCES EL SISTEMA rechaza la operación por falta
  de permiso, igual que si no tuviera rol de escritura.

### Consulta

- RF-10: CUANDO cualquier usuario autenticado abre la ficha de un vehículo, EL SISTEMA muestra su
  conductor encargado vigente y el historial de encargos ordenado de más reciente a más antiguo.
- RF-11: MIENTRAS un vehículo no tenga ningún encargo vigente, EL SISTEMA lo muestra como «Sin
  conductor asignado», sin bloquear ninguna otra operación sobre él.

### Cuenta de acceso del conductor

- RF-12: CUANDO un usuario ADMINISTRADOR o TRANSPORTES crea una cuenta de acceso para una ficha de
  personal marcando el rol `CONDUCTOR`, EL SISTEMA vincula la cuenta a esa ficha (`Personnel.userId`)
  sin exigir que ya tenga un vehículo a cargo: la cuenta puede crearse antes de la primera designación.
- RF-13: SI un usuario con rol `CONDUCTOR` intenta registrar kilometraje, una carga de combustible o
  una salida/llegada de un vehículo del que no es encargado vigente, ENTONCES EL SISTEMA rechaza la
  operación, sin importar que el vehículo exista y esté activo.
- RF-14: SI un usuario con rol `CONDUCTOR` no tiene ningún vehículo a cargo vigente, ENTONCES EL
  SISTEMA le impide registrar kilometraje, combustible o recorridos, indicando que debe solicitar su
  asignación al encargado de su unidad.
- RF-15: CUANDO un usuario con rol `CONDUCTOR` consulta «Mi vehículo», EL SISTEMA le muestra el
  vehículo del que es encargado vigente (placa, unidad, kilometraje actual, encargado de transportes
  de esa unidad) o el estado «Sin vehículo asignado» si no tiene ninguno.

> La pantalla de RF-15 creció después: si el vehículo tiene un recorrido abierto, aparece arriba
> como llegada pendiente y se cierra desde ahí, y la salida también se registra sin salir de la
> pantalla. Eso se especifica en el spec 006 (RF-12), que es el dueño del ciclo del recorrido; acá
> sólo se consume.

### Kilometraje suelto

- RF-16: CUANDO un usuario ADMINISTRADOR, TRANSPORTES o CONDUCTOR registra una lectura de kilometraje
  indicando vehículo y valor, EL SISTEMA la guarda con origen `MANUAL` y la fecha actual.
- RF-17: SI el valor indicado es menor al de la última lectura registrada para ese vehículo (de
  cualquier origen: recorrido, combustible, mantenimiento o manual), ENTONCES EL SISTEMA rechaza la
  operación.

## Requisitos no funcionales

- Mismo idioma, tono y formato de fecha que el resto del sistema (español boliviano, `dd/mm/aaaa`,
  sin voseo).
- La unicidad «un conductor, un vehículo a la vez» en ambos sentidos se garantiza con dos índices
  únicos parciales (`WHERE end_date IS NULL`), uno por `vehicle_id` y otro por `driver_id`, no sólo
  con validación en la aplicación — mismo principio que spec 002 (RNF, unicidad de encargado por
  unidad).
- El conductor encargado vigente de un vehículo nunca se guarda como campo mutable de `Vehicle`:
  siempre se deriva de la designación sin fecha de fin.
- El alcance por unidad del rol `TRANSPORTES` (RF-9) es el mismo mecanismo que introduce el spec 015;
  este spec sólo lo consume para las mutaciones de encargo de vehículo.

## Casos límite

- Designar dos veces consecutivas al mismo conductor en el mismo vehículo (renovación) se permite: es
  un periodo nuevo que cierra al anterior, igual que en spec 002.
- Un vehículo dado de baja (`VehicleCondition.code = BAJA`) cierra su encargo de conductor vigente con
  la fecha del cambio de condición, igual que ya hace con `UnitAssignment` (spec 001, gancho inverso).
- Dar de baja a una ficha de personal que es conductor encargado vigente de un vehículo se rechaza,
  igual que el spec 002 lo rechaza para encargados de unidad: primero hay que cerrar el encargo.
- Un vehículo recién creado no tiene conductor encargado y debe poder operarse igual desde el resto
  del sistema (recorridos, combustible con conductor indicado a mano) hasta que se le designe uno.
- Un conductor sin cuenta de sistema es un estado válido: la designación y la cuenta son
  independientes (RF-12).

## Fuera de alcance

- Historial de cambios de unidad del conductor: sigue siendo el campo simple `Personnel.unitId`
  (spec 005, fuera de alcance).
- Turnos o encargos compartidos de un mismo vehículo entre varios conductores a la vez: se decidió
  explícitamente que es uno a la vez en ambos sentidos.
- Aprobación o flujo de solicitud para que un conductor pida un vehículo: la designación la hace
  siempre ADMINISTRADOR o TRANSPORTES.
- Notificaciones al conductor cuando se le asigna o retira un vehículo.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Conductor encargado | `VehicleDriverAssignment` / tabla `vehicle_driver_assignment` |
| Vehículo a cargo | `Personnel.currentVehicle` (resuelto, no columna) |
| Fecha de inicio, fecha de fin | `startDate`, `endDate` |
| Documento de referencia | `referenceDocument` |
| Observaciones | `notes` |
| Mi vehículo | pantalla `/mi-vehiculo`, rol `CONDUCTOR` |
| Lectura de kilometraje | `OdometerReading` (existente), origen `MANUAL` |

Etiquetas de interfaz: «Conductor encargado», «Sin conductor asignado», «Vigente», «Histórico», «Mi
vehículo», «Registrar kilometraje».

## Criterios de finalización

- Los 17 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: designar un conductor encargado de un vehículo → verlo vigente en la ficha del
  vehículo → intentar designarlo también a otro vehículo y ver el rechazo → designar un conductor
  nuevo en el primer vehículo y comprobar que el anterior queda cerrado con la fecha correcta →
  cerrar el encargo vigente y ver el vehículo «Sin conductor asignado» → crear una cuenta `CONDUCTOR`
  para ese conductor, entrar con ella, ver «Mi vehículo» y registrar una lectura de kilometraje y una
  carga de combustible → verificar que esa cuenta no puede registrar nada sobre otro vehículo.

## Dudas abiertas

- [NECESITA ACLARACIÓN] Cuando se cierra el encargo de un conductor (RF-7) sin designar reemplazo,
  ¿su cuenta `CONDUCTOR` queda simplemente sin vehículo (como asume RF-14), o debe darse de baja la
  cuenta también? Se asume que no: la cuenta y el vehículo son independientes.
- [NECESITA ACLARACIÓN] ¿El registro de kilometraje suelto (RF-16/RF-17) debe actualizar también el
  nivel de combustible, o queda fuera de este dato? Se asume que no: sólo kilometraje, igual que el
  modelo `OdometerReading` ya existente.
