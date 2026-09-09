# Spec 001 — Gestión de Vehículos

> Revisión 2: alineada con `base_datos_transportes_postgresql_final.sql` y el prototipo
> `index.html` aportados por el usuario. Sustituye la revisión 1, que asumía un único campo de
> estado (Disponible/Asignado/En mantenimiento/Fuera de servicio) sin respaldo en el diseño real.

## Contexto y objetivo

El Área de Transportes del Comando Departamental de Policía de Oruro necesita un registro único
de sus vehículos, independiente de a qué unidad estén asignados o qué le esté pasando en un
momento dado (mantenimiento, un incidente). Esta funcionalidad es ese registro base: alta,
consulta y edición del vehículo, y el historial de su condición física a lo largo del tiempo. Es
el cimiento sobre el que se apoyan los módulos de Asignaciones, Mantenimiento, Combustible,
Incidentes y Documentación, que referencian un vehículo ya existente en vez de duplicar sus datos.

Un principio del diseño original se mantiene: el sistema centraliza información, pero no
reemplaza actas, firmas, hojas de ruta ni autorizaciones administrativas.

## Usuarios / actores

- **ADMINISTRADOR** y **TRANSPORTES** (rol operativo del área dueña de este módulo): registran,
  editan y registran cambios de condición de los vehículos.
- **Cualquier usuario autenticado** (incluye roles de solo consulta como CONSULTA, COMBUSTIBLE,
  MANTENIMIENTO, ALMACÉN): consulta el listado y la ficha de cualquier vehículo, sin poder
  modificarlo.

## Historias de usuario

- H1: Como usuario de Transportes quiero registrar un vehículo nuevo indicando al menos su placa
  y tipo para empezar a llevarle seguimiento, aunque todavía no tenga todos sus datos completos.
- H2: Como usuario de Transportes quiero completar o corregir los datos de un vehículo existente
  a medida que se conocen (marca, modelo, chasis, motor) sin perder lo ya registrado.
- H3: Como usuario de Transportes quiero registrar un cambio en la condición de un vehículo
  (por ejemplo, de Bueno a Deteriorado) para que quede un historial de su estado físico a lo largo
  del tiempo.
- H4: Como usuario de Transportes quiero dar de baja un vehículo que ya no forma parte del parque
  activo, y poder reactivarlo si fue un error, sin perder su historial.
- H5: Como usuario del sistema quiero buscar y filtrar el listado de vehículos por condición,
  unidad actual o texto libre para encontrar rápidamente el que necesito.
- H6: Como usuario del sistema quiero ver la ficha completa de un vehículo, incluido su historial
  de condición, para entender su situación actual y cómo llegó a ella.

## Requisitos funcionales (criterios de aceptación en EARS)

- RF-1: CUANDO un usuario ADMINISTRADOR o TRANSPORTES registra un vehículo indicando al menos
  placa y tipo de vehículo, EL SISTEMA crea el registro marcado como activo, con el resto de los
  campos (placa DNFR, marca, modelo, año, chasis, motor, color, origen, fuente de recepción)
  opcionales.
- RF-2: SI la placa o el número de chasis informados ya pertenecen a otro vehículo —esté activo o
  no—, ENTONCES EL SISTEMA rechaza el registro o la edición e indica cuál dato está duplicado.
- RF-3: SI el registro o la edición no incluye placa o tipo de vehículo, ENTONCES EL SISTEMA
  rechaza la operación y señala el campo faltante.
- RF-4: CUANDO un usuario ADMINISTRADOR o TRANSPORTES edita los datos propios de un vehículo
  (placa, marca, modelo, año, chasis, motor, color, origen, observaciones), EL SISTEMA guarda los
  cambios sin alterar su historial de condición.
- RF-5: CUANDO un usuario ADMINISTRADOR o TRANSPORTES registra un cambio de condición del
  vehículo (Bueno, Regular, Deteriorado, Fuera de uso, Inoperable, Extraviado, Devuelto o Dado de
  baja), EL SISTEMA agrega una entrada al historial de condición con la fecha, quién lo registró y
  el motivo si se indicó, y esa condición pasa a ser la vigente.
- RF-6: EL SISTEMA no permite registrar manualmente una condición de "En mantenimiento" ni
  "Separado por incidente" desde este módulo: esos valores sólo los registran los módulos de
  Mantenimiento e Incidentes respectivamente.
- RF-7: CUANDO la condición vigente de un vehículo pasa a "Dado de baja", EL SISTEMA lo marca
  como inactivo.
- RF-8: CUANDO un usuario ADMINISTRADOR o TRANSPORTES reactiva un vehículo inactivo registrando
  una condición distinta de "Dado de baja", EL SISTEMA lo marca como activo nuevamente.
- RF-9: CUANDO un usuario autenticado consulta el listado de vehículos, EL SISTEMA lo muestra
  paginado con su condición vigente, y permite filtrarlo por unidad actual, condición y texto
  libre (placa, marca, modelo, chasis).
- RF-10: CUANDO un usuario autenticado abre la ficha de un vehículo, EL SISTEMA muestra sus
  datos, su condición vigente y su historial de condición ordenado de más reciente a más antiguo.
