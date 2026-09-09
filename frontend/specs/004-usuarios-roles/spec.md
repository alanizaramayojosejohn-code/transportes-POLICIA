# Spec 004 — Usuarios y roles

> Alineado con `base_datos_transportes_postgresql_final.sql` (sección 2: `usuario`, `rol`) y con
> los modelos `User`/`Role` que ya viven en `schema.prisma` desde la migración inicial. El SQL
> tentativo modela `usuario_rol` como muchos-a-muchos y liga `usuario` a `personal_policial`; el
> esquema real (fuente de verdad, según la constitución) ya decidió lo contrario: un usuario tiene
> **un solo rol** (`User.roleId`) y no hay vínculo con `Officer` todavía. Este spec continúa el
> esquema real, no el SQL tentativo. Cierra el hueco que los specs 002 y 003 dejaron abierto a
> propósito: «usuarios del sistema, contraseñas, roles… este spec asume que los roles ya existen y
> sólo los consume» (spec 002, fuera de alcance).

## Contexto y objetivo

El sistema hoy no tiene cuentas reales: el selector de rol del topbar (`CurrentRoleService`) es una
simulación temporal que manda el rol activo por el header `x-user-role`, sin usuario ni contraseña
detrás. La propuesta de desarrollo (RF-14, «Seguridad y Gestión de Usuarios») pide que el sistema
administre el acceso mediante credenciales y asigne permisos basados en roles. Esta funcionalidad
es esa administración: de cuentas de usuario y del rol que cada una tiene, para que el
ADMINISTRADOR pueda dar de alta a quien va a operar el sistema desde el módulo que le corresponda.

No se toca todavía el login ni la emisión de sesiones: `JWT_SECRET` y compañía ya están reservados
en la configuración del proyecto, pero autenticarse con esas credenciales es un spec aparte. Este
módulo entrega la administración de cuentas; el reemplazo del selector simulado por sesión real
queda para cuando exista ese spec.

## Usuarios / actores

- **ADMINISTRADOR**: único rol que puede consultar, crear, editar, dar de baja y reactivar
  usuarios, y asignarles o cambiarles el rol.
- Ningún otro rol interactúa con este módulo: a diferencia de vehículos o unidades, la
  administración de cuentas no tiene una vista de «solo consulta» para el resto de los roles.

### Alcance de roles

Este spec crea únicamente los **3 roles pedidos**: `ADMINISTRADOR`, `COMBUSTIBLE` y `ALMACEN`
(«Almacén» es el nombre que ya usa el resto del sistema —catálogo de roles de
`base_datos_transportes_postgresql_final.sql` y `CurrentRoleService`— para el concepto que se
pidió como «inventario»; se reutiliza ese código para no duplicar el mismo rol con dos nombres).
Los códigos `TRANSPORTES`, `MANTENIMIENTO` y `CONSULTA`, que ya aparecen en el selector simulado
del topbar, **no** se crean como filas de `Role` aquí: no fueron pedidos, y agregarlos es una
decisión de alcance de quien pida esos módulos.

## Historias de usuario

- H1: Como ADMINISTRADOR quiero crear un usuario con nombre de usuario, contraseña, nombre
  completo y rol, para darle acceso a la persona que va a operar ese módulo.
- H2: Como ADMINISTRADOR quiero editar los datos de un usuario (nombre completo, correo, grado,
  teléfono, rol) sin verme obligado a cambiar su contraseña.
- H3: Como ADMINISTRADOR quiero cambiar la contraseña de un usuario cuando la olvidó o como parte
  de la edición, sin tener que recrear la cuenta.
- H4: Como ADMINISTRADOR quiero dar de baja a un usuario que ya no debe tener acceso, sin perder
  su registro para trazabilidad futura.
- H5: Como ADMINISTRADOR quiero reactivar a un usuario dado de baja por error, sin tener que
  recrear la cuenta ni perder su rol.
- H6: Como ADMINISTRADOR quiero listar y buscar usuarios por nombre de usuario, nombre completo o
  rol, y filtrar por estado, para encontrar rápido la cuenta que necesito.
- H7: Como ADMINISTRADOR quiero elegir el rol de un usuario desde una lista cerrada (los roles ya
  existentes), para no escribirlo a mano ni equivocarme de código.

