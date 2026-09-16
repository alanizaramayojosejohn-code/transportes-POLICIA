# Spec 008 — Mantenimiento

> Alineado con `schema.prisma`: `MaintenanceOrder` (RF-06) ya existe desde la migración inicial.
> `registeredById` se resuelve con `resolveActingUserId` (spec 006). `code` es un correlativo que
> genera el sistema (`MNT-<timestamp>-<sufijo>`), igual que el código de `VehicleRequest` en
> Recorridos: no es un campo del formulario. Este spec no usa `MaintenanceItem` (detalle de
> repuestos usados): esa tabla enlaza opcionalmente con `SparePart`, que no existe como módulo
> todavía (ver spec de Inventario). Por eso el costo se maneja como un solo campo (`totalCost`)
> directo del formulario en vez de sumarse desde ítems; `laborCost` queda en 0, sin pantalla propia,
> hasta que exista el desglose. Tampoco se usa `MaintenancePlan` (próximo servicio por
> kilometraje): no fue pedido y la maqueta no lo pide como parte de este formulario tampoco (queda
> fuera de alcance).

## Contexto y objetivo

La propuesta de desarrollo (RF-06, «Mantenimiento preventivo y correctivo») pide registrar cada
orden de mantenimiento con su vehículo, taller, diagnóstico/trabajo realizado y costo, para llevar
el historial de servicios de cada vehículo. Hoy no existe ninguna pantalla para esto. Esta
funcionalidad entrega el registro de órdenes de mantenimiento con un ciclo de dos pasos —
registrar ingreso y registrar finalización — igual que ya lo hace Recorridos (spec 006) para
salida/llegada.

## Usuarios / actores

- **ADMINISTRADOR**, **TRANSPORTES** y **MANTENIMIENTO**: pueden registrar y finalizar órdenes de
  mantenimiento.
- Cualquier otro rol puede consultar el listado en modo sólo lectura.

## Historias de usuario

- H1: Como MANTENIMIENTO quiero registrar el ingreso de un vehículo al taller con tipo, taller,
  kilometraje y diagnóstico, para dejar constancia de que está en mantenimiento.
- H2: Como MANTENIMIENTO quiero registrar la finalización de una orden en proceso con el trabajo
  realizado y el costo total, para cerrar el ciclo.
- H3: Como cualquier usuario quiero listar y buscar órdenes de mantenimiento por vehículo o taller,
  y filtrar por tipo y por estado, para dar seguimiento al gasto y a los vehículos en taller.

## Requisitos funcionales (criterios de aceptación en EARS)

### Registro de ingreso

- RF-1: CUANDO un usuario ADMINISTRADOR, TRANSPORTES o MANTENIMIENTO registra el ingreso de un
  vehículo a mantenimiento indicando vehículo, tipo (preventivo o correctivo), kilometraje de
  ingreso y descripción, EL SISTEMA crea la orden en estado «en proceso», con taller y número de
  factura opcionales.
- RF-2: SI el vehículo, el tipo, el kilometraje o la descripción faltan, ENTONCES EL SISTEMA
  rechaza la operación y señala el campo faltante.
- RF-3: SI el vehículo indicado no existe, ENTONCES EL SISTEMA rechaza la operación.

### Finalización

- RF-4: CUANDO un usuario ADMINISTRADOR, TRANSPORTES o MANTENIMIENTO finaliza una orden en
  proceso indicando el costo total, EL SISTEMA la marca «finalizada» con la fecha de finalización
  (por defecto la actual).
- RF-5: SI la orden ya estaba finalizada o cancelada, ENTONCES EL SISTEMA rechaza una nueva
  finalización.

### Consulta

- RF-6: CUANDO cualquier usuario consulta el listado de órdenes de mantenimiento, EL SISTEMA lo
  muestra paginado con fecha de ingreso, vehículo, tipo, taller, costo total y estado, y permite
  filtrarlo por vehículo, por tipo, por estado y por texto libre (placa, taller).

### Permisos

- RF-7: SI un usuario sin rol ADMINISTRADOR, TRANSPORTES o MANTENIMIENTO intenta registrar o
  finalizar una orden de mantenimiento, ENTONCES EL SISTEMA rechaza la operación por falta de
  permiso. La consulta queda abierta a cualquier rol.

## Requisitos no funcionales

- Toda la interfaz y los mensajes de validación están en español de Bolivia, de forma impersonal.
- Los importes (`laborCost`, `totalCost`) usan `Decimal` en la base, expuestos como `Float` en
  GraphQL (misma decisión que el spec 007, por no tener escalar `Decimal` instalado).
- El control de acceso viaja por el header simulado `x-user-role`; el autor real del registro se
  resuelve con `resolveActingUserId` (spec 006).

## Casos límite

- Una orden recién creada no tiene costo ni fecha de finalización: el listado los muestra como «—»
  hasta que se finalice.
- Buscar con el campo de texto vacío devuelve el listado completo paginado.
- Cancelar una orden no está contemplado en este spec (ver fuera de alcance): una orden abierta
  sólo puede finalizarse, no cancelarse, desde esta interfaz.

## Fuera de alcance

- Detalle de repuestos usados por orden (`MaintenanceItem`) y su enlace con `SparePart`: depende
  del módulo de Inventario, que no existe todavía.
- Plan de mantenimiento preventivo por kilometraje (`MaintenancePlan`) y las alertas de «próximo
  servicio» que de ahí se derivan (`Alert`).
- Transición a estado «cancelada»: el enum `MaintenanceStatus` la contempla pero este spec no
  expone una acción para ella.
- Edición de una orden ya finalizada.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Vehículo | `vehicleId` |
| Tipo | `type` (`MaintenanceType`: preventivo/correctivo) |
| Taller | `workshopName` |
| Kilometraje de ingreso | `odometer` |
| Fecha de ingreso | `startedAt` |
| Fecha de finalización | `finishedAt` |
| Descripción / diagnóstico | `description` |
| Costo total | `totalCost` |
| Número de factura | `invoiceNumber` |
| Estado | `status` (`MaintenanceStatus`) |

Etiquetas de interfaz: «Mantenimiento», «Registrar mantenimiento», «Finalizar», «Vehículo»,
«Tipo», «Taller», «En proceso», «Finalizado».

## Criterios de finalización

- Los 7 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: registrar el ingreso de un vehículo a mantenimiento → verlo «en proceso» en el
  listado → finalizarlo con un costo → verlo «finalizado» → filtrar por vehículo, tipo y estado.
- Un usuario sin rol ADMINISTRADOR, TRANSPORTES o MANTENIMIENTO recibe un error claro al intentar
  registrar o finalizar una orden; puede seguir consultando el listado.

## Dudas abiertas

- [NECESITA ACLARACIÓN] Cuando exista el módulo de Inventario, ¿los repuestos usados en una orden
  de mantenimiento deben descontarse automáticamente del stock, o siempre es un movimiento manual
  aparte?
