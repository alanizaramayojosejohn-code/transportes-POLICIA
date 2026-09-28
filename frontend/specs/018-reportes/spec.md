# Spec 018 — Reportes

> La maqueta (`prototipo/index.html:3167-3401`, `prototipo/js/app.js:19376+`) muestra una sola
> pantalla de Reportes con 9 tarjetas de listados filtrables más una décima («Historial integral
> del vehículo») que las consolida, igual para cualquier usuario. El sistema real ya tiene 7 roles
> con dominios separados (`ADMINISTRADOR, TRANSPORTES, COMBUSTIBLE, MANTENIMIENTO, ALMACEN,
> CONSULTA, CONDUCTOR`) y ese reparto por dominio ya existe en el menú (`shell.component.ts`,
> `ROLE_EXCLUDED_PATHS`) y en el alcance por unidad de TRANSPORTES (spec 015, `unitScopeFor`). Este
> spec no agrega modelos nuevos: 8 de los 9 listados reutilizan queries ya paginadas y filtrables
> que existen hoy (`vehicles`, `unitAssignments`, `trips`, `fuelRecords`, `maintenanceOrders`,
> `spareParts`, `incidents`, `personnel`); sólo agrega la query de movimientos de almacén que no
> existía como listado propio (`stockMovements`) y la query nueva de este spec, el historial
> integral por vehículo (`vehicleHistory`), que sí necesita lógica propia porque junta siete fuentes
> distintas en una sola línea de tiempo — mismo patrón que `ReportsService.driverLogbook` (spec de
> Combustible), pero con más tipos de evento.

## Contexto y objetivo

El menú «Reportes» (`/reportes`) existe hoy como placeholder (`ReportsComponent`, «Este módulo está
en construcción»). Las specs 001, 002, 003 y 007 excluyeron explícitamente sus reportes propios
porque «los reportes son un módulo aparte». Este spec es ese módulo: define qué reporte ve cada rol
y construye el único reporte que no es un listado ya existente con otro nombre — el historial
completo de un vehículo — con paginación y filtros.

## Usuarios / actores

Los 7 roles del sistema (`Role.code`, `backend/prisma/seed.ts`). Cada uno ve sólo las tarjetas de
reporte de su dominio, replicando la separación que ya existe en el sidebar:

| Reporte | ADMINISTRADOR | CONSULTA | TRANSPORTES | COMBUSTIBLE | MANTENIMIENTO | ALMACEN | CONDUCTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vehículos por unidad | ✅ | ✅ | ✅ (su unidad) | — | — | — | — |
| Historial de asignaciones | ✅ | ✅ | ✅ (su unidad) | — | — | — | — |
| Historial de recorridos | ✅ | ✅ | ✅ (su unidad) | ✅ | — | — | — |
| Consumo de combustible | ✅ | ✅ | ✅ (su unidad) | ✅ | — | — | — |
| Mantenimientos | ✅ | ✅ | ✅ (su unidad) | — | ✅ | — | — |
| Kardex / Inventario | ✅ | ✅ | — | — | ✅ | ✅ | — |
| Movimientos de almacén | ✅ | ✅ | — | — | ✅ | ✅ | — |
| Incidentes vehiculares | ✅ | ✅ | ✅ (su unidad) | — | — | — | — |
| Conductores | ✅ | ✅ | ✅ (su unidad) | — | — | — | — |
| Historial integral del vehículo | ✅ (cualquiera) | ✅ (cualquiera) | ✅ (su unidad) | — | — | — | ✅ (sólo el suyo) |

## Historias de usuario

- H1: Como ADMINISTRADOR, CONSULTA o TRANSPORTES quiero elegir un vehículo y ver todo su historial
  (unidades, conductores, recorridos, combustible, mantenimientos, incidentes, movimientos de
  almacén relacionados) en una sola línea de tiempo paginada, para investigar o rendir cuentas sobre
  ese vehículo sin entrar módulo por módulo.
- H2: Como ese mismo usuario quiero filtrar esa línea de tiempo por tipo de evento y por rango de
  fechas, para no revisar cientos de filas cuando busco algo específico.
- H3: Como CONDUCTOR quiero ver el historial del vehículo del que estoy a cargo, acotado a lo que
  ocurrió desde que quedé a cargo, para tener mi propia bitácora sin ver lo que pasó con ese
  vehículo antes de mí ni con otros vehículos.
- H4: Como cualquier rol con acceso a un dominio (Combustible, Mantenimiento, Almacén) quiero
  consultar el listado de mi dominio con los mismos filtros que ya uso en su módulo, para no
  aprender una pantalla nueva sólo para «ver el reporte».
- H5: Como ADMINISTRADOR o CONSULTA quiero ver los 9 reportes de listado sin restricción, para
  tener visión completa del sistema.

## Requisitos funcionales (criterios de aceptación en EARS)

**Acceso y menú**

- RF-1: CUANDO un usuario abre `/reportes`, EL SISTEMA muestra únicamente las tarjetas de reporte
  permitidas para su rol, según la tabla de la sección «Usuarios / actores». Un CONDUCTOR no ve el
  menú «Reportes» en el sidebar (igual que hoy, `CONDUCTOR_NAV`); su único reporte (RF-11 a RF-15)
  vive dentro de «Mi vehículo».