## Requisitos funcionales (criterios de aceptación en EARS)

### Creación

- RF-1: CUANDO un usuario ADMINISTRADOR crea una cuenta indicando nombre de usuario, contraseña,
  nombre completo y rol, EL SISTEMA la crea activa, guardando la contraseña únicamente como hash
  (nunca en texto plano ni en registros de error), con correo, grado y teléfono opcionales.
- RF-2: SI el registro no incluye nombre de usuario, contraseña, nombre completo o rol, ENTONCES
  EL SISTEMA rechaza la operación y señala el campo faltante.
- RF-3: EL SISTEMA normaliza el nombre de usuario a minúsculas y sin espacios sobrantes antes de
  guardarlo o compararlo, de modo que `Jperez` y `jperez ` sean la misma cuenta.
- RF-4: SI el nombre de usuario ya pertenece a otra cuenta (comparación normalizada) o el correo
  informado ya está en uso, ENTONCES EL SISTEMA rechaza el registro e indica el campo duplicado.
- RF-5: SI la contraseña indicada tiene menos de 8 caracteres, ENTONCES EL SISTEMA rechaza la
  operación.
- RF-6: SI el rol indicado no corresponde a ninguno de los roles existentes, ENTONCES EL SISTEMA
  rechaza la operación.

### Edición

- RF-7: CUANDO un usuario ADMINISTRADOR edita el nombre de usuario, nombre completo, correo,
  grado, teléfono o rol de una cuenta, EL SISTEMA guarda los cambios sin alterar la contraseña
  vigente, sujeto a las mismas validaciones de unicidad (RF-4) y de rol (RF-6) que la creación.
- RF-8: CUANDO la edición incluye una contraseña nueva, EL SISTEMA la valida (RF-5) y reemplaza el
  hash guardado; si no se incluye, la contraseña actual no se modifica.

### Baja y reactivación

- RF-9: CUANDO un usuario ADMINISTRADOR da de baja una cuenta, EL SISTEMA la marca inactiva sin
  borrar el registro ni su historial.
- RF-10: CUANDO un usuario ADMINISTRADOR reactiva una cuenta inactiva, EL SISTEMA la marca activa
  de nuevo, conservando su rol y su contraseña sin cambios.

### Consulta

- RF-11: CUANDO un usuario ADMINISTRADOR consulta el listado de usuarios, EL SISTEMA lo muestra
  paginado con nombre de usuario, nombre completo, rol, estado y último acceso, y permite
  filtrarlo por rol, por estado (activo o inactivo) y por texto libre (nombre de usuario, nombre
  completo, correo).
- RF-12: EL SISTEMA no expone la contraseña ni su hash en ninguna consulta, listado o ficha.
- RF-13: CUANDO un usuario ADMINISTRADOR abre el formulario de alta o edición, EL SISTEMA le ofrece
  los roles existentes como lista cerrada, no como texto libre.

### Permisos

- RF-14: SI un usuario sin rol ADMINISTRADOR intenta consultar, crear, editar, dar de baja o
  reactivar un usuario, ENTONCES EL SISTEMA rechaza la operación por falta de permiso.

## Requisitos no funcionales

- Toda la interfaz, los mensajes de validación y los de error están en español de Bolivia. Los
  textos se dirigen al usuario de forma impersonal o de usted; no se usa voseo.
- Las contraseñas se almacenan únicamente como hash Argon2 (ya es dependencia del backend); en
  ningún momento se guardan ni se registran en texto plano.
- La igualdad de nombre de usuario no distingue mayúsculas de minúsculas ni espacios sobrantes.
- Este módulo no implementa login ni emisión de JWT: las variables `JWT_*` quedan reservadas para
  un spec de autenticación aparte. El control de acceso sigue viajando por el header simulado
  `x-user-role` (`RolesGuard`), igual que en vehículos, unidades y asignaciones.
- Este spec no gestiona la matriz fina de permisos (`Permission` / `RolePermission`) ni el
  registro de auditoría (`AuditLog`): esos modelos ya existen en el esquema pero su llenado es
  transversal a todos los módulos y queda para un módulo aparte.
