# Spec 011 — Incidentes

> Alineado con `schema.prisma`: `Incident` (RF-09) ya existe desde la migración inicial.
> `registeredById` se resuelve con `resolveActingUserId` (spec 006). `code` es un correlativo que
> genera el sistema (`INC-<timestamp>-<sufijo>`), mismo patrón que Recorridos y Mantenimiento. Este
> spec agrega `SEPARADO_POR_INCIDENTE` a `VehicleConditionCode`: el comentario del esquema (spec
> 001) ya anticipaba exactamente este momento — «al no existir hoy en el enum, este módulo no puede
> escribirlo aunque quisiera» — así que el «Estado posterior» de la maqueta se resuelve registrando
> una entrada en el historial de condición del vehículo (`VehiclesService.registerCondition`,
> reutilizado tal cual, no reimplementado) en vez de ser un campo cosmético sin efecto.

## Contexto y objetivo

La propuesta de desarrollo (RF-09, «Incidentes y accidentes») pide registrar hechos relacionados
con un vehículo (accidentes, averías, robos, infracciones) con su lugar, descripción y el
conductor/unidad vigente en la fecha del evento, para tener trazabilidad. Hoy no existe ninguna
pantalla para esto. Esta funcionalidad entrega el registro y la consulta de incidentes; cuando el
incidente cambia el estado físico del vehículo, ese cambio queda enlazado al historial de condición
que ya usa el módulo de vehículos (spec 001), no como un dato aislado.

## Usuarios / actores

- **ADMINISTRADOR** y **TRANSPORTES**: pueden registrar incidentes.
- Cualquier otro rol puede consultar el listado en modo sólo lectura.

## Historias de usuario

- H1: Como TRANSPORTES quiero registrar un incidente de un vehículo con su tipo, lugar, fecha y
  descripción, para dejar constancia del hecho.
- H2: Como TRANSPORTES quiero indicar el estado del vehículo después del incidente, para que quede
  reflejado en su historial de condición sin tener que registrarlo dos veces.
- H3: Como cualquier usuario quiero listar y buscar incidentes por vehículo, conductor o lugar, y
  filtrar por tipo, para dar seguimiento a los hechos registrados.

## Requisitos funcionales (criterios de aceptación en EARS)

### Registro

- RF-1: CUANDO un usuario ADMINISTRADOR o TRANSPORTES registra un incidente indicando vehículo,
  tipo, fecha/hora, lugar y descripción, EL SISTEMA lo crea con gravedad «leve» por defecto, con
  conductor, daños, número de referencia y estado posterior del vehículo opcionales.
- RF-2: SI el vehículo, el tipo, la fecha/hora, el lugar o la descripción faltan, ENTONCES EL
  SISTEMA rechaza la operación y señala el campo faltante.
- RF-3: SI el vehículo indicado no existe, ENTONCES EL SISTEMA rechaza la operación.
- RF-4: CUANDO el registro incluye un estado posterior del vehículo, EL SISTEMA agrega una entrada
  al historial de condición del vehículo con ese estado, además de crear el incidente.

### Consulta

- RF-5: CUANDO cualquier usuario consulta el listado de incidentes, EL SISTEMA lo muestra paginado
  con fecha, vehículo, conductor, tipo, lugar y referencia, y permite filtrarlo por vehículo, por
  tipo y por texto libre (placa, conductor, lugar).

### Permisos

- RF-6: SI un usuario sin rol ADMINISTRADOR o TRANSPORTES intenta registrar un incidente, ENTONCES
  EL SISTEMA rechaza la operación por falta de permiso. La consulta queda abierta a cualquier rol.

## Requisitos no funcionales

- Toda la interfaz y los mensajes de validación están en español de Bolivia, de forma impersonal.
- El control de acceso viaja por el header simulado `x-user-role`; el autor real del registro se
  resuelve con `resolveActingUserId` (spec 006).
- La gravedad (`IncidentSeverity`) no es un campo del formulario en este spec: todo incidente se
  crea como «leve» (`MINOR`); ajustarla queda para cuando se pida explícitamente.

## Casos límite

- Un incidente sin estado posterior indicado no toca el historial de condición del vehículo (RF-4
  es condicional, no obligatorio).
- Un vehículo puede tener varios incidentes; no hay límite ni restricción de unicidad.
- Buscar con el campo de texto vacío devuelve el listado completo paginado.

## Fuera de alcance

- Procesos disciplinarios derivados de un incidente: este módulo registra el hecho, no los
  administra (igual que el spec de Asignaciones aclara para las suyas).
- Personas involucradas ajenas al padrón (`peopleInvolved`, JSON) y adjuntos (`IncidentAttachment`,
  carga de archivos): el esquema los contempla pero este spec no expone esos campos en el
  formulario.
- Costo estimado (`estimatedCost`) y enlace con un recorrido (`tripId`): existen en el esquema pero
  no se piden en la maqueta ni en este spec.
- Selector de gravedad (`IncidentSeverity`) en el formulario: se crea siempre como `MINOR` (ver
  RNF); cambiarla requiere edición, que tampoco existe en este spec.
- Edición o eliminación de un incidente ya registrado.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Vehículo | `vehicleId` |
| Conductor | `driverId` |
| Fecha y hora | `occurredAt` |
| Tipo | `type` (`IncidentType`) |
| Lugar | `place` |
| Descripción | `description` |
| Daños | `damages` |
| Documento / referencia | `policeReportNumber` |
| Estado posterior | `VehicleCondition.code` (vía `registerCondition`) |

Etiquetas de interfaz: «Incidentes», «Registrar incidente», «Vehículo», «Conductor», «Tipo»,
«Lugar», «Descripción», «Daños», «Estado posterior».

## Criterios de finalización

- Los 6 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: registrar un incidente con estado posterior «Separado por incidente» → verlo en el
  listado → abrir el vehículo en el módulo de Vehículos y comprobar que el historial de condición
  tiene esa entrada → filtrar el listado de incidentes por vehículo y por tipo.
- Un usuario sin rol ADMINISTRADOR o TRANSPORTES recibe un error claro al intentar registrar un
  incidente; puede seguir consultando el listado.

## Dudas abiertas

- [NECESITA ACLARACIÓN] ¿La gravedad del incidente debe inferirse automáticamente del tipo (por
  ejemplo, «Accidente» → moderada) o siempre requiere que alguien la ajuste a mano cuando se pida
  ese campo?
