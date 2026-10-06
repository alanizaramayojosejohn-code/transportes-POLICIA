# Spec 018 — Reportes

> **Revisión 2 (2026-10-02).** La revisión 1 convirtió la maqueta
> (`prototipo/index.html:3167-3401`) en un menú de diez tarjetas: nueve listados filtrables más el
> historial integral del vehículo. Ocho de esas tarjetas sólo redirigían a un listado que ya existe
> en su propio módulo (`/vehiculos`, `/asignaciones`, `/recorridos`, `/combustible`,
> `/mantenimiento`, `/inventario`, `/incidentes`, `/conductores`) con los mismos filtros y la misma
> exportación, así que «Reportes» era un segundo menú del sistema, no una pantalla de consulta: dos
> clics para llegar a algo que el sidebar ya abría en uno.
>
> En esta revisión, `/reportes` deja de ser un menú y pasa a ser **una sola pantalla con una
> pestaña por reporte**, con los filtros y el rango de fechas dentro de cada pestaña. Y sólo viven
> acá los reportes **que no existen en ninguna otra pantalla**: el historial integral del vehículo,
> los movimientos de almacén y tres consolidados nuevos (consumo de combustible, costos de
> mantenimiento y kilometraje recorrido) que agregan y totalizan por periodo, algo que ningún
> listado hace. Los ocho listados se consultan y exportan donde siempre: en su módulo.

## Contexto y objetivo

El objetivo de este spec sigue siendo el mismo: que cada rol tenga las consultas consolidadas de su
dominio. Lo que cambia en la revisión 2 es qué cuenta como reporte: no un listado con otro nombre,
sino una consulta que ninguna pantalla del sistema ofrece. De las diez tarjetas originales quedan
dos reportes (historial integral y movimientos de almacén) y se agregan tres consolidados por
periodo, todos con filtros propios y rango de fechas.

## Usuarios / actores

Los 7 roles del sistema (`Role.code`, `backend/prisma/seed.ts`). Cada uno ve sólo las pestañas de su
dominio, replicando la separación que ya existe en el sidebar:

| Reporte (pestaña) | ADMINISTRADOR | CONSULTA | TRANSPORTES | COMBUSTIBLE | MANTENIMIENTO | ALMACEN | CONDUCTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Consumo de combustible | ✅ | ✅ | ✅ (su unidad) | ✅ | — | — | — |
| Costos de mantenimiento | ✅ | ✅ | ✅ (su unidad) | — | ✅ | — | — |
| Kilometraje recorrido | ✅ | ✅ | ✅ (su unidad) | ✅ | — | — | — |
| Movimientos de almacén | ✅ | ✅ | — | — | ✅ | ✅ | — |
| Historial integral del vehículo | ✅ (cualquiera) | ✅ (cualquiera) | ✅ (su unidad) | — | — | — | ✅ (sólo el suyo) |

Los reportes de listado de la revisión 1 (vehículos por unidad, historial de asignaciones, historial
de recorridos, consumo de combustible detallado, mantenimientos, kardex, incidentes y conductores) se
consultan en su propio módulo, con los filtros y la exportación que ya tienen ahí; su acceso por rol
es el del sidebar (`shell.component.ts`, `ROLE_EXCLUDED_PATHS`), no el de esta tabla.

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
- H4: Como ADMINISTRADOR, CONSULTA, TRANSPORTES o COMBUSTIBLE quiero saber cuánto combustible y
  cuánto dinero consumió cada vehículo —o cada unidad— en un rango de fechas, con su rendimiento del
  periodo, para comparar y justificar el gasto sin sumar vale por vale a mano.
- H5: Como ADMINISTRADOR, CONSULTA, TRANSPORTES o MANTENIMIENTO quiero saber cuánto costó el
  mantenimiento de cada vehículo o unidad en un periodo, separando preventivo de correctivo, para
  ver dónde se está gastando y qué vehículo se está volviendo caro de mantener.
- H6: Como ADMINISTRADOR, CONSULTA, TRANSPORTES o COMBUSTIBLE quiero saber cuántas salidas y cuántos
  kilómetros hizo cada vehículo o unidad en un periodo, para medir uso real del parque.
- H7: Como cualquiera de esos roles quiero poder ver los tres consolidados agrupados por unidad y no
  sólo por vehículo, para comparar unidades entre sí sin sumar sus vehículos a mano.
- H8: Como usuario de un módulo (Combustible, Mantenimiento, Almacén, Recorridos…) quiero consultar
  y exportar el listado de mi dominio donde siempre lo hice, sin pasar por «Reportes»: el listado
  filtrable ya es la pantalla del módulo.

## Requisitos funcionales (criterios de aceptación en EARS)

**Acceso y navegación**

