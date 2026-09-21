# Spec 017 — Tipos de artículo, lote y trazabilidad de vehículo en inventario

> Continúa el spec 009 (catálogo de artículos y kardex). No reemplaza ninguno de sus RF: agrega un
> discriminador de tipo de artículo para que el formulario de alta contemple líquidos, llantas y
> piezas con sus campos propios, un peso unitario general, y dos datos opcionales en el movimiento
> de entrada/salida (lote y vehículo destino) que hoy el spec 009 marcaba explícitamente fuera de
> alcance. Se optó por la variante simple de ambos (lote como dato del movimiento, no como entidad
> con stock propio; vínculo a vehículo a nivel de movimiento, no unidad física serializada) para no
> abrir un subsistema nuevo de inventario serializado.

## Contexto y objetivo

El catálogo de artículos (spec 009) trata todo artículo por igual: código, nombre, categoría,
unidad, stock. En la práctica el almacén maneja líquidos (aceites, refrigerante), llantas y piezas,
cada uno con datos propios que hoy no tienen dónde guardarse (medida de llanta, peso), y necesita
poder registrar de qué lote de compra viene una entrada y hacia qué vehículo salió una pieza, para
responder "¿de dónde salió esto?" y "¿qué le pusimos a este vehículo?" sin abrir una pantalla nueva.

## Usuarios / actores

Mismos actores que el spec 009: **ADMINISTRADOR**, **TRANSPORTES** y **ALMACEN** escriben; cualquier
otro rol consulta en modo lectura.

## Historias de usuario

- H1: Como ALMACEN quiero indicar si un artículo es líquido, llanta o pieza al registrarlo, para que
  el formulario me pida sólo los datos que le corresponden.
- H2: Como ALMACEN quiero registrar la medida de una llanta y el peso unitario de cualquier
  artículo, para tener esa ficha técnica disponible sin usarla como texto libre en observaciones.
- H3: Como ALMACEN quiero indicar el número de lote y, si aplica, el vencimiento al registrar una
  entrada, para saber de qué compra viene ese stock.
- H4: Como ALMACEN quiero indicar a qué vehículo se destina una salida, para saber después qué
  piezas o líquidos se usaron en ese vehículo.

## Requisitos funcionales (criterios de aceptación en EARS)

### Tipo de artículo

- RF-1: CUANDO un usuario ADMINISTRADOR, TRANSPORTES o ALMACEN registra o edita un artículo, EL
  SISTEMA le pide elegir un tipo — Líquido, Llanta, Pieza u Otro — con «Otro» como valor por
  defecto; el tipo no afecta la unicidad de código ni el cálculo de stock del spec 009.
- RF-2: CUANDO el tipo elegido es Llanta, EL SISTEMA permite indicar la medida de la llanta como
  texto libre (ej. «195/65 R15»); para cualquier otro tipo ese campo queda vacío.
- RF-3: CUANDO un usuario registra o edita un artículo de cualquier tipo, EL SISTEMA permite indicar
  su peso unitario en kilogramos, opcional.

### Lote

- RF-4: CUANDO un usuario registra una entrada de stock (spec 009, RF-6), EL SISTEMA permite indicar
  el número de lote y su fecha de vencimiento, ambos opcionales; los guarda en el movimiento sin
  crear una entidad de lote separada ni fraccionar el stock del artículo por lote.
- RF-5: El número de lote y el vencimiento no aplican a una salida (spec 009, RF-7): si se envían,
  EL SISTEMA los ignora.

### Trazabilidad de vehículo

- RF-6: CUANDO un usuario registra una salida de stock (spec 009, RF-7), EL SISTEMA permite indicar
  opcionalmente un vehículo destino, para dejar constancia de a qué vehículo se destinó.
- RF-7: SI el vehículo indicado no existe, ENTONCES EL SISTEMA rechaza el movimiento indicando el
  campo inválido.
- RF-8: El vehículo destino no aplica a una entrada (spec 009, RF-6): si se envía, EL SISTEMA lo
  ignora.

### Consulta

- RF-9: CUANDO cualquier usuario consulta el catálogo de artículos (spec 009, RF-10), EL SISTEMA
  muestra también el tipo de cada artículo y permite filtrar por tipo.

## Requisitos no funcionales

- `weight` usa `Decimal` en la base (3 decimales, kilogramos) expuesto como `Float` en GraphQL,
  igual que el resto de campos numéricos del módulo.
- El tipo de artículo es un enum de Prisma (`SparePartType`), no un catálogo editable: a diferencia
  de `SparePartCategory`, sus valores son fijos porque determinan qué campos muestra el formulario.
- `lotNumber`, `lotExpiresAt` y `vehicleId` viven en `StockMovement`, no en `SparePart`: son datos
  de una entrada o salida puntual, no del artículo.

## Casos límite

- Un artículo «Otro» sin medida de llanta ni peso sigue siendo válido: ambos son opcionales para
  todos los tipos.
- Cambiar el tipo de un artículo existente (ej. de Pieza a Llanta) no borra ni exige la medida de
  llanta retroactivamente; el campo queda disponible para completarse después.
- Dar de baja un vehículo no bloquea la consulta de los movimientos que ya lo referencian.

## Fuera de alcance

- Inventario serializado por unidad física (cada llanta o pieza individual con su propio ciclo de
  vida, posición de instalación y kilometraje): evaluado y descartado explícitamente para este
  spec; ver historial de la conversación. Si se necesita después, es un módulo nuevo, no una
  extensión de `StockMovement`.
- Lote con stock propio y consumo FIFO: mismo caso — el lote es un dato descriptivo del movimiento,
  no una entidad con existencia propia.
- Historial de movimientos por vehículo (pantalla «qué se le puso a este vehículo»): este spec sólo
  guarda el dato (`vehicleId` en `StockMovement`); no agrega una vista nueva para consultarlo.
- Volumen o presentación de líquidos (ej. litros por bidón) como campo estructurado: se cubre con
  `unit` y `currentStock` existentes (spec 009), sin campo nuevo.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Tipo de artículo | `SparePartType` |
| Líquido / Llanta / Pieza / Otro | `LIQUIDO` / `LLANTA` / `PIEZA` / `OTRO` |
| Medida (de llanta) | `tireSize` |
| Peso unitario (kg) | `weight` |
| Lote | `lotNumber` |
| Vencimiento de lote | `lotExpiresAt` |
| Vehículo destino | `vehicleId` |

## Criterios de finalización

- Los 9 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: crear un artículo tipo Llanta con medida y peso → registrar una entrada con lote y
  vencimiento → registrar una salida con vehículo destino → verlos reflejados en el movimiento →
  filtrar el catálogo por tipo.