- Sólo se siembran los 3 roles pedidos (`ADMINISTRADOR`, `COMBUSTIBLE`, `ALMACEN`); no se crean
  `TRANSPORTES`, `MANTENIMIENTO` ni `CONSULTA` como filas de `Role` en este spec.

## Casos límite

- Un nombre de usuario con espacios al inicio o al final se recorta antes de comparar o guardar.
- Dar de baja al único usuario ADMINISTRADOR activo se permite igual: no hay una validación de
  «último administrador» (ver dudas abiertas).
- Cambiar el rol de un usuario no afecta ninguna sesión simulada activa, porque no existe sesión
  real todavía: el efecto se nota la próxima vez que alguien elija ese rol en el selector.
- Reactivar una cuenta conserva el rol y la contraseña que tenía al darla de baja, sin pedirlos de
  nuevo.
- Buscar con el campo de texto vacío devuelve el listado completo paginado, no un error ni una
  lista vacía.
- Crear dos cuentas con el mismo correo, aun con nombres de usuario distintos, se rechaza (RF-4):
  el correo es tan único como el nombre de usuario cuando está presente.

## Fuera de alcance

- Login real, emisión y verificación de JWT, y el reemplazo del selector de rol simulado por una
  sesión real.
- Matriz fina de permisos (`Permission` / `RolePermission`): el rol por sí solo es lo que se
  administra aquí.
- Vínculo entre un usuario y su ficha de personal policial (`Officer`): el esquema no lo modela
  todavía, igual que lo dejó fuera el spec 002.
- Registro de auditoría (`AuditLog`) de las operaciones sobre usuarios u otros módulos.
- Recuperación de contraseña por correo, expiración de contraseña o bloqueo por intentos fallidos.
- Roles `TRANSPORTES`, `MANTENIMIENTO` y `CONSULTA` como filas de `Role`.
- Importación masiva de usuarios.

## Nomenclatura (interfaz en español ↔ código en inglés)

El esquema ya existía antes de este spec (`User`, `Role`); esta tabla documenta el mapeo para que
la implementación no lo invente dos veces.

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Nombre de usuario | `username` |
| Contraseña | `password` (entrada) → `passwordHash` (columna) |
| Nombre completo | `fullName` |
| Grado | `rank` |
| Correo | `email` |
| Teléfono | `phone` |
| Activo | `isActive` |
| Último acceso | `lastLoginAt` |
| Rol | `Role` / `roleId` |
| Código de rol, nombre de rol | `Role.code`, `Role.name` |
| `rol` código `ADMINISTRADOR` | Administrador |
| `rol` código `COMBUSTIBLE` | Combustible |
| `rol` código `ALMACEN` | Almacén (= «inventario» pedido) |

Etiquetas de interfaz: «Usuarios», «Nombre de usuario», «Nombre completo», «Rol», «Activo»,
«Inactivo», «Último acceso», «Dar de baja», «Reactivar».

## Criterios de finalización

- Los 14 RF tienen al menos un test automatizado en verde (`bun run verify` limpio en `backend` y
  `frontend`).
- Demo manual del flujo principal: crear un usuario con rol Combustible → verlo en el listado →
  intentar crear otro con el mismo nombre de usuario y ver el rechazo → editarle el rol a Almacén →
  cambiarle la contraseña → darlo de baja y verlo como inactivo → reactivarlo y comprobar que
  conserva rol y contraseña → filtrar el listado por rol y por estado.
- Un usuario sin rol ADMINISTRADOR recibe un error claro al intentar listar, crear, editar, dar de
  baja o reactivar una cuenta.

## Dudas abiertas

- [NECESITA ACLARACIÓN] ¿Debe impedirse dar de baja al último usuario ADMINISTRADOR activo, para no
  dejar el sistema sin nadie que administre cuentas? Se asume que no se impide por ahora.
- [NECESITA ACLARACIÓN] ¿El correo debe ser obligatorio para ciertos roles (por ejemplo, para
  recuperación de contraseña futura), o siempre opcional como se asume aquí?
- [NECESITA ACLARACIÓN] Cuando exista el spec de autenticación real, ¿el rol simulado del topbar
  desaparece y se reemplaza por el rol del usuario autenticado, o convive con él para pruebas?
