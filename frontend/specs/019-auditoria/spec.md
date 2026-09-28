# Spec 019 — Auditoría

> La maqueta (`prototipo/index.html:3828-4160` y el modal `auditoriaDetalleModal`,
> `prototipo/index.html:9387-9530`) muestra una pantalla de Auditoría de sólo consulta: cuatro
> indicadores, cuatro filtros (búsqueda, módulo, acción, fecha), una tabla de siete columnas
> (fecha/hora, usuario, acción, módulo, entidad, descripción, detalle) y una ficha por evento. El
> modelo `AuditLog` ya existe en el esquema desde la migración inicial —con `action`, `entity`,
> `entityId`, `before`/`after` (Json), `ipAddress`, `userAgent`, `createdAt`, `userId` y tres
> índices (`[entity, entityId]`, `[userId]`, `[createdAt]`)— pero **ningún código lo escribe ni lo
> lee**: hoy la pantalla `/auditoria` es un `app-notice` de «módulo en construcción». Cuatro specs
> anteriores aplazaron explícitamente este módulo a uno transversal aparte: spec 002 («Auditoría de
> quién cambió qué en una unidad»), spec 004 («Registro de auditoría (`AuditLog`) de las operaciones
> sobre usuarios u otros módulos»), spec 013 («Registro en `AuditLog` de inicios/cierres de sesión»)
> y spec 015 («Auditoría de cambios de rol o de alcance»). Este spec es ese módulo.
>
> La decisión de diseño central: la captura es **un interceptor global de NestJS**, no una llamada
> explícita en cada servicio. El sistema tiene 47 mutations en 16 resolvers con una forma muy
> uniforme (`@Mutation(() => Entidad)` devolviendo la entidad afectada con su `id`), así que un
> único interceptor deriva acción, entidad, identificador y etiqueta de forma mecánica y cubre las
> 47 sin excepción — nada que olvidar al agregar la mutation 48. El precio es que no hay estado
> previo (`before` queda nulo): un interceptor corre *después* de la escritura y no puede leer lo
> que había antes sin una consulta extra por operación. Se aceptó ese precio porque la maqueta no
> muestra un diff campo por campo en ninguna parte; su columna «Detalle del evento» es una frase,
> no una comparación.

## Contexto y objetivo

Dar trazabilidad a las operaciones de escritura del sistema: quién hizo qué, sobre qué registro y
cuándo, consultable y filtrable por el ADMINISTRADOR. Es un módulo transversal: no agrega
operaciones de negocio, observa las que ya existen.

El objetivo no es reconstruir el valor exacto de cada campo antes y después (eso queda fuera de
alcance, ver más abajo), sino responder con certeza «quién tocó este vehículo el martes» y «qué hizo
este usuario en el sistema», que es lo que un control patrimonial policial necesita y lo que la
maqueta plantea.

## Usuarios / actores

| Rol | Acceso a Auditoría |
| --- | --- |
| `ADMINISTRADOR` | Consulta completa: todos los eventos, todos los módulos, todos los usuarios |
| Los otros 6 roles | Sin acceso — ni pantalla ni query |

La restricción a ADMINISTRADOR ya existe hoy en `app.routes.ts` (`roleGuard(['ADMINISTRADOR'])`,
igual que Usuarios) y este spec la refuerza en el backend: la auditoría revela la actividad de
terceros, así que no basta ocultar el menú.

Todos los roles **generan** eventos de auditoría al operar; ninguno excepto ADMINISTRADOR los lee.

## Historias de usuario

- Como ADMINISTRADOR, quiero ver qué operaciones se hicieron en el sistema y por quién, para poder
  responder ante una observación de la Contraloría o un reclamo interno sin depender de la memoria
  de nadie.
- Como ADMINISTRADOR, quiero filtrar los eventos por módulo, acción y fecha, para llegar al evento
  concreto sin recorrer miles de filas.
- Como ADMINISTRADOR, quiero saber desde qué IP se hizo una operación, para distinguir un uso
  legítimo de uno hecho desde un equipo que no corresponde.
- Como ADMINISTRADOR, quiero que la auditoría sea de sólo consulta, para que nadie —ni yo— pueda
  editar o borrar el rastro desde la interfaz.

## Requisitos funcionales (criterios de aceptación en EARS)

