# Spec 013 — Autenticación y redirección por roles

> Continúa `004-usuarios-roles`, que administra cuentas (`User`/`Role`) pero
> dejó el login fuera a propósito: «Este módulo no implementa login ni
> emisión de JWT: las variables `JWT_*` quedan reservadas para un spec de
> autenticación aparte». Este es ese spec: reemplaza el mecanismo simulado
> —selector de rol en el topbar (`CurrentRoleService`) + header
> `x-user-role`, confiado sin verificar por `RolesGuard`— por sesión real con
> usuario, contraseña y JWT.

## Contexto y objetivo

La propuesta de desarrollo (RF-14, «Seguridad y Gestión de Usuarios») pide que
el sistema administre el acceso mediante credenciales y asigne permisos según
el rol. Spec 004 ya entrega el lado administrativo (altas, bajas, roles) pero
no toca cómo alguien entra al sistema. Hoy no hay nada que lo impida: el rol
activo se elige a mano en un `<select>` del topbar, se guarda en
`localStorage` y viaja como header `x-user-role` en cada petición GraphQL; el
backend lo confía tal cual. Las consultas de lectura ni siquiera piden ese
header — cualquiera que sepa la URL del API puede leer todo sin credenciales.

Este spec cierra ese hueco: login con usuario y contraseña contra las cuentas
que ya administra spec 004, un JWT de acceso que reemplaza al header
simulado, autenticación obligatoria en toda la API (lectura incluida), y
redirección en el frontend tanto para quien no tiene sesión como para quien
la tiene pero no el rol necesario para la sección que pidió.

## Usuarios / actores

- Cualquier cuenta activa sembrada o creada vía spec 004 (ADMINISTRADOR,
  TRANSPORTES, COMBUSTIBLE, MANTENIMIENTO, ALMACEN, CONSULTA) puede loguearse
  con su usuario y contraseña.
- Una cuenta dada de baja (`isActive = false`) no puede iniciar sesión aunque
  la contraseña sea correcta.

## Historias de usuario

- H1: Como usuario del sistema quiero loguearme con mi nombre de usuario y
  contraseña, para operar el módulo que me corresponde según mi rol.
- H2: Como usuario logueado quiero que si intento entrar a una sección sin
  permiso para mi rol, el sistema me redirija en vez de dejarme ver un error.
- H3: Como usuario no logueado quiero que si intento abrir cualquier URL del
  sistema, me mande a la pantalla de login y, tras loguearme, me lleve a la
  página que había pedido.
- H4: Como usuario logueado quiero poder cerrar sesión explícitamente.
- H5: Como usuario logueado quiero que recargar la página (F5) no me saque de
  la sesión mientras mi token siga vigente.

## Requisitos funcionales (criterios de aceptación en EARS)

### Login

- RF-1: CUANDO alguien envía un nombre de usuario y contraseña de una cuenta
  activa que coincide con el hash guardado, EL SISTEMA emite un token de
  acceso (JWT) y actualiza el último acceso (`lastLoginAt`) de esa cuenta.
- RF-2: SI el usuario no existe, la contraseña no coincide, o la cuenta está
  inactiva, ENTONCES EL SISTEMA rechaza el login con un mensaje genérico
  («Usuario o contraseña incorrectos»), sin indicar cuál de las tres
  condiciones falló.
- RF-3: EL SISTEMA normaliza el nombre de usuario recibido en el login
  (minúsculas, sin espacios sobrantes) antes de compararlo, con el mismo
  criterio que el alta de cuentas (spec 004, RF-3).
- RF-4: El token de acceso emitido expira a las 8 horas (`JWT_EXPIRES_IN`);
  pasado ese tiempo el sistema deja de aceptarlo.

### Autorización de la API

- RF-5: CUANDO una consulta o mutación GraphQL no incluye un token de acceso
  válido, ENTONCES EL SISTEMA la rechaza como no autenticada — incluidas las
  consultas de sólo lectura, que hasta ahora no pedían ninguna credencial.
- RF-6: La mutación de login es la única operación de la API que no exige
  token.
- RF-7: Las mutaciones que ya exigían un rol específico (spec 004 RF-14, y
  las de vehículos, unidades, asignaciones, etc.) siguen exigiendo ese mismo
  rol, ahora leído del usuario autenticado en vez del header simulado
  `x-user-role`.
- RF-8: Los registros que hasta ahora se atribuían al «primer usuario activo
  con el rol simulado» (recorridos, combustible, mantenimiento, inventario,
  incidentes) pasan a atribuirse al usuario realmente autenticado que hizo la
  operación.

### Sesión y redirección (frontend)

- RF-9: CUANDO alguien sin sesión intenta abrir cualquier URL del sistema
  (salvo `/login`), EL SISTEMA lo redirige a `/login`, recordando la URL
  solicitada para volver a ella después de loguearse.
