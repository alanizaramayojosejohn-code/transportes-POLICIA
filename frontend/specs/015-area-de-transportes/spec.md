# Spec 015 — Área de Transportes: personal administrativo, alcance por unidad y cuentas

> Continúa el spec 004 (usuarios y roles) y el spec 002 (unidades y encargados). El spec 004 dejó
> `CreateUserInput.personnelId` como vínculo de sólo escritura (nunca se leía desde `type User`, y
> ninguna pantalla lo usaba) y forzaba `isAdmin = true` en toda cuenta vinculada, sin distinguir el
> rol operativo real. Este spec cierra ambos huecos: agrega la sección de administración donde ese
> vínculo se usa por primera vez desde la interfaz, corrige qué bandera enciende según el rol de la
> cuenta, y acota el rol `TRANSPORTES` a las unidades donde la persona es encargada de transportes
> vigente — hasta ahora era un permiso global, igual que `ADMINISTRADOR`.

## Contexto y objetivo

El spec 004 administra cuentas de forma genérica: cualquier `ADMINISTRADOR` crea un usuario con un
rol de una lista cerrada. Falta el paso intermedio que la operación real necesita: antes de tener
una cuenta, el personal administrativo central (quien administra combustible, inventario, o el
sistema en general) es una persona con nombre, CI y grado, igual que un conductor o un encargado de
unidad. Hoy esa ficha (`Personnel.isAdmin`) y la cuenta (`User`) se dan de alta por separado, sin
ninguna pantalla que las una.

Este spec agrega esa pantalla — «Área de Transportes», dentro de Administración — y, de paso,
resuelve dos cosas que quedaban sueltas para que el resto del sistema (specs 002 y 014) tenga sentido:
que vincular una cuenta marque el rol que corresponde (no siempre «administrativo»), y que el rol
`TRANSPORTES` deje de ser un permiso plano sobre todo el parque para acotarse a la unidad de la que
la persona es encargada.

## Usuarios / actores

- **ADMINISTRADOR**: único rol que entra a «Área de Transportes»; da de alta, edita y da de baja al
  personal administrativo central y su cuenta.
- **TRANSPORTES**: no entra a este módulo; es sujeto de la Fase de alcance por unidad que describe
  este spec (opera acotado a su unidad en Unidades, Vehículos, Conductores, Recorridos y Combustible).
- El resto de roles no se ve afectado por este spec salvo por la reorganización visual de Usuarios
  (RF-9 a RF-11), que es de sólo lectura para ellos igual que hoy.

## Historias de usuario

- H1: Como ADMINISTRADOR quiero dar de alta a una persona del área administrativa y su cuenta de
  acceso en un solo formulario, para no tener que ir primero a Conductores/Unidades y después a
  Usuarios.
- H2: Como ADMINISTRADOR quiero ver en «Área de Transportes» sólo al personal administrativo central
  (no conductores ni encargados de unidad), con su rol de sistema y el estado de su cuenta.
- H3: Como ADMINISTRADOR quiero seguir viendo en Usuarios la lista completa de cuentas del sistema,
  organizadas en tres grupos (administrativos, encargados, conductores), para tener una vista general
  sin perder el detalle por área.
- H4: Como usuario TRANSPORTES quiero que al entrar al sistema se me muestren sólo los vehículos,
  conductores y recorridos de la unidad de la que soy encargado, para no operar sobre unidades ajenas.
- H5: Como ADMINISTRADOR quiero que mi cuenta siga viendo y operando sobre todas las unidades, sin
  ningún acotamiento, porque mi rol es de alcance institucional.

## Requisitos funcionales (criterios de aceptación en EARS)

### Alta combinada de personal administrativo

- RF-1: CUANDO un usuario ADMINISTRADOR registra personal administrativo desde «Área de Transportes»
  indicando CI, nombres, apellidos, nombre de usuario, contraseña y rol de sistema
  (`ADMINISTRADOR`, `COMBUSTIBLE` o `ALMACEN`), EL SISTEMA crea la ficha de `Personnel`, crea la
  cuenta `User` vinculada (`Personnel.userId`), y marca `Personnel.isAdmin = true`, en una sola
  operación desde la interfaz.
