# Spec 016 — Trámites administrativos por proceso

> Módulo nuevo: a diferencia de los demás specs, su modelo **no** existe todavía en
> `schema.prisma` ni formó parte del árbol de modelos sembrado desde la migración inicial.
> Introduce `ProcedureType` (catálogo de tipos de trámite) y `ProcedureChecklistItem` (checklist
> guardado junto con cada registro). Nace de un pedido directo del usuario sobre trazabilidad de
> papeleo administrativo (solicitudes, aprobaciones, vistos buenos) y de documentación de vehículo
> que no se digitaliza (SOAT, seguro), no de un RF numerado de la propuesta de desarrollo; ver
> «Dudas abiertas» sobre si corresponde asignarle uno. No reemplaza ni depende de `VehicleDocument`
> (spec 010): ese modelo es el expediente documental de un vehículo con fecha de vencimiento; este
> módulo es un checklist de trámites internos asociado al momento de registrar una acción del
> sistema, sin vencimiento.

## Contexto y objetivo

Varios procesos del Área de Transportes exigen cierto papeleo antes de darse por completos: una
solicitud escrita, una aprobación, el visto bueno de un funcionario; algunos procesos requieren
tres trámites o más. También hay documentación de un vehículo (SOAT, seguro) de la que sólo
interesa dejar constancia de que existe, sin subir un escaneo. Hoy el sistema no registra nada de
esto: cada acción (registrar un vehículo, dar un vale de combustible, entregar una refacción,
abrir una orden de mantenimiento) se guarda sin ninguna referencia a su papeleo asociado. Esta
funcionalidad entrega un catálogo configurable de tipos de trámite asociados a una acción del
sistema, y un checklist —con casilla de marcado y código físico de ubicación— que se completa en
el mismo formulario donde se registra esa acción.

## Usuarios / actores

- **ADMINISTRADOR** y **TRANSPORTES**: crean, editan y desactivan tipos de trámite del catálogo.
- **TRANSPORTES** (spec 001), **COMBUSTIBLE** (spec 007), **ALMACÉN** (spec 009) y
  **MANTENIMIENTO** (spec 008), además de ADMINISTRADOR y TRANSPORTES de forma transversal: ven y
  completan el checklist de trámites al registrar la acción que ya tienen permiso de registrar. No
  se agrega ningún permiso nuevo para esto (RF-14).
- Cualquier usuario autenticado: consulta el catálogo de tipos de trámite y el checklist de
  cualquier registro, en modo sólo lectura.

## Historias de usuario

- H1: Como ADMINISTRADOR quiero crear un tipo de trámite con nombre, descripción y la acción del
  sistema a la que se asocia (registrar vehículo, vale de combustible, entrega de refacciones u
  orden de mantenimiento), para definir qué papeleo exige cada proceso.
- H2: Como ADMINISTRADOR quiero editar el nombre y la descripción de un tipo de trámite, o
  desactivarlo, para corregir su definición o dejar de exigirlo sin perder el historial de los
  casos donde ya se usó.
- H3: Como usuario que registra un vehículo, un vale de combustible, una entrega de refacciones o
  el ingreso de una orden de mantenimiento, quiero ver en el mismo formulario el listado de
  trámites configurados para esa acción, marcar cuáles ya tengo en mano e indicar el código físico
  donde se archiva cada uno, para dejar constancia del papeleo sin escanearlo.
- H4: Como usuario que registra la acción, quiero poder guardar el registro aunque no todos los
  trámites estén marcados, para no bloquear mi trabajo mientras se completa el papeleo.
- H5: Como cualquier usuario quiero ver, en la ficha o el listado de un vehículo, un vale, una
  entrega de refacciones o una orden de mantenimiento, qué trámites quedaron marcados y cuáles
  pendientes, con el código físico de cada uno, para saber dónde ubicar el documento.
- H6: Como cualquier usuario quiero listar el catálogo de tipos de trámite filtrando por acción y
  por estado, para saber qué papeleo aplica a cada proceso.

## Requisitos funcionales (criterios de aceptación en EARS)

### Catálogo de tipos de trámite

- RF-1: CUANDO un usuario ADMINISTRADOR o TRANSPORTES crea un tipo de trámite indicando nombre y
  acción del sistema, EL SISTEMA lo crea activo, con descripción opcional.
