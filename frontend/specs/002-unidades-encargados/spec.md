# Spec 002 — Unidades y encargados de transportes

> Alineado con `base_datos_transportes_postgresql_final.sql` (secciones 1 y 8: `unidad`,
> `personal_policial`, `encargado_transportes_unidad`) y con el prototipo `index.html`
> (pantalla «Unidades y encargados de transportes»). Continúa el spec 001, que dejó
> deliberadamente fuera la unidad a la que pertenece un vehículo.

## Contexto y objetivo

El Comando Departamental de Policía de Oruro no es una sola oficina: es un árbol de unidades
(EPI 3, UTOP, FELCC, Radio Patrullas 110, Policía Rural…) que cuelgan del Comando o unas de
otras. Casi todo lo que registra el sistema —a qué unidad está asignado un vehículo, a qué unidad
pertenece un conductor, qué unidad salió de recorrido, dónde ocurrió un incidente— apunta a una
unidad. Hoy ese catálogo no existe: el spec 001 muestra la «unidad actual» de un vehículo como
dato de solo lectura producido por otro módulo, y ese otro módulo no tiene sobre qué apoyarse.

Esta funcionalidad es ese catálogo, más una segunda pieza que el Área de Transportes necesita a
diario: saber **quién es el encargado de transportes vigente de cada unidad**, y quién lo fue
antes. Cuando hay que reclamar una hoja de ruta, coordinar un mantenimiento o entregar un
vehículo, la pregunta operativa siempre es la misma: «¿con quién hablo en esa unidad?». El
encargado cambia con el tiempo y por eso se guarda como historial con fecha de inicio y fin, no
como un campo suelto en la unidad.

Se mantiene el principio del diseño original: el sistema centraliza información, pero no
reemplaza actas de designación, memorandos ni procedimientos administrativos. Registrar aquí a un
encargado no lo designa institucionalmente; deja constancia de una designación que ya ocurrió.

## Usuarios / actores

- **ADMINISTRADOR** y **TRANSPORTES**: registran y editan unidades, registran personal policial y
  designan o relevan encargados de transportes.
- **Cualquier usuario autenticado** (incluye roles de solo consulta como CONSULTA, COMBUSTIBLE,
  MANTENIMIENTO, ALMACÉN): consulta el listado de unidades, la ficha de cada una con su encargado
  vigente y el historial de encargados, sin poder modificar nada.

## Historias de usuario

- H1: Como usuario de Transportes quiero registrar una unidad indicando al menos su nombre para
  poder referenciarla desde el resto del sistema, aunque todavía no conozca su código ni su
  ubicación.
- H2: Como usuario de Transportes quiero indicar de qué unidad depende otra para reflejar la
  estructura real del Comando y poder mirar la información agrupada por dependencia superior.
- H3: Como usuario de Transportes quiero registrar al personal policial (CI, nombres, apellidos,
  grado) para poder designarlo como encargado de transportes de una unidad.
- H4: Como usuario de Transportes quiero designar al encargado de transportes de una unidad
  indicando desde cuándo, para saber a quién contactar por los vehículos de esa unidad.
- H5: Como usuario de Transportes quiero que al designar un encargado nuevo el anterior quede
  cerrado automáticamente, para que nunca haya dos responsables vigentes de la misma unidad.
- H6: Como usuario de Transportes quiero cerrar la designación de un encargado aunque todavía no
  haya reemplazo, para que el sistema no muestre como responsable a alguien que ya fue trasladado.
- H7: Como usuario del sistema quiero ver el listado de unidades con su encargado vigente y
  buscarlo por nombre, código o ubicación, para encontrar rápido lo que necesito.
- H8: Como usuario del sistema quiero ver la ficha de una unidad con sus sub-unidades y el
  historial completo de encargados, para saber quién era el responsable en una fecha determinada.
- H9: Como usuario de Transportes quiero dar de baja una unidad que dejó de existir sin perder su
  historial, y poder reactivarla si fue un error.

## Requisitos funcionales (criterios de aceptación en EARS)

### Unidades

- RF-1: CUANDO un usuario ADMINISTRADOR o TRANSPORTES registra una unidad indicando al menos su
  nombre, EL SISTEMA crea el registro marcado como activo, con el resto de los campos (código,
  tipo, ubicación, unidad superior) opcionales.
- RF-2: SI el registro o la edición no incluye nombre, ENTONCES EL SISTEMA rechaza la operación y
  señala el campo faltante.