- RF-2: SI el rol de sistema elegido no es `ADMINISTRADOR`, `COMBUSTIBLE` ni `ALMACEN`, ENTONCES EL
  SISTEMA rechaza la operación: los roles `TRANSPORTES` y `CONDUCTOR` se asignan desde Unidades
  (spec 002) y Conductores (spec 014) respectivamente, no desde esta pantalla.
- RF-3: EL SISTEMA aplica a esta alta las mismas validaciones que ya rigen cada mitad por separado:
  unicidad de CI (spec 002/005), unicidad de nombre de usuario y correo, longitud mínima de
  contraseña (spec 004).
- RF-4: CUANDO un usuario ADMINISTRADOR edita a una persona listada en «Área de Transportes», EL
  SISTEMA permite editar tanto los datos de la ficha como los de la cuenta (rol, contraseña) desde el
  mismo formulario.
- RF-5: CUANDO un usuario ADMINISTRADOR da de baja a una persona de «Área de Transportes», EL SISTEMA
  da de baja su cuenta (`User.isActive = false`) sin desvincularla ni borrar la ficha de personal.

### Vínculo cuenta ↔ ficha de personal

- RF-6: CUANDO se crea o edita un usuario indicando `personnelId`, EL SISTEMA marca en la ficha de
  personal la bandera que corresponde al rol de la cuenta — `isDriver` si el rol es `CONDUCTOR`,
  `isOfficer` si es `TRANSPORTES`, `isAdmin` para cualquier otro rol — sin apagar las banderas que la
  ficha ya tuviera por otros motivos.
- RF-7: EL SISTEMA expone el vínculo en ambos sentidos: la ficha de personal indica su cuenta (ya
  existía) y la consulta de usuarios indica su ficha de personal vinculada, con nombre completo, CI y
  unidad.
- RF-8: SI se intenta vincular una cuenta a una ficha de personal que ya tiene otra cuenta vinculada,
  ENTONCES EL SISTEMA rechaza la operación indicando el conflicto (la relación `Personnel.userId` es
  única desde el spec 004; este spec sólo lo hace visible en el mensaje de error).

### Reorganización visual de Usuarios

- RF-9: CUANDO un usuario ADMINISTRADOR consulta el listado de Usuarios, EL SISTEMA lo presenta en
  tres tablas — Administrativos (roles `ADMINISTRADOR`, `COMBUSTIBLE`, `ALMACEN`, `MANTENIMIENTO`,
  `CONSULTA`), Encargados (rol `TRANSPORTES`) y Conductores (rol `CONDUCTOR`) — sin cambiar los
  filtros ni las acciones que ya existían (spec 004): es una reagrupación de la misma consulta, no
  una pantalla nueva.
- RF-10: Los filtros de búsqueda, rol y estado (spec 004, RF-11) se aplican sobre las tres tablas a la
  vez: una búsqueda que sólo calza con un conductor deja las otras dos tablas vacías, no ocultas.
- RF-11: MIENTRAS una tabla no tenga resultados tras aplicar los filtros, EL SISTEMA la muestra con su
  encabezado y un mensaje de «sin resultados», no la oculta del todo: el ADMINISTRADOR debe poder ver
  siempre las tres categorías.

### Alcance por unidad del rol TRANSPORTES

- RF-12: CUANDO un usuario con rol `TRANSPORTES` consulta unidades, vehículos, personal o recorridos,
  EL SISTEMA le muestra únicamente los que pertenecen a alguna unidad donde esa persona es encargada
  de transportes vigente (`TransportManagerAssignment` sin `endDate`, spec 002).
- RF-13: SI un usuario con rol `TRANSPORTES` no es encargado vigente de ninguna unidad, ENTONCES EL
  SISTEMA le muestra listados vacíos en los módulos acotados, sin error: es un estado transitorio
  válido (p.ej., recién designado, o el encargo se cerró).
- RF-14: SI un usuario con rol `TRANSPORTES` intenta crear, editar o designar sobre una unidad,
  vehículo o persona que no pertenece a ninguna de sus unidades, ENTONCES EL SISTEMA rechaza la
  operación por falta de permiso, igual que si no tuviera rol de escritura.
- RF-15: EL SISTEMA no acota al rol `ADMINISTRADOR`: opera sobre todas las unidades sin restricción,
  igual que hoy.