- RF-1: CUANDO un usuario abre `/reportes`, EL SISTEMA no muestra un menú de tarjetas: muestra una
  barra de pestañas con los reportes permitidos para su rol (tabla de «Usuarios / actores») y abre
  directamente el primero. Cada pestaña es una ruta hija enlazable
  (`/reportes/combustible`, `/reportes/mantenimiento`, `/reportes/kilometraje`,
  `/reportes/movimientos-almacen`, `/reportes/historial-vehiculo`) con su propio `roleGuard`, así
  que un reporte con sus filtros se puede compartir por URL y recargar sin volver al primero.
  Un CONDUCTOR no ve el menú «Reportes» en el sidebar (igual que hoy, `CONDUCTOR_NAV`): llega a su
  único reporte desde «Mi vehículo», y vuelve ahí con el enlace de la propia pantalla.
- RF-2: CUANDO un usuario intenta consultar, por URL directa o llamada GraphQL, un reporte fuera de
  los permitidos para su rol, EL SISTEMA rechaza la operación (`RolesGuard`/`@Roles` por query,
  mismo mecanismo que `InventoryResolver` y `VehicleDriverAssignmentsResolver`), no sólo lo oculta
  en el menú.

**Reportes de listado (RF-3 a RF-8, RF-10 y RF-11: retirados en la revisión 2)**

- RF-3: CUANDO un usuario quiere el listado filtrable de vehículos, asignaciones, recorridos,
  cargas de combustible, órdenes de mantenimiento, kardex, incidentes o conductores, EL SISTEMA lo
  atiende en la pantalla de ese módulo, que ya ofrece esos filtros y su exportación; «Reportes» no
  los duplica ni los enlaza. Los números RF-4 a RF-8, RF-10 y RF-11 de la revisión 1 quedan sin
  efecto y no se reutilizan, para no mover la numeración de los requisitos que sí siguen vigentes.
- RF-9: CUANDO ADMINISTRADOR, CONSULTA, MANTENIMIENTO o ALMACEN abren «Movimientos de almacén», EL
  SISTEMA lista los `StockMovement` (entradas, salidas y ajustes), paginado y filtrable por
  artículo, vehículo destino, tipo de movimiento y rango de fechas. Este reporte sigue en
  «Reportes» porque no existe como pantalla propia en ningún módulo: Inventario sólo muestra los
  movimientos anidados bajo un artículo (`SparePart.movements`).

**Historial integral del vehículo (`vehicleHistory`)**

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
- RF-16: CUANDO CONDUCTOR abre su historial integral (desde «Mi vehículo»), EL SISTEMA:
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

**Reportes consolidados por periodo (revisión 2)**

- RF-18: CUANDO ADMINISTRADOR, CONSULTA, TRANSPORTES o COMBUSTIBLE generan «Consumo de combustible»
  (`fuelConsumptionReport`), EL SISTEMA devuelve una fila por grupo (RF-21) con: cargas registradas,
  litros, importe total, precio promedio por litro, kilómetros recorridos en el mismo rango y
  rendimiento del periodo (kilómetros sobre litros). Sólo aparecen los grupos con al menos una carga
  en el rango. Los kilómetros son los de los `Trip` del periodo, no los de `FuelRecord`: el
  rendimiento que interesa acá es el del periodo completo, no el de carga contra carga que ya guarda
  cada `FuelRecord.efficiencyKmPerUnit`.
- RF-19: CUANDO ADMINISTRADOR, CONSULTA, TRANSPORTES o MANTENIMIENTO generan «Costos de
  mantenimiento» (`maintenanceCostReport`), EL SISTEMA devuelve una fila por grupo con: órdenes del
  periodo, cuántas preventivas, cuántas correctivas, costo total y costo promedio por orden. Las
  órdenes anuladas (`CANCELLED`) no cuentan: no son un costo. El rango se aplica a la fecha de
  registro de la orden (`createdAt`), no a `finishedAt`, para que una orden abierta también entre en
  el periodo en que se abrió.
- RF-20: CUANDO ADMINISTRADOR, CONSULTA, TRANSPORTES o COMBUSTIBLE generan «Kilometraje recorrido»
  (`mileageReport`), EL SISTEMA devuelve una fila por grupo con: salidas del periodo, cuántas ya
  retornaron, kilómetros acumulados y kilómetros promedio por recorrido cerrado. Un recorrido sin
  retorno cuenta como salida pero no aporta kilómetros: `Trip.distanceKm` sólo se calcula al cerrar.
- RF-21: CUANDO se genera cualquiera de los tres consolidados, EL SISTEMA ofrece los mismos filtros
  —agrupación (una fila por vehículo o una fila por unidad), vehículo, unidad, tipo de vehículo y
  rango de fechas—, todos opcionales salvo la agrupación, que por defecto es por vehículo. Agrupando
  por unidad, los vehículos de la misma unidad vigente se suman en una fila y los que no tienen
  unidad vigente caen juntos en una fila «Sin unidad asignada», nunca descartados. Cada reporte
  además:
  a) ordena las filas por su métrica principal de mayor a menor (litros, costo, kilómetros) y, a
     igualdad, por etiqueta, para que dos consultas iguales devuelvan el mismo orden;
  b) pagina las filas ya consolidadas (`skip`/`take`, 0/20) y devuelve los totales de **todo** el
     resultado filtrado, no sólo de la página visible;
  c) acota por unidad a TRANSPORTES con `unitScopeFor` (spec 015), combinando ese alcance con el
     filtro de unidad del reporte sin que uno pise al otro: pedir una unidad ajena devuelve vacío,
     nunca datos de otra unidad.
