# Spec 006 — Recorridos

> Alineado con `schema.prisma`, no con la maqueta tal cual. El esquema modela la salida de un
> vehículo como el cierre de un flujo de tres modelos (RF-03/04/05): `VehicleRequest` (solicitud
> aprobada) → `Assignment` (vehículo + conductor asignados a esa solicitud) → `Trip` (salida y
> retorno). La maqueta (`prototype/`), en cambio, muestra un único formulario «Nuevo recorrido» sin
> paso de solicitud/aprobación visible. Este spec seguía el esquema (fuente de verdad) pero
> simplifica la interfaz: `TripsService.create` genera la `VehicleRequest` y el `Assignment` por
> detrás, ya aprobados, en la misma operación que registra la salida — no hay pantalla de
> solicitudes ni de aprobación porque nadie las pidió todavía. Si en el futuro se pide el flujo de
> solicitud/aprobación como tal, esos registros generados automáticamente son el punto de partida.

## Contexto y objetivo

La propuesta de desarrollo (RF-04/RF-05, «Control de recorridos y kilometraje») pide registrar la
salida y el retorno de cada vehículo: destino, kilometraje, nivel de combustible y estado, para
tener trazabilidad de uso y poder cruzarlo con combustible y mantenimiento. Hoy no existe ninguna
pantalla para esto. Esta funcionalidad entrega el registro de recorridos como un ciclo de dos
pasos — abrir (salida) y cerrar (llegada) — sobre el mismo registro, igual que ya lo hace
`UnitAssignment` (spec 003) para el ciclo de asignación de unidad.

### Usuario autor del registro (bloqueo de infraestructura resuelto en este spec)

`Trip.departureRegisteredById`, `Assignment.assignedById` y `VehicleRequest.requesterId` /
`reviewedById` son todos `User` obligatorios en el esquema: no hay forma de dejarlos vacíos ni de
guardar ahí un string de rol simulado (a diferencia de `VehicleCondition.registeredByRole`, que sí
se modeló como string opcional en el spec 001). Como no existe autenticación real todavía, este
spec resuelve el autor buscando el primer usuario activo cuyo rol coincide con el rol simulado del
header `x-user-role` (`resolveActingUserId`, en `common/acting-user.ts`, reutilizable por los specs
de Combustible, Mantenimiento, Inventario e Incidentes que tienen el mismo problema). Si no existe
ningún usuario activo con ese rol, la operación se rechaza pidiendo crear uno primero en Usuarios.
Para que el sistema funcione desde el primer arranque, `prisma/seed.ts` ahora también siembra un
usuario activo por rol (`admin`, `transportes.admin`, `combustible.01`, `mantenimiento.01`,
`almacen.01`, `consulta.01`, contraseña temporal `Temporal2026`, tomados de la maqueta).

## Usuarios / actores

- **ADMINISTRADOR** y **TRANSPORTES**: pueden registrar la salida y la llegada de un recorrido.
- Cualquier otro rol puede consultar el listado en modo sólo lectura.

## Historias de usuario

- H1: Como TRANSPORTES quiero registrar la salida de un vehículo con conductor, destino,
  kilometraje y nivel de combustible, para dejar constancia de que el vehículo está en la calle.
- H2: Como TRANSPORTES quiero registrar la llegada de un recorrido abierto con kilometraje final,
  nivel de combustible y daños observados, para cerrar el ciclo y calcular la distancia recorrida.
- H3: Como TRANSPORTES quiero que el sistema impida abrir un segundo recorrido para un vehículo que
  ya tiene uno abierto, para no perder el rastro de dónde está.
- H4: Como cualquier usuario quiero listar y buscar recorridos por vehículo, conductor o destino, y
  filtrar por estado (abierto o cerrado), para dar seguimiento al parque en movimiento.

## Requisitos funcionales (criterios de aceptación en EARS)

### Apertura (salida)

- RF-1: CUANDO un usuario ADMINISTRADOR o TRANSPORTES registra la salida de un vehículo indicando
  vehículo, conductor, destino, fecha/hora de salida y kilometraje de salida, EL SISTEMA crea el
  recorrido abierto (sin retorno), con nivel de combustible y observaciones de salida opcionales.
- RF-2: SI el vehículo, el conductor, el destino, la fecha de salida o el kilometraje de salida
  faltan, ENTONCES EL SISTEMA rechaza la operación y señala el campo faltante.
- RF-3: SI el vehículo indicado ya tiene un recorrido abierto (sin retorno registrado), ENTONCES EL
  SISTEMA rechaza la nueva salida indicando que el vehículo sigue en la calle.
- RF-4: SI el vehículo o el conductor indicados no existen o el conductor está inactivo, ENTONCES
  EL SISTEMA rechaza la operación.

### Cierre (llegada)

- RF-5: CUANDO un usuario ADMINISTRADOR o TRANSPORTES registra la llegada de un recorrido abierto
  indicando kilometraje de llegada, EL SISTEMA cierra el recorrido, calcula la distancia recorrida
  (llegada menos salida) y la guarda, con fecha de llegada (por defecto la actual), nivel de
  combustible, daños y observaciones de llegada opcionales.