- RF-3: SI el código informado ya pertenece a otra unidad —esté activa o no—, ENTONCES EL SISTEMA
  rechaza el registro o la edición e indica que el código está duplicado. La comparación ignora
  mayúsculas, minúsculas y espacios sobrantes.
- RF-4: CUANDO un usuario ADMINISTRADOR o TRANSPORTES edita los datos propios de una unidad
  (código, nombre, tipo, ubicación, unidad superior), EL SISTEMA guarda los cambios sin alterar su
  historial de encargados.
- RF-5: SI la unidad superior indicada es la propia unidad o alguna de sus descendientes,
  ENTONCES EL SISTEMA rechaza la operación e indica que la jerarquía quedaría en ciclo.
- RF-6: CUANDO un usuario ADMINISTRADOR o TRANSPORTES da de baja una unidad, EL SISTEMA la marca
  como inactiva, conserva todo su historial y cierra su designación de encargado vigente —si la
  tiene— con fecha de fin igual a la fecha de la baja.
- RF-7: SI la unidad que se intenta dar de baja tiene sub-unidades activas, ENTONCES EL SISTEMA
  rechaza la operación e indica cuáles son, para que se resuelva primero la reestructuración.
- RF-8: CUANDO un usuario ADMINISTRADOR o TRANSPORTES reactiva una unidad inactiva, EL SISTEMA la
  marca como activa sin restaurar la designación de encargado que se cerró al darla de baja.
- RF-9: SI la unidad que se intenta reactivar depende de una unidad superior inactiva, ENTONCES EL
  SISTEMA rechaza la operación e indica que primero debe reactivarse la unidad superior.
- RF-10: CUANDO un usuario autenticado consulta el listado de unidades, EL SISTEMA lo muestra
  paginado con el encargado vigente de cada una, y permite filtrarlo por estado (activa o
  inactiva), tipo, unidad superior y texto libre (código, nombre, ubicación).
- RF-11: CUANDO un usuario autenticado abre la ficha de una unidad, EL SISTEMA muestra sus datos,
  su unidad superior, sus sub-unidades directas, su encargado vigente y el historial de encargados
  ordenado de más reciente a más antiguo.
- RF-12: EL SISTEMA normaliza el código de la unidad (sin espacios sobrantes, en mayúsculas) antes
  de guardarlo o compararlo contra duplicados.

### Personal policial

- RF-13: CUANDO un usuario ADMINISTRADOR o TRANSPORTES registra personal policial indicando al
  menos cédula de identidad, nombres y apellidos, EL SISTEMA crea el registro marcado como activo,
  con el resto de los campos (complemento, grado, teléfono, correo, unidad actual) opcionales.
- RF-14: SI la combinación de cédula de identidad y complemento ya pertenece a otra persona
  registrada —esté activa o no—, ENTONCES EL SISTEMA rechaza el registro o la edición e indica que
  la cédula está duplicada.
- RF-15: CUANDO un usuario ADMINISTRADOR o TRANSPORTES edita los datos de una persona (nombres,
  apellidos, grado, teléfono, correo, unidad actual), EL SISTEMA guarda los cambios sin alterar
  ninguna designación de encargado ya registrada.
- RF-16: SI se intenta dar de baja a una persona que es encargada vigente de alguna unidad,
  ENTONCES EL SISTEMA rechaza la operación e indica de qué unidades lo es, para que se cierre
  primero esa designación.
- RF-17: CUANDO un usuario autenticado busca personal policial por cédula, nombres, apellidos o
  grado, EL SISTEMA devuelve los resultados paginados, distinguiendo a las personas activas de las
  inactivas.

### Encargados de transportes

- RF-18: CUANDO un usuario ADMINISTRADOR o TRANSPORTES designa al encargado de transportes de una
  unidad indicando unidad, persona y fecha de inicio, EL SISTEMA registra la designación como
  vigente, con el documento de referencia y las observaciones opcionales.
- RF-19: CUANDO se registra una designación en una unidad que ya tiene encargado vigente, EL
  SISTEMA cierra automáticamente la designación anterior con fecha de fin igual a la fecha de
  inicio de la nueva, de modo que la unidad nunca tenga dos encargados vigentes a la vez.
- RF-20: SI la fecha de inicio de la nueva designación es anterior a la fecha de inicio de la
  designación vigente, ENTONCES EL SISTEMA rechaza la operación: el historial se construye hacia
  adelante, no intercalando periodos hacia atrás.