- RF-11: SI un usuario sin rol ADMINISTRADOR ni TRANSPORTES intenta crear, editar un vehículo o
  registrar un cambio de condición, ENTONCES EL SISTEMA rechaza la operación por falta de permiso.
- RF-12: EL SISTEMA normaliza la placa a mayúsculas y sin espacios antes de guardarla o
  compararla contra duplicados.
- RF-13: MIENTRAS un vehículo no tenga ninguna entrada en su historial de condición, EL SISTEMA
  lo muestra como "Sin evaluar" en listado y ficha, sin bloquear ninguna otra operación.

## Requisitos no funcionales

- Toda la interfaz, los mensajes de validación y los de error están en español.
- El historial de condición es de solo escritura desde la aplicación: ninguna operación lo edita
  ni lo borra; corregir un error se hace agregando una entrada nueva, no modificando la anterior.
- La condición vigente de un vehículo nunca se guarda como un campo mutable: siempre se deriva de
  la entrada más reciente de su historial, para que no puedan desincronizarse.
- La base de datos es la única fuente de verdad de placa y chasis (unicidad garantizada a nivel de
  esquema, no solo de validación en la aplicación).

## Casos límite

- Dos vehículos con número de chasis vacío (sin dato) no se consideran duplicados entre sí: la
  unicidad del chasis sólo aplica cuando el dato está presente.
- La placa de un vehículo dado de baja sigue bloqueada para siempre: no puede reutilizarse en un
  registro nuevo (ver "Fuera de alcance": este spec no gestiona reasignación de placas oficiales).
- Placas con distinto formato de escritura (mayúsculas/minúsculas, con o sin guion, con espacios
  sobrantes) se normalizan antes de comparar, para no permitir duplicados disfrazados.
- Registrar un cambio de condición sin motivo debe permitirse (el motivo es recomendado, no
  obligatorio), pero el sistema no debe perder de qué usuario y en qué fecha vino el cambio.
- Reactivar un vehículo "Dado de baja" sin indicar la nueva condición debe rechazarse: no hay
  reactivación sin saber en qué condición vuelve el vehículo.
- Buscar con el campo de texto vacío debe devolver el listado completo (paginado), no un error ni
  una lista vacía.
- Un año de fabricación fuera de un rango razonable (antes de 1900 o después de 2200) debe
  rechazarse en el registro o la edición.
- Editar los datos descriptivos (marca, modelo, color, observaciones) de un vehículo inactivo
  (dado de baja) debe seguir permitido: dar de baja no debe congelar la corrección de datos mal
  cargados.

## Fuera de alcance

- Generación de código QR (ni el identificador ni la imagen): la base de datos ya reserva una
  columna para esto, pero no se implementa en este spec.
- Asignación de un vehículo a una unidad ("unidad actual"): es un módulo aparte (Asignaciones) que
  consumirá vehículos ya existentes; este spec sólo permite *ver* la unidad actual en listado y
  ficha como dato de solo lectura que ese otro módulo produce.
- Asignación de conductores a vehículos: módulo aparte.
- Documentación / expediente digital del vehículo: módulo aparte, sobre una tabla de documentos
  genérica compartida con otros módulos.
- Recepción e incorporación institucional de vehículos nuevos (verificación, conformidad,
  asentamiento con una entidad proveedora externa): proceso aparte; este spec asume que un
  vehículo puede registrarse directamente sin pasar por ese flujo formal.
- Registrar condición "En mantenimiento" o "Separado por incidente": las producen los módulos de
  Mantenimiento e Incidentes, no este.
- Subida de fotos del vehículo.
- Autenticación, login y administración de usuarios/roles en sí: este spec asume que esos roles
  ya existen y sólo los consume.
- Reportes, exportación a PDF/Excel y dashboard de indicadores.
- Interfaz móvil / PWA de campo.

## Criterios de finalización

- Los 13 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend`
  y `frontend`).
- Demo manual del flujo principal: registrar un vehículo con solo placa y tipo → aparece en el
  listado como "Sin evaluar" → completar sus datos opcionales → registrar un cambio de condición →
  verlo reflejado como condición vigente y en el historial de la ficha → dar de baja (condición
  "Dado de baja") → reactivar registrando una nueva condición.
- Un usuario sin rol ADMINISTRADOR/TRANSPORTES puede listar y ver la ficha de cualquier vehículo,
  pero recibe un error claro al intentar crear, editar o registrar un cambio de condición.

## Dudas abiertas

- [NECESITA ACLARACIÓN] ¿Las condiciones "Extraviado" y "Devuelto" también deben marcar el
  vehículo como inactivo automáticamente (igual que "Dado de baja"), o sólo "Dado de baja" lo
  hace?
- [NECESITA ACLARACIÓN] ¿Se puede editar la placa o el chasis de un vehículo después del registro
  inicial, o esos datos identificatorios quedan fijos una vez creado el vehículo?
- [NECESITA ACLARACIÓN] Si dos usuarios editan el mismo vehículo al mismo tiempo, ¿gana la
  última escritura sin aviso, o el sistema debe detectar el conflicto y avisar?
- [NECESITA ACLARACIÓN] ¿Un vehículo sin ninguna entrada de historial de condición ("Sin
  evaluar") puede de todas formas asignarse a una unidad, o el módulo de Asignaciones exigirá al
  menos una condición registrada primero?