- RF-6: SI el recorrido ya estaba cerrado, ENTONCES EL SISTEMA rechaza un segundo cierre.
- RF-7: SI el kilometraje de llegada es menor al kilometraje de salida, ENTONCES EL SISTEMA rechaza
  la operación.

### Consulta

- RF-8: CUANDO cualquier usuario consulta el listado de recorridos, EL SISTEMA lo muestra paginado
  con vehículo, conductor, destino, salida, llegada, kilometraje recorrido y estado (abierto o
  cerrado), y permite filtrarlo por vehículo, por estado y por texto libre (placa, conductor,
  destino).

### Permisos

- RF-9: SI un usuario sin rol ADMINISTRADOR o TRANSPORTES intenta registrar una salida o una
  llegada, ENTONCES EL SISTEMA rechaza la operación por falta de permiso. La consulta queda abierta
  a cualquier rol.

## Requisitos no funcionales

- Toda la interfaz y los mensajes de validación están en español de Bolivia, de forma impersonal.
- El control de acceso viaja por el header simulado `x-user-role` (`RolesGuard`); el autor real del
  registro se resuelve con `resolveActingUserId` (ver «Contexto y objetivo»).
- La `VehicleRequest` y el `Assignment` que se generan al abrir un recorrido quedan aprobados y
  activos automáticamente: no hay revisión manual en este spec.

## Casos límite

- Un recorrido recién abierto no tiene kilometraje ni distancia de llegada: el listado los muestra
  como «—» hasta que se cierre.
- Cerrar un recorrido con el mismo kilometraje de salida y llegada es válido (distancia 0): el
  vehículo pudo salir y volver sin desplazamiento registrado en el odómetro.
- Buscar con el campo de texto vacío devuelve el listado completo paginado.
- Dos vehículos distintos pueden tener recorridos abiertos al mismo tiempo; la restricción de RF-3
  es por vehículo, no global.

## Fuera de alcance

- Pantalla de solicitudes de vehículo (`VehicleRequest`) y su flujo de aprobación/rechazo
  (RF-03 tal como lo describe la propuesta de desarrollo): se genera automáticamente y aprobada,
  sin pantalla propia, como se explica arriba.
- Historial de kilometraje (`OdometerReading`) como registro independiente: el kilometraje de
  salida/llegada vive únicamente en el `Trip`, no se replica en `OdometerReading`.
- Cruce automático con combustible (`FuelRecord.tripId`) o incidentes (`Incident.tripId`): esos
  specs, cuando se implementen, pueden enlazar al viaje, pero este spec no lo hace.
- Edición de un recorrido ya cerrado o eliminación de un recorrido.
- Autenticación real: `resolveActingUserId` es un puente temporal, no un reemplazo del login.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Vehículo | `Assignment.vehicleId` (vía `Trip.assignmentId`) |
| Conductor | `Assignment.driverId` |
| Destino | `VehicleRequest.destination` |
| Fecha/hora de salida | `departureAt` |
| Kilometraje de salida | `departureOdometer` |
| Nivel de combustible en salida | `departureFuelLevel` |
| Estado del vehículo en salida | `departureConditionNotes` |
| Fecha/hora de llegada | `returnAt` |
| Kilometraje de llegada | `returnOdometer` |
| Nivel de combustible en llegada | `returnFuelLevel` |
| Estado del vehículo en llegada | `returnConditionNotes` |
| Daños observados | `damagesFound` |
| Observaciones de llegada | `incidentNotes` |
| Distancia recorrida | `distanceKm` |
| Abierto / Cerrado | `returnAt === null` / `returnAt !== null` |

Etiquetas de interfaz: «Recorridos», «Nuevo recorrido», «Registrar llegada», «Vehículo»,
«Conductor», «Destino», «Salida», «Llegada», «KM», «Abierto», «Cerrado».

## Criterios de finalización

- Los 9 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: abrir un recorrido para un vehículo y conductor → verlo como abierto en el listado →
  intentar abrir un segundo recorrido para el mismo vehículo y ver el rechazo → cerrarlo con
  kilometraje de llegada → ver la distancia calculada y el estado cerrado → filtrar por vehículo y
  por estado.
- Un usuario sin rol ADMINISTRADOR o TRANSPORTES recibe un error claro al intentar abrir o cerrar
  un recorrido; puede seguir consultando el listado.

## Dudas abiertas

- [NECESITA ACLARACIÓN] Cuando se pida el spec de Combustible, ¿un abastecimiento durante un
  recorrido abierto debe enlazarse a ese `Trip` (`FuelRecord.tripId`) automáticamente, o queda
  siempre como un registro independiente?
- [NECESITA ACLARACIÓN] ¿Debe poder registrarse una salida con fecha/hora futura (reserva
  anticipada) o siempre debe ser inmediata, como se asume aquí?