- RF-10: CUANDO alguien con sesión activa pero sin el rol requerido intenta
  abrir una URL restringida por rol (por ejemplo `/usuarios`, exclusiva de
  ADMINISTRADOR), EL SISTEMA lo redirige a la página de inicio en vez de
  mostrarle esa sección.
- RF-11: CUANDO el login es exitoso, EL SISTEMA redirige a la URL que se
  había solicitado originalmente (RF-9) o, si no había ninguna, a la página
  de inicio.
- RF-12: EL SISTEMA conserva la sesión (token y datos del usuario) entre
  recargas de página mientras el token no haya expirado, sin pedir loguearse
  de nuevo.
- RF-13: CUANDO el usuario cierra sesión explícitamente, EL SISTEMA descarta
  el token y los datos de sesión guardados y lo redirige a `/login`.
- RF-14: CUANDO el token expira (o el backend lo rechaza por cualquier
  motivo) durante el uso normal del sistema, EL SISTEMA cierra la sesión
  localmente y redirige a `/login`, igual que un cierre de sesión explícito.

## Requisitos no funcionales

- Interfaz, mensajes de validación y de error en español de Bolivia,
  impersonal o de usted — igual que spec 004.
- El token de acceso viaja como header `Authorization: Bearer <token>`, nunca
  como parámetro de URL ni en el cuerpo de una petición GET.
- La contraseña nunca se registra en logs ni en mensajes de error.
- El selector de rol simulado del topbar y el header `x-user-role`
  desaparecen: el rol que ve y puede usar el frontend es siempre el del
  usuario autenticado, no uno elegido a mano.

## Casos límite

- Loguearse con mayúsculas o espacios en el nombre de usuario funciona igual
  que con la forma normalizada (RF-3).
- Dar de baja a un usuario con sesión abierta no la cierra de inmediato (no
  hay revocación de tokens en este spec): sigue teniendo acceso hasta que el
  token expire o cierre sesión por su cuenta (ver Fuera de alcance).
- Cambiarle el rol a un usuario con sesión abierta no se refleja hasta su
  próximo login: el rol viaja dentro del token, no se vuelve a consultar en
  cada petición.
- Un token con formato inválido o firmado con otra clave se trata igual que
  no tener sesión (RF-9), no como un error distinto.

## Fuera de alcance

- Refresh token / renovación de sesión más allá de la expiración del token de
  acceso: al expirar, se vuelve a loguear. `JWT_REFRESH_SECRET` queda
  reservado para cuando se pida.
- Revocación de tokens al dar de baja un usuario o cambiarle el rol o la
  contraseña en caliente.
- Recuperación de contraseña por correo.
- Bloqueo de cuenta por intentos fallidos de login.
- Autenticación de dos factores.
- Registro en `AuditLog` de inicios/cierres de sesión (la acción
  `LOGIN`/`LOGOUT` ya existe en el enum, pero llenarlo es un módulo
  transversal aparte, igual que lo dejó fuera spec 004 con las demás
  operaciones).

## Nomenclatura (interfaz en español ↔ código en inglés)

| Español (interfaz) | Inglés (esquema y código) |
| --- | --- |
| Nombre de usuario | `username` |
| Contraseña | `password` |
| Iniciar sesión | `login` (mutación) |
| Cerrar sesión | `logout` (acción local del frontend, sin mutación) |
| Token de acceso | `accessToken` |
| Usuario autenticado (query) | `me` |

## Criterios de finalización

- Los 14 RF tienen al menos un test automatizado en verde (`bun run verify`
  limpio en `backend` y `frontend`).
- Demo manual: loguearse como `admin`/`Temporal2026` → ver «Usuarios» en el
  nav; loguearse como `combustible.01`/`Temporal2026` → no ver «Usuarios» y
  que navegar a `/usuarios` a mano redirija a inicio; sin sesión, navegar a
  `/vehiculos` a mano redirige a `/login` y vuelve a `/vehiculos` tras
  loguearse; recargar la página no desloguea; «Cerrar sesión» bloquea de
  nuevo las rutas.
- Una consulta o mutación GraphQL sin token recibe un rechazo claro de no
  autenticado.

## Dudas abiertas

- [NECESITA ACLARACIÓN] ¿Debe poder revocarse la sesión de un usuario al
  darlo de baja, o alcanza con que el token expire solo (máximo 8h)? Se
  asume que alcanza, por ahora.
- [NECESITA ACLARACIÓN] Cuando exista una matriz fina de permisos
  (`Permission`/`RolePermission`, fuera de alcance de spec 004), ¿la
  redirección por rol de este spec se reemplaza por esa matriz o convive con
  ella?