- RF-21: SI la fecha de inicio de una designación es posterior a la fecha actual, ENTONCES EL
  SISTEMA rechaza la operación: «vigente» significa vigente hoy, no a futuro.
- RF-22: SI la persona que se intenta designar está inactiva, o la unidad está inactiva, ENTONCES
  EL SISTEMA rechaza la designación e indica el motivo.
- RF-23: CUANDO un usuario ADMINISTRADOR o TRANSPORTES cierra la designación vigente de una unidad
  indicando una fecha de fin, EL SISTEMA la cierra y la unidad pasa a mostrarse sin encargado, sin
  exigir un reemplazo.
- RF-24: SI la fecha de fin informada es anterior a la fecha de inicio de esa designación,
  ENTONCES EL SISTEMA rechaza la operación.
- RF-25: MIENTRAS una unidad no tenga ninguna designación vigente, EL SISTEMA la muestra como «Sin
  encargado» en listado y ficha, sin bloquear ninguna otra operación sobre ella.

### Permisos

- RF-26: SI un usuario sin rol ADMINISTRADOR ni TRANSPORTES intenta crear o editar una unidad,
  darla de baja o reactivarla, registrar o dar de baja personal, o designar o cerrar la
  designación de un encargado, ENTONCES EL SISTEMA rechaza la operación por falta de permiso.

## Requisitos no funcionales

- Toda la interfaz, los mensajes de validación y los de error están en español de Bolivia. Los
  textos se dirigen al usuario de forma impersonal o de usted; no se usa voseo («registrá»,
  «hacé», «vos»).
- Las fechas se muestran en formato boliviano `dd/mm/aaaa`, y con nombres de mes y día en español
  cuando se muestran en formato largo. Este módulo no maneja importes.
- El historial de encargados es de solo escritura desde la aplicación en cuanto a periodos
  cerrados: una designación ya cerrada no se edita ni se borra; corregir un error se hace
  registrando una designación nueva.
- El encargado vigente de una unidad nunca se guarda como un campo mutable de la unidad: siempre
  se deriva de la designación sin fecha de fin, para que no puedan desincronizarse.
- La base de datos es la única fuente de verdad de la unicidad del código de unidad, de la cédula
  de identidad del personal y de que exista a lo sumo un encargado vigente por unidad (garantizada
  a nivel de esquema con índices únicos parciales, no solo con validación en la aplicación).
- La jerarquía de unidades se consulta con frecuencia (filtros por dependencia superior); el
  listado debe resolverse sin recorrer el árbol una vez por fila.

## Casos límite

- Dos unidades sin código no se consideran duplicadas entre sí: la unicidad del código sólo aplica
  cuando el dato está presente.
- Códigos con distinta escritura (`epi-3`, `EPI 3 `, `Epi-3`) se normalizan antes de comparar,
  para no permitir duplicados disfrazados.
- Una unidad sin unidad superior es válida y esperada: el Comando Departamental no cuelga de
  nadie.
- Mover una unidad para que dependa de una descendiente suya —no solo de sí misma— debe
  rechazarse: el ciclo puede ser indirecto y a varios niveles de profundidad.
- Una persona registrada con complemento vacío y otra sin complemento son la misma persona a
  efectos de unicidad de cédula: el complemento ausente y el complemento en blanco no se
  distinguen.
- Una misma persona puede ser encargada de dos unidades al mismo tiempo (unidades pequeñas que
  comparten responsable): se permite, la unicidad es por unidad, no por persona.
- Designar dos veces consecutivas a la misma persona en la misma unidad (renovación de la
  designación) debe permitirse: no es un duplicado, es un periodo nuevo que cierra al anterior.
- Registrar una designación con fecha de inicio igual a la fecha de inicio de la vigente debe
  permitirse: el día del acta de entrega es el mismo para quien sale y para quien entra.
- Editar el nombre o la ubicación de una unidad inactiva debe seguir permitido: dar de baja no
  congela la corrección de datos mal cargados.
- Buscar con el campo de texto vacío debe devolver el listado completo (paginado), no un error ni
  una lista vacía.
- Una unidad recién creada no tiene encargado y debe poder usarse igual desde el resto del sistema
  como destino de vehículos, personal o recorridos.

## Fuera de alcance