- RF-2: SI el nombre o la acción faltan, ENTONCES EL SISTEMA rechaza la operación y señala el
  campo faltante.
- RF-3: La acción de un tipo de trámite es una de: Registrar vehículo, Vale de combustible,
  Entrega de refacciones, Orden de mantenimiento (asociada a su registro de ingreso, spec 008
  RF-1).
- RF-4: CUANDO un usuario ADMINISTRADOR o TRANSPORTES edita un tipo de trámite, EL SISTEMA permite
  cambiar su nombre y su descripción, pero no la acción asociada, fija desde su creación para no
  invalidar los checklists ya registrados con esa definición.
- RF-5: CUANDO un usuario ADMINISTRADOR o TRANSPORTES desactiva un tipo de trámite, EL SISTEMA
  deja de mostrarlo en el checklist de nuevos registros de esa acción, sin alterar los ítems ya
  guardados en checklists anteriores; puede reactivarlo.
- RF-6: SI el nombre de un tipo de trámite ya pertenece a otro tipo de la misma acción, ENTONCES
  EL SISTEMA rechaza el registro o la edición e indica el duplicado.

### Checklist al registrar cada acción

- RF-7: CUANDO un usuario registra una de las cuatro acciones, EL SISTEMA muestra en el mismo
  formulario el listado de tipos de trámite activos asociados a esa acción, cada uno con una
  casilla para marcarlo y un campo de texto opcional para su código de ubicación física.
- RF-8: CUANDO se guarda el registro de la acción, EL SISTEMA guarda junto con él un ítem de
  checklist por cada tipo de trámite mostrado, con su estado (marcado o no) y el código físico
  indicado, aunque no todos estén marcados.
- RF-9: SI una acción no tiene ningún tipo de trámite activo configurado, ENTONCES EL SISTEMA no
  muestra la sección de checklist y registra la acción normalmente, sin ítems.
- RF-10: El checklist nunca bloquea el registro de la acción: se guarda con cualquier combinación
  de ítems marcados o sin marcar, incluyendo ninguno.

### Consulta

- RF-11: CUANDO cualquier usuario consulta el listado o la ficha de un vehículo, un vale de
  combustible, una entrega de refacciones o una orden de mantenimiento, EL SISTEMA muestra sus
  ítems de checklist de trámites con su nombre, si está marcado y su código físico.
- RF-12: CUANDO cualquier usuario consulta el catálogo de tipos de trámite, EL SISTEMA lo muestra
  paginado con nombre, descripción, acción y estado, y permite filtrarlo por acción, por estado y
  por texto libre (nombre).

### Permisos

- RF-13: SI un usuario sin rol ADMINISTRADOR o TRANSPORTES intenta crear, editar o desactivar un
  tipo de trámite, ENTONCES EL SISTEMA rechaza la operación por falta de permiso. La consulta del
  catálogo queda abierta a cualquier rol.
- RF-14: Marcar ítems del checklist al registrar una acción sigue el mismo permiso que ya exige
  esa acción (spec 001 para vehículos, spec 007 para combustible, spec 009 para refacciones, spec
  008 para mantenimiento): no se agrega un permiso nuevo para esto.

## Requisitos no funcionales

- Toda la interfaz y los mensajes de validación están en español de Bolivia, de forma impersonal.
- El control de acceso viaja por el header simulado `x-user-role` (`RolesGuard`), igual que en el
  resto de módulos.
- El registro de la acción y la escritura de sus ítems de checklist ocurren en una sola
  transacción de Prisma: no puede quedar un vehículo (o vale, entrega, orden) guardado sin sus
  ítems de checklist correspondientes, ni al revés.

## Casos límite

- Un tipo de trámite desactivado sigue apareciendo en los checklists ya guardados de casos
  anteriores: los ítems ya creados no dependen de que el tipo siga activo.
- Cambiar la acción de un tipo de trámite no está permitido (RF-4): si el mismo trámite hace falta
  para otra acción, se crea un tipo nuevo.
- Marcar un ítem sin indicar código físico es válido: el código es siempre opcional, incluso si el
  ítem está marcado.
