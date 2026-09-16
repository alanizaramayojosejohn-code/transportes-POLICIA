# Spec 009 — Inventario

> Alineado con `schema.prisma`: `SparePartCategory`, `SparePart` y `StockMovement` (RF-14/RF-15) ya
> existen desde la migración inicial. `SparePart.currentStock` no es un campo editable: sólo lo
> escribe este servicio, dentro de la misma transacción que crea el `StockMovement` que lo motiva
> (comentario del esquema). `registeredById` se resuelve con `resolveActingUserId` (spec 006). La
> categoría (`SparePartCategory`) es un catálogo real, no un enum: se siembra con las mismas seis
> categorías que ya sugiere la maqueta (Lubricante, Repuesto, Filtro, Fluido, Material, Otro), igual
> que se sembró el catálogo de roles en el spec 004.

## Contexto y objetivo

La propuesta de desarrollo (RF-14/RF-15, «Inventario de repuestos y kardex») pide un catálogo de
artículos (repuestos, lubricantes, filtros) con su stock, y un registro de movimientos de entrada y
salida que mantenga ese stock actualizado y trazable. Hoy no existe ninguna pantalla para esto.
Esta funcionalidad entrega el catálogo de artículos y el registro de movimientos; el stock de cada
artículo se deriva siempre de sus movimientos, nunca se edita directamente.

## Usuarios / actores

- **ADMINISTRADOR**, **TRANSPORTES** y **ALMACEN**: pueden crear y editar artículos, y registrar
  movimientos de entrada y salida.
- Cualquier otro rol puede consultar el catálogo en modo sólo lectura.

## Historias de usuario

- H1: Como ALMACEN quiero registrar un artículo nuevo con código, nombre, categoría, unidad de
  medida y stock mínimo, para tenerlo disponible antes de recibir existencias.
- H2: Como ALMACEN quiero registrar una entrada de stock para un artículo, para reflejar una
  compra o reposición.
- H3: Como ALMACEN quiero registrar una salida de stock para un artículo indicando el motivo, para
  reflejar su uso (por ejemplo, en un mantenimiento).
- H4: Como ALMACEN quiero que el sistema rechace una salida que deje el stock en negativo, para no
  registrar algo que físicamente no puede pasar.
- H5: Como cualquier usuario quiero ver qué artículos están bajo su stock mínimo, para anticipar la
  reposición.
- H6: Como cualquier usuario quiero listar y buscar artículos por código o nombre, y filtrar por
  categoría y por estado, para encontrar rápido el que necesito.

## Requisitos funcionales (criterios de aceptación en EARS)

### Artículos

- RF-1: CUANDO un usuario ADMINISTRADOR, TRANSPORTES o ALMACEN registra un artículo indicando
  código, nombre, categoría y unidad de medida, EL SISTEMA lo crea activo con stock en cero, con
  stock mínimo, ubicación y descripción opcionales.
- RF-2: SI el código, el nombre, la categoría o la unidad de medida faltan, ENTONCES EL SISTEMA
  rechaza la operación y señala el campo faltante.
- RF-3: SI el código ya pertenece a otro artículo, ENTONCES EL SISTEMA rechaza el registro e indica
  el campo duplicado.
- RF-4: CUANDO un usuario ADMINISTRADOR, TRANSPORTES o ALMACEN edita un artículo, EL SISTEMA guarda
  los cambios sin alterar el stock actual, sujeto a la misma validación de unicidad (RF-3).
- RF-5: CUANDO un usuario ADMINISTRADOR, TRANSPORTES o ALMACEN da de baja o reactiva un artículo,
  EL SISTEMA lo marca inactivo o activo sin alterar su stock ni su historial de movimientos.

### Movimientos

- RF-6: CUANDO un usuario ADMINISTRADOR, TRANSPORTES o ALMACEN registra una entrada de stock
  indicando artículo y cantidad, EL SISTEMA suma la cantidad al stock actual del artículo y guarda
  el movimiento con el saldo resultante, con costo unitario, proveedor y referencia opcionales; si
  se indica costo unitario, lo guarda como el último costo del artículo.
- RF-7: CUANDO un usuario ADMINISTRADOR, TRANSPORTES o ALMACEN registra una salida de stock
  indicando artículo, cantidad y motivo, EL SISTEMA resta la cantidad al stock actual del artículo
  y guarda el movimiento con el saldo resultante.
- RF-8: SI la cantidad de una salida es mayor al stock actual del artículo, ENTONCES EL SISTEMA
  rechaza la operación indicando el stock disponible.