**Captura (interceptor global)**

- RF-1: CUANDO cualquier mutation GraphQL termina **con éxito**, EL SISTEMA registra una fila en
  `AuditLog` con la acción, la entidad, su identificador, su etiqueta legible, el módulo, el usuario
  actor, la IP, el user-agent y la fecha/hora. La captura es un único interceptor global
  (`APP_INTERCEPTOR`), no una llamada por servicio.
- RF-2: EL SISTEMA deriva la acción del nombre de la mutation: prefijo `create`/`assign`/`register`
  → `CREATE`; `update`/`close`/`finish` → `UPDATE`; `deactivate`/`reactivate` → `STATUS_CHANGE`;
  `delete`/`remove` → `DELETE`; `login` → `LOGIN`.
- RF-3: EL SISTEMA deriva la entidad del tipo de retorno GraphQL de la mutation (`Vehicle`, `User`,
  `SparePart`…). CUANDO el tipo de retorno es `Boolean` o una lista (`[ProcedureChecklistItem]`), EL
  SISTEMA usa la entidad padre a la que la operación está acotada.
- RF-4: EL SISTEMA toma el `entityId` del `id` del resultado. CUANDO el resultado no tiene `id`
  (retornos `Boolean`) o es una lista, EL SISTEMA lo toma del argumento identificador de la mutation
  (`id`, `vehicleId`, `fuelRecordId`…).
- RF-5: EL SISTEMA guarda una etiqueta legible del registro afectado, tomada del identificador de
  negocio propio de la entidad (`Vehicle.plate`, `Unit.code`, `User.username`, `SparePart.code`,
  `MaintenanceOrder.code`, `Incident.code`, `ProcedureType.name`, `VehicleDocument.documentNumber`,
  `Personnel` → nombre y apellido). La etiqueta se guarda **en el momento del evento**, no se
  resuelve al leer: el rastro debe seguir mostrando cómo se llamaba el registro entonces, y sobrevivir
  a que se lo renombre o se lo borre (`entityId` no tiene clave foránea).
- RF-6: EL SISTEMA deriva el módulo de la entidad afectada, según la tabla de la sección
  «Nomenclatura». El módulo no se almacena como columna propia: es una proyección de `entity`.
- RF-7: EL SISTEMA toma el usuario actor de `req.user` (puesto por `JwtStrategy`), y la IP y el
  user-agent de la petición HTTP.
- RF-8: CUANDO EL SISTEMA guarda el payload de la operación en `after`, EL SISTEMA excluye los
  campos sensibles `password`, `passwordHash`, `accessToken`, `token`, `secret` y `dataUrl`. Los
  primeros son credenciales; `dataUrl` es la foto del vehículo en base64, que duplicaría cada
  imagen dentro de `audit_log`. El campo excluido se reemplaza por una marca, no se omite en
  silencio, para que el rastro muestre que el campo venía en la operación.
- RF-9: CUANDO un usuario inicia sesión con éxito, EL SISTEMA registra un evento `LOGIN` tomando el
  usuario del resultado de la mutation (`AuthPayload.user`), porque `login` es `@Public()` y no tiene
  `req.user` todavía.
- RF-10: CUANDO una mutation falla (validación, permiso denegado, error de base de datos), EL SISTEMA
  **no** registra evento: la auditoría refleja lo que ocurrió, no lo que se intentó.
- RF-11: CUANDO el registro de auditoría falla, EL SISTEMA deja constancia en el log del servidor y
  **no** propaga el error al cliente. La operación de negocio ya se confirmó cuando el interceptor
  escribe; fallar en ese punto le diría al usuario que su operación no se hizo cuando sí se hizo.
- RF-12: EL SISTEMA no expone ninguna mutation de auditoría. Las filas de `AuditLog` sólo las escribe
  el interceptor; no se pueden crear, editar ni borrar desde la API.

**Consulta**

- RF-13: CUANDO un ADMINISTRADOR consulta la auditoría, EL SISTEMA devuelve los eventos paginados
  (`skip`/`take`, igual que el resto de los listados) ordenados por fecha/hora descendente.
- RF-14: CUANDO un ADMINISTRADOR filtra la auditoría, EL SISTEMA acepta combinar búsqueda de texto
  (usuario, entidad o etiqueta), módulo, acción y un día concreto.