- RF-2: CUANDO un usuario intenta consultar, por URL directa o llamada GraphQL, un reporte fuera de
  los permitidos para su rol, EL SISTEMA rechaza la operación (`RolesGuard`/`@Roles` por query,
  mismo mecanismo que `InventoryResolver` y `VehicleDriverAssignmentsResolver`), no sólo lo oculta
  en el menú.

**Reportes de listado (reutilizan queries existentes)**

- RF-3: CUANDO ADMINISTRADOR, CONSULTA o TRANSPORTES generan «Vehículos por unidad», EL SISTEMA
  agrupa los vehículos activos por su unidad vigente (`vehicles`, filtrable por `unitId`), acotado
  a las unidades del alcance del usuario cuando aplica (spec 015, `unitScopeFor`).
- RF-4: CUANDO ADMINISTRADOR, CONSULTA o TRANSPORTES generan «Historial de asignaciones», EL SISTEMA
  lista `unitAssignments` (paginado, ya filtrable por vehículo y rango de fechas), acotado por
  unidad para TRANSPORTES.
- RF-5: CUANDO ADMINISTRADOR, CONSULTA, TRANSPORTES o COMBUSTIBLE generan «Historial de
  recorridos», EL SISTEMA lista `trips` (paginado, filtrable por vehículo y rango de fechas), acotado
  por unidad para TRANSPORTES.
- RF-6: CUANDO ADMINISTRADOR, CONSULTA, TRANSPORTES o COMBUSTIBLE generan «Consumo de combustible»,
  EL SISTEMA lista `fuelRecords` (paginado, filtrable por vehículo y rango de fechas), acotado por
  unidad para TRANSPORTES.
- RF-7: CUANDO ADMINISTRADOR, CONSULTA, TRANSPORTES o MANTENIMIENTO generan «Mantenimientos», EL
  SISTEMA lista `maintenanceOrders` (paginado, filtrable por vehículo y rango de fechas), acotado
  por unidad para TRANSPORTES.
- RF-8: CUANDO ADMINISTRADOR, CONSULTA, MANTENIMIENTO o ALMACEN generan «Kardex / Inventario», EL
  SISTEMA lista `spareParts` (paginado, con existencia actual y stock mínimo).
- RF-9: CUANDO ADMINISTRADOR, CONSULTA, MANTENIMIENTO o ALMACEN generan «Movimientos de almacén», EL
  SISTEMA lista los `StockMovement` (entradas, salidas, ajustes), paginado y filtrable por artículo,
  vehículo destino, tipo de movimiento y rango de fechas. Esta query (`stockMovements`) no existe
  hoy como listado propio — `InventoryResolver` sólo expone `spareParts`/`sparePart` — y se agrega
  en este spec siguiendo el mismo patrón de `SparePartFilterArgs` (skip/take, filtros opcionales).
- RF-10: CUANDO ADMINISTRADOR, CONSULTA o TRANSPORTES generan «Incidentes vehiculares», EL SISTEMA
  lista `incidents` (paginado, filtrable por vehículo y rango de fechas), acotado por unidad para
  TRANSPORTES.
- RF-11: CUANDO ADMINISTRADOR, CONSULTA o TRANSPORTES generan «Conductores», EL SISTEMA lista
  `personnel` filtrado a `isDriver = true` (paginado), acotado por unidad para TRANSPORTES.

**Historial integral del vehículo (`vehicleHistory`, reporte nuevo)**

- RF-12: CUANDO ADMINISTRADOR o CONSULTA generan el historial integral, EL SISTEMA permite elegir
  cualquier vehículo activo o inactivo del sistema.
- RF-13: CUANDO TRANSPORTES genera el historial integral, EL SISTEMA sólo permite elegir vehículos
  con asignación vigente a alguna unidad de su alcance (`unitScopeFor`); si elige uno fuera de su
  alcance, la operación se rechaza igual que en el resto de los módulos acotados por unidad.
- RF-14: CUANDO cualquiera de los tres roles anteriores genera el historial integral de un vehículo,
  EL SISTEMA devuelve, en una sola línea de tiempo ordenada por fecha descendente y paginada
  (`skip`/`take`, mismos valores por defecto que el resto del sistema: 0/20), los eventos de ese
  vehículo de estos siete tipos: cambios de unidad (`UnitAssignment`), cambios de conductor a cargo
  (`VehicleDriverAssignment`), recorridos (`Trip`), cargas de combustible (`FuelRecord`), órdenes de
  mantenimiento (`MaintenanceOrder`), incidentes (`Incident`) y salidas de almacén con ese vehículo
  como destino (`StockMovement` con `vehicleId` igual al del vehículo consultado).
- RF-15: CUANDO se genera el historial integral, EL SISTEMA permite filtrar por tipo de evento (uno
  o varios de los siete de RF-14) y por rango de fechas, ambos opcionales; sin filtro de tipo se
  muestran los siete.
