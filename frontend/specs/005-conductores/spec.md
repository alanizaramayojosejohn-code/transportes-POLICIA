# Spec 005 — Conductores

> Alineado con `base_datos_transportes_postgresql_final.sql` (padrón de conductores) y con el
> modelo `Driver` que ya vive en `schema.prisma` desde la migración inicial. `Driver.departmentId`
> apunta a `Department`, modelo dormido a propósito desde el spec 002 (ver spec 002, fuera de
> alcance) — no se usa aquí. En su lugar, este spec agrega `Driver.unitId` (nullable, FK a `Unit`)
> porque la maqueta (`prototype/`) pide un campo «Unidad» por conductor y `Unit` es el modelo activo
> desde spec 002/003; es una migración aditiva (columna nullable), no destructiva.

## Contexto y objetivo

La propuesta de desarrollo (RF-02, «Padrón de conductores») pide un registro centralizado de
conductores habilitados, independiente del padrón de vehículos. Hoy no existe ninguna pantalla para
esto: el modelo `Driver` está en el esquema desde la migración inicial pero sin módulo que lo
administre. Esta funcionalidad entrega ese padrón: alta, edición, baja/reactivación y consulta con
filtros, siguiendo el mismo patrón de permisos que vehículos y unidades (spec 001/002).

## Usuarios / actores

- **ADMINISTRADOR** y **TRANSPORTES**: pueden crear, editar, dar de baja y reactivar conductores.
- Cualquier otro rol autenticado (simulado por `x-user-role`) puede consultar el padrón en modo
  sólo lectura, igual que vehículos y unidades.

## Historias de usuario

- H1: Como TRANSPORTES quiero registrar un conductor con su CI, nombre completo, licencia y
  vencimiento, para tenerlo habilitado antes de asignarle un vehículo.
- H2: Como TRANSPORTES quiero editar los datos de un conductor (grado, licencia, unidad, teléfono)
  cuando cambian, sin perder su historial.
- H3: Como TRANSPORTES quiero dar de baja a un conductor que ya no está habilitado, sin borrar su
  registro.
- H4: Como TRANSPORTES quiero reactivar a un conductor dado de baja por error.
- H5: Como cualquier usuario quiero buscar conductores por CI, nombre o licencia, y filtrar por
  unidad y por estado, para encontrar rápido el que necesito.
- H6: Como TRANSPORTES quiero que el sistema me avise si la licencia de un conductor ya está
  vencida, para no despacharlo con ella vencida.

## Requisitos funcionales (criterios de aceptación en EARS)

### Creación

- RF-1: CUANDO un usuario ADMINISTRADOR o TRANSPORTES registra un conductor indicando CI, nombres,
  apellidos, número de licencia, categoría de licencia y fecha de vencimiento, EL SISTEMA lo crea
  activo, con grado, unidad y teléfono opcionales.
- RF-2: SI el registro no incluye CI, nombres, apellidos, número de licencia, categoría o
  vencimiento de licencia, ENTONCES EL SISTEMA rechaza la operación y señala el campo faltante.
- RF-3: SI el CI o el número de licencia ya pertenecen a otro conductor, ENTONCES EL SISTEMA
  rechaza el registro e indica el campo duplicado.
- RF-4: SI la unidad indicada no corresponde a ninguna unidad existente, ENTONCES EL SISTEMA
  rechaza la operación.

### Edición

- RF-5: CUANDO un usuario ADMINISTRADOR o TRANSPORTES edita los datos de un conductor, EL SISTEMA
  guarda los cambios sujeto a las mismas validaciones de unicidad (RF-3) y de unidad (RF-4) que la
  creación.

### Baja y reactivación

- RF-6: CUANDO un usuario ADMINISTRADOR o TRANSPORTES da de baja a un conductor, EL SISTEMA lo
  marca inactivo sin borrar el registro ni su historial.
- RF-7: CUANDO un usuario ADMINISTRADOR o TRANSPORTES reactiva a un conductor inactivo, EL SISTEMA
  lo marca activo de nuevo, conservando sus datos sin cambios.