- RF-15: CUANDO un usuario sin rol ADMINISTRADOR consulta la auditoría por llamada GraphQL directa,
  EL SISTEMA rechaza la operación (`RolesGuard`/`@Roles`), no sólo le oculta el menú.
- RF-16: CUANDO un ADMINISTRADOR abre la pantalla, EL SISTEMA muestra cuatro indicadores: eventos
  registrados en total, eventos de hoy, registros creados y registros modificados (los cuatro de la
  maqueta).
- RF-17: CUANDO el usuario que generó un evento fue eliminado, EL SISTEMA sigue mostrando el evento
  con su usuario como «usuario eliminado» (`onDelete: SetNull` ya está en el esquema): borrar una
  cuenta no debe borrar su rastro.

**Pantalla**

- RF-18: La pantalla `/auditoria` reemplaza el `app-notice` de «en construcción» por la tabla real,
  con las siete columnas de la maqueta: fecha/hora, usuario, acción, módulo, entidad, descripción y
  el botón de detalle.
- RF-19: CUANDO un ADMINISTRADOR abre el detalle de un evento, EL SISTEMA muestra su ficha en una
  ventana (`app-modal`, como el resto de las fichas de detalle) con fecha y hora, usuario, módulo,
  acción, entidad/referencia, descripción y el payload registrado.
- RF-20: EL SISTEMA muestra en la pantalla la advertencia de que los registros son de sólo consulta
  y no pueden modificarse ni eliminarse desde la interfaz (`toolbar-note` de la maqueta).
- RF-21: EL SISTEMA compone la descripción del evento al leer, a partir de la acción, la entidad y su
  etiqueta (p. ej. «Modificación de Vehículo 6417-PBT»). No se almacena una columna de descripción:
  es una proyección de datos que ya están en la fila.

## Requisitos no funcionales

- El interceptor agrega **una** sentencia `INSERT` por mutation exitosa, sin consultas extra: no
  resuelve etiquetas de entidades relacionadas ni lee el estado previo. El costo por operación debe
  quedar acotado a esa inserción.
- El registro de auditoría no debe alargar la respuesta al cliente más de lo que tarda esa
  inserción; nunca debe bloquear ni reintentar.
- La consulta debe apoyarse en los índices que ya existen (`[createdAt]` para el orden por defecto,
  `[userId]` y `[entity, entityId]` para los filtros).
- Los 21 RF con al menos un test automatizado en verde (`bun run verify` limpio en `backend` y en
  `frontend`).

## Casos límite

- Mutation que devuelve `Boolean` (`removeVehiclePhoto`, `deleteProcedureType`): sin `id` en el
  resultado, el identificador sale de los argumentos (RF-4).
- Mutation que devuelve una lista (los cuatro `update*Checklist`): el evento se registra contra la
  entidad padre a la que el checklist pertenece, no contra cada ítem (RF-3).
- Entidad sin identificador de negocio propio (`Trip`, `FuelRecord`, `StockMovement`, las tres
  tablas de asignación): la etiqueta queda nula y la interfaz muestra el tipo de entidad con el
  identificador abreviado.
- `login` fallido: no genera evento (RF-10); tampoco existe valor en el enum para representarlo.
- Usuario eliminado: el evento sobrevive con `userId` nulo (RF-17).
- Operación hecha antes de que existiera este módulo: no hay eventos retroactivos; la auditoría
  empieza a registrar desde su despliegue, y la pantalla vacía debe decirlo en vez de parecer un
  error.
- Payload con un campo sensible: se marca como excluido, no se omite (RF-8).

## Fuera de alcance

- **Estado previo y diff campo por campo** (`before`): decisión explícita, no un olvido. Requeriría
  una lectura extra por operación y tocar los ~16 servicios uno por uno, con el riesgo de dejar
  mutations sin instrumentar; la maqueta no muestra un diff en ninguna pantalla. La columna
  `before` queda en el esquema para cuando se quiera, y se puede llenar por módulo sin rehacer el
  interceptor.
- **Cierre de sesión** (`LOGOUT`, valor existente en el enum): la sesión es un JWT sin estado en el
  servidor y no hay mutation de logout que interceptar. Aplazado desde el spec 013, sigue aplazado
  por la misma razón.