- Asignación de vehículos a unidades: es el módulo de Asignaciones, que consumirá este catálogo.
  Este spec sólo entrega las unidades sobre las que ese módulo va a operar.
- Licencia de conducir, categoría, vencimiento y asignación de conductores a vehículos: módulo de
  Conductores. Aquí el personal policial se registra sólo con los datos necesarios para
  identificarlo y designarlo como encargado.
- Traslado de personal entre unidades como proceso con acta y periodo de vigencia: aquí la unidad
  de una persona es un dato editable, sin historial propio.
- Usuarios del sistema, contraseñas, roles y el vínculo entre un usuario y su ficha de personal:
  este spec asume que los roles ya existen y sólo los consume.
- Encargados de áreas distintas de transportes (logística, almacén, etc.).
- Archivos adjuntos de las actas o memorandos de designación: sólo se guarda el número o
  referencia del documento como texto.
- Importación masiva de unidades o de personal desde planillas.
- Auditoría de quién cambió qué en una unidad: módulo transversal aparte.
- Reportes, exportación a PDF/Excel y dashboard de indicadores por unidad.

## Nomenclatura (interfaz en español ↔ código en inglés)

La interfaz, los mensajes y esta especificación están en español; el esquema, los identificadores
y la estructura de carpetas van en inglés. Este es el mapeo de este módulo, para que la
implementación no lo invente dos veces:

| Español (SQL tentativo / interfaz) | Inglés (esquema y código) |
| --- | --- |
| `unidad` | `Unit` / tabla `unit` |
| `id_unidad_superior` | `parentId` |
| `codigo`, `nombre`, `tipo`, `ubicacion` | `code`, `name`, `type`, `location` |
| `personal_policial` | `Officer` / tabla `officer` |
| `ci`, `complemento` | `ci`, `ciComplement` |
| `nombres`, `apellidos`, `grado` | `firstName`, `lastName`, `rank` |
| `id_unidad_actual` | `currentUnitId` |
| `encargado_transportes_unidad` | `TransportManagerAssignment` / tabla `transport_manager_assignment` |
| `fecha_inicio`, `fecha_fin` | `startDate`, `endDate` |
| `documento_referencia` | `referenceDocument` |
| `observaciones` | `notes` |
| `activo` | `isActive` |
| `creado_en`, `actualizado_en` | `createdAt`, `updatedAt` |

Etiquetas de interfaz: «Unidad», «Unidad superior», «Encargado de transportes», «Sin encargado»,
«Vigente», «Histórica».

## Criterios de finalización

- Los 26 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual del flujo principal: crear una unidad raíz → crear una sub-unidad que dependa de
  ella → registrar personal policial → designar un encargado de transportes → verlo como vigente
  en el listado y en la ficha → designar un encargado nuevo y comprobar que el anterior quedó
  cerrado con la fecha correcta en el historial → cerrar la designación vigente y ver la unidad
  como «Sin encargado» → dar de baja la sub-unidad → comprobar que la unidad raíz no se deja dar
  de baja mientras tenga sub-unidades activas → reactivar la sub-unidad.
- Un usuario sin rol ADMINISTRADOR/TRANSPORTES puede listar unidades y ver cualquier ficha con su
  historial de encargados, pero recibe un error claro al intentar crear, editar, dar de baja o
  designar.

## Dudas abiertas

- [NECESITA ACLARACIÓN] Cuando exista el módulo de Asignaciones, ¿dar de baja una unidad con
  vehículos asignados vigentes debe rechazarse, o se permite y esos vehículos quedan sin unidad
  hasta que se los reasigne?
- [NECESITA ACLARACIÓN] ¿El catálogo de unidades debe ser exclusivo del ADMINISTRADOR —por ser
  estructura institucional— o TRANSPORTES también puede crear y editar unidades, como se asume en
  este spec?
- [NECESITA ACLARACIÓN] ¿Se debe impedir que una misma persona sea encargada de varias unidades a
  la vez, o la situación es real y hay que permitirla (como se asume aquí)?
- [NECESITA ACLARACIÓN] El «tipo» de unidad, ¿es texto libre o una lista cerrada? Si es cerrada,
  ¿cuáles son los valores válidos (operativa, administrativa, distrital…)?
- [NECESITA ACLARACIÓN] Si una unidad se reestructura y pasa a depender de otra unidad superior,
  ¿hace falta conservar el historial de a quién colgaba antes, o basta con el valor actual?
