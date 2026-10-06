# Spec 007 — Combustible

> Alineado con `schema.prisma`: el modelo `FuelRecord` (RF-07) ya existe desde la migración
> inicial. `registeredById` es un `User` obligatorio; se resuelve con `resolveActingUserId`
> (`common/acting-user.ts`, introducido en el spec 006) buscando el primer usuario activo con el
> rol simulado activo. `tripId` (enlace opcional a un recorrido abierto) existe en el esquema pero
> este spec no lo llena: no fue pedido y la maqueta no lo pide tampoco (ver spec 006, dudas
> abiertas). `totalCost` no es un campo de formulario: el servicio lo calcula como
> `quantity * unitPrice`, igual que `efficiencyKmPerUnit` se calcula contra la carga anterior del
> mismo vehículo, nunca se piden como entrada.

## Contexto y objetivo

La propuesta de desarrollo (RF-07, «Control de combustible») pide registrar cada abastecimiento
con su costo, kilometraje y vehículo, para controlar el gasto y el rendimiento del parque. Hoy no
existe ninguna pantalla para esto. Esta funcionalidad entrega el registro de abastecimientos con
cálculo automático de costo total y rendimiento (km por litro) contra la carga anterior del mismo
vehículo.

## Usuarios / actores

- **ADMINISTRADOR**, **TRANSPORTES** y **COMBUSTIBLE**: pueden registrar abastecimientos.
- Cualquier otro rol puede consultar el listado en modo sólo lectura.

## Historias de usuario

- H1: Como COMBUSTIBLE quiero registrar un abastecimiento indicando vehículo, fecha, tipo de
  combustible, cantidad, precio unitario y kilometraje, para dejar constancia del gasto.
- H2: Como COMBUSTIBLE quiero que el sistema calcule el costo total y el rendimiento (km/l) de cada
  carga automáticamente, para no tener que calcularlo a mano ni arriesgarme a un error.
- H3: Como cualquier usuario quiero listar y buscar abastecimientos por vehículo o estación, y
  filtrar por tipo de combustible y por rango de fechas, para dar seguimiento al gasto.

## Requisitos funcionales (criterios de aceptación en EARS)

### Registro

- RF-1: CUANDO un usuario ADMINISTRADOR, TRANSPORTES o COMBUSTIBLE registra un abastecimiento
  indicando vehículo, fecha/hora, tipo de combustible, cantidad, precio unitario y kilometraje, EL
  SISTEMA lo crea calculando el costo total (`cantidad × precio unitario`), con conductor, estación,
  número de vale y observaciones opcionales.
- RF-2: SI el vehículo, la fecha, el tipo de combustible, la cantidad, el precio unitario o el
  kilometraje faltan, ENTONCES EL SISTEMA rechaza la operación y señala el campo faltante.
- RF-3: SI el vehículo indicado no existe, ENTONCES EL SISTEMA rechaza la operación.
- RF-4: SI el kilometraje indicado es menor al de la última carga registrada para ese vehículo,
  ENTONCES EL SISTEMA rechaza la operación.
- RF-5: CUANDO se registra un abastecimiento y existe una carga anterior para el mismo vehículo, EL
  SISTEMA calcula el rendimiento (kilómetros recorridos entre esa carga y la anterior, dividido
  entre la cantidad cargada) y lo guarda junto al registro; si es la primera carga del vehículo, el
  rendimiento queda vacío.

### Consulta

- RF-6: CUANDO cualquier usuario consulta el listado de abastecimientos, EL SISTEMA lo muestra
  paginado con fecha, vehículo, kilometraje, tipo, cantidad, costo total y estación, y permite
  filtrarlo por vehículo, por tipo de combustible, por rango de fechas y por texto libre (placa,
  estación, número de vale).

### Permisos

- RF-7: SI un usuario sin rol ADMINISTRADOR, TRANSPORTES o COMBUSTIBLE intenta registrar un
  abastecimiento, ENTONCES EL SISTEMA rechaza la operación por falta de permiso. La consulta queda
  abierta a cualquier rol.

## Requisitos no funcionales

- Toda la interfaz y los mensajes de validación están en español de Bolivia, de forma impersonal.
- Los importes (precio unitario, costo total) usan `Decimal`, nunca `Float` (convención ya fijada
  en `schema.prisma`).
- El control de acceso viaja por el header simulado `x-user-role`; el autor real del registro se
  resuelve con `resolveActingUserId` (spec 006).

## Casos límite

- Dos abastecimientos con el mismo kilometraje (vehículo detenido entre cargas, o corrección) son
  válidos: RF-4 sólo rechaza un kilometraje *menor*, no uno igual; el rendimiento de ese caso da 0.
- Buscar con el campo de texto vacío devuelve el listado completo paginado.
- Un vehículo sin cargas previas registra su primera carga sin rendimiento calculado (RF-5).

## Fuera de alcance

- Enlace con recorridos (`FuelRecord.tripId`): el campo existe en el esquema pero no se llena
  desde este spec (ver cabecera y spec 006, dudas abiertas).
- Edición o eliminación de un abastecimiento ya registrado.
- Reportes de consumo agregados por periodo o por unidad (eso es el módulo de Reportes).
- Alertas de gasto o de rendimiento anómalo (`Alert`, `AlertType`): ese modelo ya existe en el
  esquema pero su llenado es transversal y queda para un módulo aparte.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Vehículo | `vehicleId` |
| Conductor | `driverId` |
| Fecha/hora | `suppliedAt` |
| Tipo de combustible | `fuelType` (`FuelType`) |
| Cantidad | `quantity` |
| Precio unitario | `unitPrice` |
| Costo total | `totalCost` |
| Estación | `station` |
| Número de vale | `ticketNumber` |
| Kilometraje | `odometer` |
| Rendimiento (km/l) | `efficiencyKmPerUnit` |
| Observaciones | `notes` |

Etiquetas de interfaz: «Combustible», «Registrar abastecimiento», «Vehículo», «Tipo», «Litros»,
«Estación», «Vale», «Costo total», «Rendimiento».

## Criterios de finalización

- Los 7 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: registrar un abastecimiento para un vehículo sin cargas previas y ver rendimiento
  vacío → registrar una segunda carga con más kilometraje y ver el rendimiento calculado → intentar
  registrar una carga con kilometraje menor y ver el rechazo → filtrar por vehículo y por tipo de
  combustible.
- Un usuario sin rol ADMINISTRADOR, TRANSPORTES o COMBUSTIBLE recibe un error claro al intentar
  registrar un abastecimiento; puede seguir consultando el listado.

## Dudas abiertas

- [NECESITA ACLARACIÓN] ¿El rendimiento debe calcularse contra la carga anterior sin importar
  cuántos días pasaron, o sólo si hubo un recorrido registrado de por medio? Se asume que se
  calcula siempre contra la carga anterior del mismo vehículo, como indica el comentario del
  esquema.