## Requisitos no funcionales

- Mismo idioma, tono y formato que el resto del sistema.
- El alcance por unidad (RF-12 a RF-15) se resuelve en el backend a partir de la sesión (JWT), nunca
  confiando en un parámetro de unidad que mande el cliente: un TRANSPORTES no debe poder ver otra
  unidad cambiando un id en la petición.
- La reorganización de Usuarios (RF-9 a RF-11) es exclusivamente de presentación: la consulta GraphQL
  subyacente es la misma `users` del spec 004; el agrupado en tres tablas ocurre en el cliente.
- Esta pantalla no crea un rol nuevo de sistema: reutiliza el catálogo `Role` existente. `CONDUCTOR`
  se agrega al catálogo en el spec 014, no aquí.

## Casos límite

- Un ADMINISTRADOR dado de baja desde «Área de Transportes» sigue apareciendo en el listado (inactivo),
  igual que en Usuarios (spec 004): no hay protección especial de «último administrador».
- Editar el rol de una cuenta de `TRANSPORTES` a `ADMINISTRADOR` (o viceversa) no mueve ni cierra
  ninguna designación de encargado de unidad existente: el alcance se deriva en cada petición a partir
  del rol y las designaciones vigentes, nunca se guarda como estado aparte.
- Una ficha de personal con `isDriver`, `isOfficer` e `isAdmin` a la vez (una persona que conduce, es
  encargada de una unidad y además tiene cuenta administrativa) es válida y no se ve afectada por
  RF-6: cada vínculo de cuenta sólo enciende su propia bandera, nunca apaga las demás.
- Buscar en Usuarios con el campo de texto vacío devuelve las tres tablas completas, paginadas cada
  una por separado.

## Fuera de alcance

- Matriz fina de permisos (`Permission`/`RolePermission`): sigue fuera de alcance, como ya lo dejó el
  spec 004.
- Alcance por unidad para roles distintos de `TRANSPORTES`: `COMBUSTIBLE`, `ALMACEN` y
  `MANTENIMIENTO` siguen operando sobre todo el parque, porque no se pidió acotarlos.
- Transferir a una persona de «Área de Transportes» a un rol operativo (`TRANSPORTES`, `CONDUCTOR`)
  desde esta misma pantalla: esos roles se asignan desde sus módulos de origen (Unidades, Conductores).
- Auditoría de cambios de rol o de alcance.

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Área de Transportes | pantalla `/area-transportes`, feature `transport-office` |
| Personal administrativo | `Personnel` con `isAdmin = true` |
| Unidades a cargo (de un TRANSPORTES) | `managedUnitIds` (derivado, no columna) |
| Administrativos / Encargados / Conductores | agrupación visual de `users-list` por `Role.code` |

Etiquetas de interfaz: «Área de Transportes», «Personal administrativo», «Administrativos»,
«Encargados», «Conductores», «Sin resultados».

## Criterios de finalización

- Los 15 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual: crear personal administrativo con rol Combustible desde «Área de Transportes» → verlo
  en Usuarios, tabla «Administrativos» → designar a alguien encargado de una unidad y crearle su
  cuenta `TRANSPORTES` → entrar con esa cuenta y comprobar que Unidades, Vehículos y Conductores
  muestran sólo su unidad → intentar abrir/editar una unidad ajena y ver el rechazo → entrar como
  ADMINISTRADOR y comprobar que sigue viendo todo sin acotamiento.

## Dudas abiertas

- [NECESITA ACLARACIÓN] Si a una persona se le cierran todas sus designaciones de encargado de unidad
  pero su cuenta sigue con rol `TRANSPORTES`, ¿debe el sistema avisarle a un ADMINISTRADOR que hay una
  cuenta `TRANSPORTES` sin unidad a cargo (RF-13 la deja en listados vacíos, sin alerta)? Se asume que
  no por ahora.
- [NECESITA ACLARACIÓN] ¿Un usuario `TRANSPORTES` de una unidad debe poder ver (aunque no editar) las
  sub-unidades de la suya, o el acotamiento es estrictamente a la unidad exacta donde es encargado?
  Se asume estrictamente la unidad exacta, sin heredar hacia las sub-unidades.