- **`APPROVE` / `REJECT`** (valores existentes en el enum): corresponden al flujo de aprobación de
  `VehicleRequest`, que el spec 006 dejó fuera de alcance (los recorridos crean la solicitud ya
  aprobada). Quedan sin usar hasta que exista ese flujo.
- **Intentos fallidos y accesos denegados**: no se registran (RF-10) ni hay valor en el enum para
  ellos. Un registro de seguridad de intentos fallidos de login es otro módulo.
- **Auditoría de lecturas**: sólo se registran escrituras. Registrar quién consultó qué multiplicaría
  el volumen de la tabla por cada navegación.
- **Política de retención o purga** de `audit_log`: la tabla crece indefinidamente y este spec no
  define archivado, borrado por antigüedad ni exportación para resguardo.
- **Exportar la auditoría a PDF/Excel**: igual que en los specs 001, 002, 003, 007 y 018.
- **Firma o encadenado criptográfico** de los eventos para probar que nadie los alteró en la base de
  datos directamente. La inmutabilidad de este spec es a nivel de API (RF-12), no a nivel de motor.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Auditoría | `AuditLog` / query `auditLogs` |
| Acción | `AuditAction` |
| Creación | `CREATE` |
| Modificación | `UPDATE` |
| Cambio de estado | `STATUS_CHANGE` (valor nuevo de este spec) |
| Eliminación | `DELETE` |
| Acceso | `LOGIN` |
| Módulo | derivado de `entity` (sin columna propia) |
| Entidad / referencia | `entity` + `entityLabel` |
| Descripción | compuesta al leer desde acción + entidad + etiqueta |
| Detalle del evento | `after` (saneado) |
| Usuario | `user` (`userId`, nulo si la cuenta fue eliminada) |

Mapeo entidad → módulo: `Vehicle`, `VehicleCondition`, `VehiclePhoto` → Vehículos · `Unit`,
`TransportManagerAssignment` → Unidades · `UnitAssignment` → Asignaciones · `Personnel`,
`VehicleDriverAssignment` → Conductores · `Trip`, `OdometerReading` → Recorridos · `FuelRecord` →
Combustible · `MaintenanceOrder` → Mantenimiento · `SparePart`, `StockMovement` → Inventario ·
`VehicleDocument` → Documentación · `Incident` → Incidentes · `User` → Usuarios · `ProcedureType`,
`ProcedureChecklistItem` → Trámites · `AuthPayload` → Sesión.

Etiquetas de interfaz: «Auditoría», «Eventos registrados», «Eventos de hoy», «Registros creados»,
«Registros modificados», «Todos los módulos», «Todas las acciones», «Detalle de auditoría».

## Criterios de finalización

- Los 21 RF tienen al menos un test automatizado en verde, y `bun run verify` queda limpio en
  `backend` y en `frontend`.
- Migración aplicada que agrega `STATUS_CHANGE` al enum `AuditAction` y la columna de etiqueta a
  `audit_log`.
- Demo manual: crear un vehículo, editarlo, dar de baja un usuario y volver a entrar al sistema →
  los cuatro eventos aparecen en `/auditoria` con la acción correcta (`CREATE`, `UPDATE`,
  `STATUS_CHANGE`, `LOGIN`), el usuario correcto y la etiqueta del registro afectado.
- Un usuario no ADMINISTRADOR no llega a la pantalla ni obtiene datos llamando la query directamente.
- Ninguna mutation existente cambia de firma ni de comportamiento por haber agregado la auditoría, y
  una que falle sigue fallando igual, sin dejar evento.

## Dudas abiertas

- [NECESITA ACLARACIÓN] ¿Existe un plazo legal de conservación de los registros de auditoría (por
  ejemplo, exigido por la Contraloría) que obligue a definir archivado o purga? Este spec deja la
  retención fuera de alcance y la tabla crece sin límite.
- [NECESITA ACLARACIÓN] ¿La auditoría debe registrar también los intentos fallidos de inicio de
  sesión y las operaciones rechazadas por permisos, como registro de seguridad? Hoy RF-10 dice
  explícitamente que no, y el enum no tiene valores para representarlos.
- [NECESITA ACLARACIÓN] ¿El ADMINISTRADOR debe poder ver la auditoría de las operaciones de otros
  ADMINISTRADORES, incluidas las suyas? Este spec asume que sí, sin distinción.