### Consulta

- RF-8: CUANDO cualquier usuario consulta el listado de conductores, EL SISTEMA lo muestra
  paginado con CI, nombre completo, grado, licencia, unidad y estado, y permite filtrarlo por
  unidad, por estado (activo o inactivo) y por texto libre (CI, nombres, apellidos, licencia).
- RF-9: CUANDO cualquier usuario consulta la ficha de un conductor cuya licencia ya venció (fecha
  de vencimiento anterior a hoy), EL SISTEMA lo señala visualmente como licencia vencida.

### Permisos

- RF-10: SI un usuario sin rol ADMINISTRADOR o TRANSPORTES intenta crear, editar, dar de baja o
  reactivar un conductor, ENTONCES EL SISTEMA rechaza la operación por falta de permiso. La
  consulta queda abierta a cualquier rol.

## Requisitos no funcionales

- Toda la interfaz y los mensajes de validación están en español de Bolivia, de forma impersonal.
- El control de acceso viaja por el header simulado `x-user-role` (`RolesGuard`), igual que en
  vehículos, unidades y asignaciones: no hay login real todavía.
- La comparación de unicidad de CI y licencia es exacta (no normaliza mayúsculas), porque ambos son
  identificadores oficiales que ya vienen en un formato fijo.

## Casos límite

- Un conductor sin unidad asignada (`unitId` nulo) se muestra como «Sin asignar» en el listado y en
  el filtro correspondiente.
- La fecha de vencimiento de licencia acepta cualquier fecha, pasada o futura: el sistema no
  bloquea el registro de una licencia ya vencida, sólo la señala (RF-9).
- Buscar con el campo de texto vacío devuelve el listado completo paginado.
- Dar de baja a un conductor no afecta asignaciones o viajes ya registrados a su nombre (fuera de
  alcance de este spec, ver spec 006).

## Fuera de alcance

- Vínculo entre `Driver` y `User` (cuenta de sistema para el conductor): el campo `Driver.userId`
  ya existe en el esquema pero su llenado queda para cuando se pida ese flujo explícitamente.
- «Vehículos asociados» por conductor: depende del historial de asignaciones conductor-vehículo
  (`Assignment`/`Trip`), que no existe todavía como módulo. Se resuelve en el spec de Recorridos.
- Campo «Observaciones» de texto libre: no existe en `Driver` en el esquema actual; no se agrega en
  este spec.
- Historial de cambios de unidad del conductor (a diferencia de `UnitAssignment` para vehículos, no
  se pide un historial aquí, sólo la unidad vigente).

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| CI | `ci` |
| Nombres | `firstName` |
| Apellidos | `lastName` |
| Grado | `rank` |
| Número de licencia | `licenseNumber` |
| Categoría de licencia | `licenseCategory` |
| Vencimiento de licencia | `licenseExpiresAt` |
| Teléfono | `phone` |
| Unidad | `Unit` / `unitId` |
| Activo | `isActive` |

Etiquetas de interfaz: «Conductores», «Nuevo conductor», «CI», «Nombres», «Apellidos», «Licencia»,
«Categoría», «Vencimiento», «Unidad», «Activo», «Inactivo», «Licencia vencida», «Dar de baja»,
«Reactivar».

## Criterios de finalización

- Los 10 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: crear un conductor con licencia y unidad → verlo en el listado → intentar duplicar
  su CI y ver el rechazo → editarle la unidad → darlo de baja y verlo inactivo → reactivarlo →
  filtrar por unidad y por estado → crear uno con licencia ya vencida y ver la señal visual.
- Un usuario sin rol ADMINISTRADOR o TRANSPORTES recibe un error claro al intentar escribir; puede
  seguir consultando el listado.

## Dudas abiertas

- [NECESITA ACLARACIÓN] ¿La categoría de licencia debe validarse contra una lista cerrada (A, B, C,
  M, P según la maqueta) o queda como texto libre? Se asume texto libre por ahora, como ya lo
  modela el esquema (`licenseCategory: String`).
