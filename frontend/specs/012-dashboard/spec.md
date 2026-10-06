# Spec 012 — Panel principal (Dashboard)

> No agrega modelos nuevos: es sólo lectura, agregada a partir de los modelos que ya existen
> (`Vehicle`, `VehicleCondition`, `Driver`, `Trip`, `SparePart`, `MaintenanceOrder`). La maqueta
> (`prototype/`) muestra además un panel de «Últimos registros» que mezcla cinco tipos de eventos
> distintos (recorrido, combustible, mantenimiento, inventario, documentación) en una sola tabla
> cronológica; este spec no lo implementa (ver fuera de alcance) porque requiere unir cinco tablas
> heterogéneas sólo para un panel informativo, y no fue pedido explícitamente más allá de lo que ya
> muestra la maqueta como referencia visual general.

## Contexto y objetivo

La propuesta de desarrollo (RF-11, «Panel de control / Dashboard») pide una vista general del
estado del parque automotor al entrar al sistema. Hoy la página de inicio no existe como tal (el
sistema redirige directo a Vehículos). Esta funcionalidad entrega ese panel con datos reales de los
módulos ya implementados: vehículos, conductores, recorridos, inventario y mantenimiento.

## Usuarios / actores

- Cualquier usuario autenticado (simulado) puede consultar el panel: es la página de inicio del
  sistema, igual que en la maqueta, sin restricción de rol.

## Historias de usuario

- H1: Como cualquier usuario quiero ver, al entrar al sistema, cuántos vehículos hay, cuántos están
  operativos, cuántos conductores activos hay y cuántos recorridos se hicieron este mes, para tener
  una idea general sin tener que ir módulo por módulo.
- H2: Como cualquier usuario quiero ver la distribución del parque automotor por estado
  (operativo, en mantenimiento, inoperable, otros), para dimensionar la situación general.
- H3: Como cualquier usuario quiero ver recorridos por mes en los últimos 12 meses, para notar
  tendencias de uso.
- H4: Como cualquier usuario quiero ver cuántos artículos están bajo su stock mínimo, cuántos
  recorridos siguen abiertos y cuántos mantenimientos están en proceso, para saber qué requiere
  atención.

## Requisitos funcionales (criterios de aceptación en EARS)

- RF-1: CUANDO cualquier usuario abre el panel principal, EL SISTEMA muestra el total de vehículos
  registrados, el total de vehículos operativos, el total de conductores activos y el total de
  recorridos iniciados en el mes en curso.
- RF-2: CUANDO cualquier usuario consulta la distribución del parque automotor, EL SISTEMA clasifica
  cada vehículo en exactamente una categoría: «en mantenimiento» (tiene una orden de mantenimiento
  en proceso), «operativo» (condición vigente buena o regular, o sin historial de condición, y sin
  mantenimiento en proceso), «inoperable» (condición vigente deteriorada, fuera de uso, inoperable,
  extraviada, separada por incidente o dada de baja) u «otros» (condición vigente devuelto).
- RF-3: CUANDO cualquier usuario consulta el panel, EL SISTEMA muestra la cantidad de recorridos
  iniciados en cada uno de los últimos 12 meses, incluyendo los meses sin recorridos como cero.
- RF-4: CUANDO cualquier usuario consulta el panel, EL SISTEMA muestra la cantidad de artículos de
  inventario activos cuyo stock actual está por debajo de su stock mínimo, la cantidad de
  recorridos abiertos y la cantidad de órdenes de mantenimiento en proceso.

## Requisitos no funcionales

- Toda la interfaz está en español de Bolivia.
- El panel es de sólo lectura: no expone mutaciones ni requiere restricción de rol para
  consultarlo, a diferencia del resto de los módulos.
- Los cálculos se hacen sobre datos vigentes al momento de la consulta; no se cachean ni se
  materializan aparte (a diferencia de `Alert`, que si existiera para esto guardaría un registro
  propio).

## Casos límite

- Un vehículo sin ningún registro en `VehicleCondition` cuenta como operativo (RF-2): no tener
  historial no es lo mismo que estar en mal estado.
- Un vehículo con una orden de mantenimiento en proceso cuenta como «en mantenimiento» sin importar
  su condición vigente: el mantenimiento en proceso tiene prioridad sobre el historial de condición
  para esta clasificación.
- Un mes sin recorridos aparece con cantidad cero en la serie de 12 meses (RF-3), no se omite.
- Sin vehículos, conductores, recorridos, artículos ni órdenes registradas, el panel muestra todo
  en cero, no un error.

## Fuera de alcance

- «Últimos registros»: tabla combinada de eventos recientes de distintos módulos (ver cabecera).
- Exportar el resumen del panel (el botón «Exportar resumen» de la maqueta no tiene función real
  en este spec).
- Alertas persistentes (`Alert`): el panel calcula lo que muestra en el momento, no genera ni lee
  alertas guardadas.
- Cualquier acción de escritura desde el panel (por ejemplo, «Registrar recorrido» directo desde
  aquí): el panel sólo consulta: para registrar, se usa el módulo correspondiente.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Vehículos registrados | `vehicleCount` |
| Vehículos operativos | `operationalVehicleCount` |
| Conductores activos | `activeDriverCount` |
| Recorridos este mes | `tripsThisMonthCount` |
| Recorridos abiertos | `openTripsCount` |
| Artículos bajo stock mínimo | `lowStockCount` |
| Mantenimientos en proceso | `inProgressMaintenanceCount` |
| Recorridos por mes | `tripsByMonth` |
| Distribución del parque | `fleetStatus` (`operational`/`maintenance`/`inoperable`/`other`) |

Etiquetas de interfaz: «Panel principal», «Vehículos registrados», «Vehículos operativos»,
«Conductores activos», «Recorridos este mes», «Recorridos por mes», «Estado del parque
automotor», «Seguimiento».

## Criterios de finalización

- Los 4 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: con datos de prueba en vehículos/conductores/recorridos/inventario/mantenimiento,
  abrir el panel y comprobar que las cuatro métricas, la distribución del parque y la serie de 12
  meses coinciden con lo esperado.

## Dudas abiertas

- [NECESITA ACLARACIÓN] ¿«Vehículos operativos» para RF-1 debe excluir además los vehículos
  inactivos (`Vehicle.isActive = false`, dados de baja del sistema), o sólo considera la condición
  vigente como se asume aquí?