- RF-22: CUANDO un reporte recibe un rango de fechas, EL SISTEMA interpreta «Desde» y «Hasta» como
  días completos de Bolivia (UTC-4, sin horario de verano): «Hasta 02/10» incluye todo el 02/10 y
  «Desde = Hasta = hoy» devuelve lo de hoy. Aplica a los reportes de esta pantalla
  (`common/day-range.ts`), no a los filtros de fecha del resto de los módulos, que siguen cortando
  a la medianoche UTC.

## Requisitos no funcionales

- Toda la interfaz está en español de Bolivia.
- Los reportes son de sólo lectura: ninguno expone mutaciones.
- El acceso por rol se aplica en el resolver (`@Roles`/`RolesGuard`), no sólo ocultando la pestaña
  en el frontend — mismo criterio que el resto del sistema (RF-2).
- Todos los reportes son paginados con los mismos valores por defecto que el resto del sistema
  (`skip` 0, `take` 20).
- El alcance por unidad de TRANSPORTES se resuelve siempre con `unitScopeFor`, nunca con un chequeo
  de rol aislado (spec 015).
- Los tres consolidados agregan en la base de datos (`groupBy` de Prisma) cuando la tabla de hechos
  tiene `vehicleId` propio; `Trip` no lo tiene (cuelga de `Assignment`), así que ahí se acumula en
  memoria, igual que `driverLogbook`.

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
- Un consolidado cuyo grupo no tiene denominador (litros en cero, ninguna orden, ningún recorrido
  cerrado) muestra «—» en el promedio o el rendimiento, no un cero: un promedio sin denominador no
  es cero.
- Un rango de fechas sin ningún hecho: tabla vacía y sin fila de totales, no una fila de ceros.
- Un vehículo con cargas pero sin recorridos en el rango aparece en el reporte de combustible con 0
  kilómetros y rendimiento «—»; no se lo excluye, porque su gasto existió igual.

## Fuera de alcance

- Gráficas o indicadores agregados: eso es el Panel principal (spec 012), no este módulo.
- Historial integral por conductor (equivalente a `vehicleHistory` pero centrado en una persona en
  vez de un vehículo): no lo pide este spec.
- Cualquier variante acotada de «Historial integral del vehículo» para COMBUSTIBLE, MANTENIMIENTO o
  ALMACEN: esos roles no tienen acceso a este reporte, ni completo ni filtrado por tipo de evento
  (decisión explícita, no un olvido); si necesitan revisar un vehículo, usan el listado de su propio
  dominio o el consolidado de su dominio.
- Un consolidado de incidentes o de documentación por periodo: no lo pide este spec.

Nota: la exportación a Excel/PDF estaba fuera de alcance en la revisión 1 y se agregó después, por
pedido explícito fuera del spec (`shared/export/report-export.ts`): los cinco reportes de esta
pantalla la ofrecen, y exportan todo el resultado filtrado vigente, no sólo la página visible.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Consumo de combustible | `fuelConsumptionReport` (query nueva, revisión 2) |
| Costos de mantenimiento | `maintenanceCostReport` (query nueva, revisión 2) |
| Kilometraje recorrido | `mileageReport` (query nueva, revisión 2) |
| Movimientos de almacén | `stockMovements` |
| Historial integral del vehículo | `vehicleHistory` |
| Agrupación del reporte | `ReportGroupBy`: `VEHICLE`, `UNIT` |
| Fila «Sin unidad asignada» | `NO_UNIT_GROUP_ID` (`'SIN_UNIDAD'`, no es un id de `Unit`) |
| Tipo de evento del historial integral | `VehicleHistoryEntryType`: `UNIT_ASSIGNMENT`, `DRIVER_ASSIGNMENT`, `TRIP`, `FUEL`, `MAINTENANCE`, `INCIDENT`, `STOCK_MOVEMENT` |

Etiquetas de interfaz: «Reportes», «Una fila por vehículo», «Una fila por unidad», «Desde», «Hasta»,
«Limpiar filtros», «Total del periodo», «Rendimiento», «Costo prom.», «Km prom.».

## Criterios de finalización

- Los RF vigentes (RF-1, RF-2, RF-9, RF-12 a RF-22) tienen al menos un test automatizado en verde
  (`bun run verify` limpio en `backend` y `frontend`).
- Demo manual: con datos de prueba, verificar que cada rol ve exactamente las pestañas de su fila en
  la tabla de acceso; que los tres consolidados cuadran con la suma manual de un vehículo conocido,
  agrupados por vehículo y por unidad; que los totales no cambian al pasar de página; y que un
  usuario CONDUCTOR sólo ve, en su propio historial, eventos posteriores a su fecha de encargo
  vigente.