- RF-16: CUANDO CONDUCTOR abre su historial integral (dentro de «Mi vehículo»), EL SISTEMA:
  a) usa como vehículo el que resulta de su `VehicleDriverAssignment` vigente
     (`getCurrentForDriver`, mismo dato que ya resuelve `myVehicleAssignment`) — no expone selector
     de vehículo;
  b) sólo incluye eventos con fecha igual o posterior a la `startDate` de ese encargo vigente,
     nunca lo ocurrido con el vehículo antes de que este conductor quedara a cargo;
  c) si el conductor no tiene ningún vehículo a cargo vigente, muestra el mismo estado vacío que
     «Mi vehículo» usa hoy para ese caso, no un error.
- RF-17: CUANDO CONDUCTOR combina el filtro de fecha (RF-15) con su propio límite (RF-16b), EL
  SISTEMA usa como fecha mínima efectiva la más tardía entre las dos (intersección, nunca una
  pisando a la otra): no puede ver eventos anteriores a que quedó a cargo aunque pida un rango de
  fechas que empiece antes.

## Requisitos no funcionales

- Toda la interfaz está en español de Bolivia.
- Los 10 reportes son de sólo lectura: ninguno expone mutaciones.
- El acceso por rol se aplica en el resolver (`@Roles`/`RolesGuard`), no sólo ocultando la tarjeta
  en el frontend — mismo criterio que el resto del sistema (RF-2).
- Todos los listados son paginados con los mismos valores por defecto que ya usa el resto del
  sistema (`skip` 0, `take` 20, salvo `vehicleHistory` que usa `take` 20 también aunque mezcle
  fuentes, igual que `driverLogbook` usa 50).
- El alcance por unidad de TRANSPORTES se resuelve siempre con `unitScopeFor`, nunca con un chequeo
  de rol aislado (spec 015).

## Casos límite

- Un vehículo sin ningún evento en el rango filtrado devuelve una lista vacía, no un error (mismo
  criterio que el resto de los listados del sistema).
- TRANSPORTES sin ninguna unidad a su cargo (`managedUnitIds` vacío): los reportes acotados por
  unidad devuelven vacío, no todos los datos ni un error.
- `skip` mayor al total de resultados: lista vacía, no error (estándar ya usado en el resto de los
  listados paginados).
- CONDUCTOR cuyo encargo vigente empezó hoy: su historial integral puede estar vacío si el vehículo
  no tuvo eventos posteriores a esa fecha, aun si el vehículo tiene años de historial previo.
- Un `StockMovement` de tipo entrada (`IN`), que no tiene `vehicleId`, nunca aparece en el historial
  integral de ningún vehículo (RF-14 sólo incluye salidas con destino a ese vehículo).

## Fuera de alcance

- Exportar cualquier reporte a PDF/Excel (igual que specs 001, 002, 003, 007): los botones
  «Generar reporte» de la maqueta sólo consultan y muestran en pantalla.
- Gráficas o indicadores agregados: eso es el Panel principal (spec 012), no este módulo.
- Un reporte combinado de «últimos registros» multi-módulo distinto del historial integral por
  vehículo (spec 012 ya descartó esa tabla para el Dashboard).
- Historial integral por conductor (equivalente a `vehicleHistory` pero centrado en una persona en
  vez de un vehículo): no lo pide este spec.
- Cualquier variante acotada de «Historial integral del vehículo» para COMBUSTIBLE, MANTENIMIENTO o
  ALMACEN: esos roles no tienen acceso a este reporte, ni completo ni filtrado por tipo de evento
  (decisión explícita, no un olvido); si necesitan revisar el historial de un vehículo, usan el
  reporte de listado de su propio dominio (RF-6/RF-7/RF-9).

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Vehículos por unidad | `vehicles` (agrupado por `unitId`) |
| Historial de asignaciones | `unitAssignments` |
| Historial de recorridos | `trips` |
| Consumo de combustible | `fuelRecords` |
| Mantenimientos | `maintenanceOrders` |
| Kardex / Inventario | `spareParts` |
| Movimientos de almacén | `stockMovements` (query nueva) |
| Incidentes vehiculares | `incidents` |
| Conductores | `personnel` (`isDriver: true`) |
| Historial integral del vehículo | `vehicleHistory` (query nueva) |
| Tipo de evento del historial integral | `VehicleHistoryEntryType`: `UNIT_ASSIGNMENT`, `DRIVER_ASSIGNMENT`, `TRIP`, `FUEL`, `MAINTENANCE`, `INCIDENT`, `STOCK_MOVEMENT` |

Etiquetas de interfaz: «Reportes», «Generar reporte», «Historial integral del vehículo», «Filtros
del reporte», «Tipo de evento», «Desde», «Hasta».

## Criterios de finalización

- Los 17 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: con datos de prueba en los siete módulos fuente, verificar que cada rol ve
  exactamente las tarjetas de su fila en la tabla de acceso, que `vehicleHistory` devuelve los
  eventos esperados ordenados y paginados para ADMINISTRADOR/CONSULTA/TRANSPORTES, y que un usuario
  CONDUCTOR sólo ve, en su propio historial, eventos posteriores a su fecha de encargo vigente.