- RF-9: SI el artículo indicado no existe o está inactivo, ENTONCES EL SISTEMA rechaza el
  movimiento.

### Consulta

- RF-10: CUANDO cualquier usuario consulta el catálogo de artículos, EL SISTEMA lo muestra paginado
  con código, nombre, categoría, unidad, stock actual, stock mínimo y estado, y permite filtrarlo
  por categoría, por estado y por texto libre (código, nombre); señala visualmente los artículos
  cuyo stock actual está por debajo de su stock mínimo.

### Permisos

- RF-11: SI un usuario sin rol ADMINISTRADOR, TRANSPORTES o ALMACEN intenta crear o editar un
  artículo, darlo de baja, reactivarlo o registrar un movimiento, ENTONCES EL SISTEMA rechaza la
  operación por falta de permiso. La consulta queda abierta a cualquier rol.

## Requisitos no funcionales

- Toda la interfaz y los mensajes de validación están en español de Bolivia, de forma impersonal.
- Las cantidades y costos (`minStock`, `currentStock`, `lastUnitCost`, `quantity`, `unitCost`,
  `balanceAfter`) usan `Decimal` en la base, expuestos como `Float` en GraphQL (misma decisión que
  los specs 007 y 008).
- El control de acceso viaja por el header simulado `x-user-role`; el autor real de cada movimiento
  se resuelve con `resolveActingUserId` (spec 006).
- El stock de un artículo (`currentStock`) nunca se escribe fuera de una transacción que también
  inserta el `StockMovement` correspondiente.

## Casos límite

- Un artículo recién creado tiene stock cero: una salida sobre él siempre se rechaza (RF-8) hasta
  que tenga una entrada.
- Un artículo con stock exactamente igual a su stock mínimo no se señala como bajo stock; sólo por
  debajo del mínimo se marca (comparación estricta, `currentStock < minStock`).
- Dar de baja un artículo no bloquea la consulta de su historial ni su stock, sólo impide nuevos
  movimientos (RF-9) y su edición vía formulario de alta (sigue editable para reactivarlo).
- Buscar con el campo de texto vacío devuelve el catálogo completo paginado.

## Fuera de alcance

- Tipo de movimiento «ajuste» (`StockMovementType.ADJUSTMENT`): el enum lo contempla en el esquema
  pero este spec sólo expone entrada y salida desde la interfaz, igual que la maqueta.
- Vínculo estructurado de una salida con una unidad destino o un vehículo relacionado: el esquema
  sólo modela `reason`, `supplier` y `reference` como texto libre; no se agregan columnas nuevas
  para esto.
- Vínculo con `MaintenanceItem` (repuestos usados en una orden de mantenimiento): ver spec 008,
  fuera de alcance.
- Historial de movimientos (kardex) como pantalla propia: este spec registra el movimiento y
  actualiza el stock, pero no expone una vista de historial por artículo.
- Alertas automáticas de bajo stock (`Alert`, `AlertType.LOW_STOCK`): el listado señala el bajo
  stock visualmente (RF-10), pero no genera alertas persistentes.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Código | `code` |
| Nombre | `name` |
| Categoría | `SparePartCategory` / `categoryId` |
| Unidad de medida | `unit` |
| Stock mínimo | `minStock` |
| Stock actual | `currentStock` |
| Último costo | `lastUnitCost` |
| Ubicación | `location` |
| Observaciones | `description` |
| Activo | `isActive` |
| Entrada / Salida | `StockMovementType.IN` / `.OUT` |
| Cantidad | `quantity` |
| Costo unitario | `unitCost` |
| Saldo resultante | `balanceAfter` |
| Motivo | `reason` |
| Proveedor | `supplier` |
| Documento / referencia | `reference` |

Etiquetas de interfaz: «Inventario», «Artículo», «Movimiento», «Entrada», «Salida», «Bajo stock»,
«Disponible».

## Criterios de finalización

- Los 11 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: crear un artículo con categoría → registrar una entrada y ver el stock actualizado →
  registrar una salida mayor al stock y ver el rechazo → registrar una salida válida y ver el
  saldo → darlo de baja y verlo inactivo → filtrar por categoría y por estado.
- Un usuario sin rol ADMINISTRADOR, TRANSPORTES o ALMACEN recibe un error claro al intentar crear,
  editar o mover un artículo; puede seguir consultando el catálogo.

## Dudas abiertas

- [NECESITA ACLARACIÓN] ¿El costo unitario de una entrada debe recalcular el costo promedio
  ponderado del artículo, o basta con guardar el costo de la última entrada (`lastUnitCost`), como
  se asume aquí?