- Indicar un código físico sin marcar el ítem como completado es válido (por ejemplo, para anotar
  dónde quedará archivado antes de tenerlo en mano).
- Dos tipos de trámite con el mismo nombre en acciones distintas son válidos: la unicidad de
  nombre (RF-6) es por acción, no global.
- Buscar el catálogo con el campo de texto vacío devuelve el listado completo paginado.

## Fuera de alcance

- Editar o completar ítems del checklist después de guardado el registro de la acción: en esta
  primera versión el checklist sólo se llena en el momento del alta (ver «Dudas abiertas»).
- Adjuntar o escanear el archivo digital del trámite: igual que en Documentación (spec 010), este
  módulo sólo registra que el trámite existe y dónde ubicarlo físicamente, no lo almacena.
- Bloquear el registro de una acción por trámites incompletos: decisión explícita de este spec
  (H4); si se necesita exigirlo, es un cambio de alcance futuro.
- Asociar tipos de trámite a acciones fuera de las cuatro listadas (por ejemplo, incidentes,
  asignaciones, documentación vehicular): puede agregarse extendiendo `ProcedureAction` cuando se
  pida.
- Alertas de trámites pendientes: no genera entradas en `Alert`.
- «Entregas y recepciones» de documentación vehicular (spec 010, fuera de alcance de aquel spec):
  es un módulo distinto; este no lo reemplaza ni depende de él.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Tipo de trámite | `ProcedureType` |
| Nombre | `name` |
| Descripción | `description` |
| Acción del sistema | `action` (`ProcedureAction`) |
| Activo | `isActive` |
| Ítem de checklist | `ProcedureChecklistItem` |
| Marcado / completado | `completed` |
| Código físico / ubicación | `documentCode` |
| Registrar vehículo | `ProcedureAction.VEHICLE_REGISTRATION` |
| Vale de combustible | `ProcedureAction.FUEL_VOUCHER` |
| Entrega de refacciones | `ProcedureAction.SPARE_PART_DELIVERY` |
| Orden de mantenimiento | `ProcedureAction.MAINTENANCE_ORDER` |

Etiquetas de interfaz: «Trámites», «Tipo de trámite», «Nuevo tipo de trámite», «Acción», «Trámites
de este registro», «Código físico».

## Criterios de finalización

- Los 14 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: crear tipos de trámite para las cuatro acciones → registrar un vehículo y ver el
  checklist con esos tipos → marcar algunos con código físico y dejar otros sin marcar → guardar y
  ver el vehículo creado con su checklist visible en la ficha → repetir para un vale de
  combustible, una entrega de refacciones y una orden de mantenimiento → desactivar un tipo de
  trámite y confirmar que ya no aparece en un registro nuevo pero sigue visible en los anteriores.
- Un usuario sin rol ADMINISTRADOR/TRANSPORTES recibe un error claro al intentar crear, editar o
  desactivar un tipo de trámite; puede seguir consultando el catálogo.

## Dudas abiertas

- [NECESITA ACLARACIÓN] ¿Hace falta, en una siguiente versión, completar el checklist después del
  alta (por ejemplo cuando el visto bueno llega días después) desde una pantalla o pestaña aparte
  en la ficha del registro? Este spec lo deja fuera de alcance porque la decisión tomada fue
  mostrarlo sólo en el formulario de alta, pero el propio caso de uso descrito (trámites que
  llegan después) sugiere que puede hacer falta pronto.
- [NECESITA ACLARACIÓN] ¿Debe poder eliminarse (no sólo desactivarse) un tipo de trámite que
  todavía no tiene ningún ítem de checklist asociado, o siempre se maneja con activar/desactivar
  como el resto de catálogos del sistema?
- [NECESITA ACLARACIÓN] Para «Entrega de refacciones», ¿el checklist se asocia a cada movimiento
  de salida (`StockMovement` tipo `OUT`) individual, o a la orden de mantenimiento que la origina
  cuando aplica? Se asume aquí que es por movimiento de salida, igual que las otras tres acciones
  se asocian a su propio registro.
- [NECESITA ACLARACIÓN] ¿Corresponde este módulo a algún RF numerado de la propuesta de
  desarrollo original, o queda como funcionalidad adicional sin numerar?
