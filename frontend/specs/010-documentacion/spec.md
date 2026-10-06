# Spec 010 — Documentación vehicular

> Alineado con `schema.prisma`: `VehicleDocument` (RF-08) ya existe desde la migración inicial y es
> el único modelo de este dominio. La maqueta (`prototype/`) muestra dos secciones — «Expediente
> documental» (registrar un documento) y «Entregas y recepciones» (registrar la entrega física de
> un documento a una unidad) —, pero el esquema sólo modela la primera: no existe una tabla para
> entregas/recepciones. Este spec implementa únicamente el expediente documental
> (`VehicleDocument`); «Entregas y recepciones» queda fuera de alcance hasta que se pida su propio
> modelo. Igual que en el expediente de la maqueta, no hay edición ni baja: sólo alta y consulta.

## Contexto y objetivo

La propuesta de desarrollo (RF-08, «Documentación del vehículo y vencimientos») pide llevar el
expediente documental de cada vehículo (SOAT, RUAT, inspección técnica...) con su fecha de
vencimiento, para tener trazabilidad y poder anticipar renovaciones. Hoy no existe ninguna pantalla
para esto. Esta funcionalidad entrega el registro y la consulta de ese expediente.

## Usuarios / actores

- **ADMINISTRADOR** y **TRANSPORTES**: pueden registrar documentos.
- Cualquier otro rol puede consultar el expediente en modo sólo lectura.

## Historias de usuario

- H1: Como TRANSPORTES quiero registrar un documento de un vehículo con su tipo, número y fecha de
  vencimiento, para dejar constancia de su expediente.
- H2: Como cualquier usuario quiero ver qué documentos ya vencieron, para anticipar su renovación.
- H3: Como cualquier usuario quiero listar y buscar documentos por vehículo, número o tipo, para
  encontrar rápido el que necesito.

## Requisitos funcionales (criterios de aceptación en EARS)

### Registro

- RF-1: CUANDO un usuario ADMINISTRADOR o TRANSPORTES registra un documento indicando vehículo,
  tipo y fecha de vencimiento, EL SISTEMA lo crea, con número de documento, fecha de emisión y
  observaciones opcionales.
- RF-2: SI el vehículo, el tipo o la fecha de vencimiento faltan, ENTONCES EL SISTEMA rechaza la
  operación y señala el campo faltante.
- RF-3: SI el vehículo indicado no existe, ENTONCES EL SISTEMA rechaza la operación.

### Consulta

- RF-4: CUANDO cualquier usuario consulta el expediente documental, EL SISTEMA lo muestra paginado
  con vehículo, tipo, número, fecha de emisión y fecha de vencimiento, y permite filtrarlo por
  vehículo, por tipo de documento y por texto libre (placa, número de documento).
- RF-5: CUANDO cualquier usuario consulta un documento cuya fecha de vencimiento ya pasó, EL
  SISTEMA lo señala visualmente como vencido.

### Permisos

- RF-6: SI un usuario sin rol ADMINISTRADOR o TRANSPORTES intenta registrar un documento, ENTONCES
  EL SISTEMA rechaza la operación por falta de permiso. La consulta queda abierta a cualquier rol.

## Requisitos no funcionales

- Toda la interfaz y los mensajes de validación están en español de Bolivia, de forma impersonal.
- El control de acceso viaja por el header simulado `x-user-role` (`RolesGuard`), igual que en
  vehículos, unidades, conductores y recorridos.

## Casos límite

- Un vehículo puede tener varios documentos del mismo tipo a la vez (por ejemplo, dos SOAT en años
  distintos): no hay restricción de unicidad por tipo.
- La fecha de vencimiento acepta cualquier fecha, pasada o futura: el sistema no bloquea el
  registro de un documento ya vencido, sólo lo señala (RF-5).
- Buscar con el campo de texto vacío devuelve el expediente completo paginado.

## Fuera de alcance

- «Entregas y recepciones» de documentación física: no existe modelo en el esquema para esto (ver
  cabecera); si se pide, requiere su propio spec y su propia tabla.
- Edición o eliminación de un documento ya registrado: ni el esquema ni la maqueta lo contemplan
  como acción sobre el expediente.
- Adjuntar o almacenar el archivo digital del documento (`fileUrl` existe en el esquema pero este
  spec no expone un campo de carga; queda reservado para cuando se pida).
- Alertas automáticas de vencimiento próximo (`Alert`, `AlertType.DOCUMENT_EXPIRING`): el listado
  señala lo ya vencido (RF-5), pero no genera alertas persistentes ni avisa con anticipación.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Vehículo | `vehicleId` |
| Tipo de documento | `type` (`DocumentType`) |
| Número / referencia | `documentNumber` |
| Fecha de emisión | `issuedAt` |
| Fecha de vencimiento | `expiresAt` |
| Observaciones | `notes` |

Etiquetas de interfaz: «Documentación», «Registrar documento», «Vehículo», «Tipo», «Número»,
«Vencimiento», «Vencido».

## Criterios de finalización

- Los 6 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: registrar un documento con vencimiento futuro → verlo en el expediente → registrar
  uno con vencimiento pasado y verlo señalado como vencido → filtrar por vehículo y por tipo.
- Un usuario sin rol ADMINISTRADOR o TRANSPORTES recibe un error claro al intentar registrar un
  documento; puede seguir consultando el expediente.

## Dudas abiertas

- [NECESITA ACLARACIÓN] Cuando se pida el modelo de «Entregas y recepciones», ¿debe enlazarse a un
  `VehicleDocument` existente o es un registro independiente que sólo referencia al vehículo?
