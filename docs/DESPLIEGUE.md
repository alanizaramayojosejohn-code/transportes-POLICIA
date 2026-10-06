# Guía de dimensionamiento, instalación y despliegue

Sistema de Gestión Vehicular — Comando Policial de Oruro
Última actualización: 2026-10-01

---

## Índice

1. [Qué se despliega](#1-qué-se-despliega)
2. [Qué determina el dimensionamiento en este sistema](#2-qué-determina-el-dimensionamiento-en-este-sistema)
3. [Opción A — Servidor único (app + base de datos)](#3-opción-a--servidor-único-app--base-de-datos)
4. [Opción B — Base de datos en máquina dedicada](#4-opción-b--base-de-datos-en-máquina-dedicada)
5. [Comparativa y recomendación](#5-comparativa-y-recomendación)
6. [Correcciones obligatorias antes de desplegar](#6-correcciones-obligatorias-antes-de-desplegar)
7. [Instalación — Opción A paso a paso](#7-instalación--opción-a-paso-a-paso)
8. [Instalación — Opción B paso a paso](#8-instalación--opción-b-paso-a-paso)
9. [Afinado de PostgreSQL](#9-afinado-de-postgresql)
10. [HTTPS y la PWA](#10-https-y-la-pwa)
11. [Respaldos y restauración](#11-respaldos-y-restauración)
12. [Verificación posterior al despliegue](#12-verificación-posterior-al-despliegue)
13. [Mantenimiento y actualizaciones](#13-mantenimiento-y-actualizaciones)
14. [Problemas frecuentes](#14-problemas-frecuentes)

---

## 1. Qué se despliega

Tres piezas:

| Pieza | Qué es | Dónde vive |
|---|---|---|
| **API** | NestJS 12 + Apollo GraphQL 5 + Prisma 7, corriendo sobre Bun | Puerto 3000, ruta `/graphql` |
| **Frontend** | Angular (SPA + PWA), build estático | Servido por la misma API desde `./public` vía `ServeStaticModule` |
| **Base de datos** | PostgreSQL 18 | Puerto 5432 |

El `Dockerfile` de la raíz empaqueta API y frontend en **una sola imagen**: compila el
frontend, compila el backend, y copia `frontend/dist/web/browser` a `./public` dentro de la
imagen de runtime. El contenedor arranca con `prisma migrate deploy && bun dist/main.js`,
así que **las migraciones pendientes se aplican solas en cada arranque** (es idempotente).

La base de datos **no** está en esa imagen: siempre es un servicio aparte.

### Variables de entorno de la API

Definidas en `backend/src/config/configuration.ts`, plantilla en `backend/.env.example`:

| Variable | Obligatoria | Default | Notas |
|---|---|---|---|
| `NODE_ENV` | sí | `development` | Poner `production`: controla el nivel de log de Prisma |
| `PORT` | no | `3000` | |
| `DATABASE_URL` | **sí** | — | `postgresql://usuario:clave@host:5432/transportes?schema=public` |
| `JWT_SECRET` | **sí** | vacío | Secreto largo y aleatorio |
| `JWT_EXPIRES_IN` | no | `8h` | Un turno de trabajo |
| `JWT_REFRESH_SECRET` | **sí** | vacío | Distinto de `JWT_SECRET` |
| `JWT_REFRESH_EXPIRES_IN` | no | `7d` | |
| `CORS_ORIGIN` | no | `http://localhost:4200` | Irrelevante si el frontend se sirve desde la misma API (mismo origen) |
| `GRAPHQL_PLAYGROUND` | no | `true` | **Poner `false` en producción** |

---

## 2. Qué determina el dimensionamiento en este sistema

Tres características del código mandan sobre el hardware. Conviene entenderlas antes de
comprar, porque cambian las cuentas más que el número de usuarios.

### 2.1 Las fotos de vehículos viven dentro de PostgreSQL

`VehiclePhoto.dataUrl` es un campo `@db.Text` que guarda la data URL completa en base64
(`backend/prisma/schema.prisma:677`). El navegador las optimiza antes de enviarlas —
máximo 900 px de lado, calidad JPEG 0.72 — pero base64 agrega ~37 % de sobrecosto:

| Concepto | Valor |
|---|---|
| Foto optimizada (JPEG 900 px, q 0.72) | ~80–120 KB |
| La misma foto en base64, como se almacena | ~110–165 KB |
| Slots por vehículo / por motocicleta | 7 / 5 |
| **Total por vehículo** | **~0.8–1.1 MB** |

Consecuencias: el disco crece con el padrón, y **la RAM del proceso API sube con la
concurrencia**, porque cada ficha de vehículo serializa ~1 MB de JSON en GraphQL. Es el
mayor consumidor de memoria del backend, muy por encima de cualquier otra consulta.

### 2.2 Bun ejecuta tu código en un solo hilo

Ni Node ni Bun paralelizan tu lógica entre núcleos sin configurar un cluster, y este
proyecto no lo hace. Entonces para la API **importa más la frecuencia del CPU que la
cantidad de núcleos**. Los núcleos extra sí sirven, pero para PostgreSQL, el sistema
operativo y los respaldos — no para que la API responda más rápido.

### 2.3 El rastro de auditoría crece, pero es barato

El interceptor global (`backend/src/modules/audit/audit.interceptor.ts`) registra cada
mutación con su payload en `AuditLog.after` (JSON). Lo importante para el disco: `dataUrl`
está en la lista de campos censurados (`audit-map.ts:181`), así que **ninguna foto se
duplica en la auditoría**. Cada fila pesa ~1–2 KB.

### 2.4 Proyección de crecimiento de la base

Base de cálculo: ~300–800 vehículos, ~2.000 registros de personal, 30–80 usuarios
concurrentes en pico, red LAN.

| Concepto | Tamaño |
|---|---|
| Fotos (800 vehículos) | ~1 GB, prácticamente estático una vez cargado el padrón |
| Auditoría | ~0.75–1 GB por año |
| Viajes, combustible, odómetro, movimientos de stock | ~0.5 GB por año |
| **Total a 5 años** | **~12–15 GB** (hasta ~30 GB con índices, bloat y WAL) |

Cualquier SSD moderno sobra en capacidad. Los 256–512 GB que se recomiendan abajo son
para tener holgura de respaldos locales y de sistema operativo, no por el volumen de datos.

> Si en el futuro las fotos se mueven a disco o a un bucket, la base baja a ~2–3 GB a 5 años
> y el requerimiento de RAM del backend se reduce de forma notable.

---

## 3. Opción A — Servidor único (app + base de datos)

Una máquina corre el contenedor de la API (que también sirve el frontend) y PostgreSQL.
Los usuarios entran con el navegador desde cualquier PC de la red.

```
                      ┌──────────────────────────────────┐
   PCs de usuarios    │  SERVIDOR                        │
   (sólo navegador)   │                                  │
        │             │  ┌────────────┐  ┌────────────┐  │
        └── LAN ──────┼─▶│ API + SPA  │─▶│ PostgreSQL │  │
            :80       │  │  :3000     │  │   :5432    │  │
                      │  └────────────┘  └────────────┘  │
                      └──────────────────────────────────┘
```

### Requisitos de hardware

| Recurso | Mínimo funcional | **Recomendado** | Por qué |
|---|---|---|---|
| CPU | 4 núcleos (i5 10ª gen+ / Ryzen 5 / Xeon E-23xx) | 6–8 núcleos, ≥3.0 GHz | La API es mono-hilo: prioriza frecuencia. Los núcleos extra son para PostgreSQL y respaldos |
| RAM | 8 GB | **16 GB** | Ver reparto abajo |
| Disco | SSD SATA 256 GB | **NVMe 512 GB**, RAID 1 | PostgreSQL sobre disco mecánico domina la latencia percibida más que cualquier otro factor |
| Red | Gigabit, IP fija | Gigabit | Una ficha de vehículo con fotos son ~1 MB; a 100 Mbit con varios usuarios simultáneos se nota |
| SO | Ubuntu Server 24.04 LTS o Debian 12 | ídem | Windows Server funciona, sumar 4 GB de RAM por el overhead de WSL2 |
| Energía | **UPS** | UPS + apagado automático | Un corte abrupto mientras PostgreSQL escribe es la causa más común de pérdida de datos en instalaciones on-prem |

### Reparto de los 16 GB

| Consumidor | Asignación |
|---|---|
| PostgreSQL (`shared_buffers` 2 GB + procesos por conexión) | ~4 GB |
| Proceso API (Bun) — los picos son por las fotos | 1–2 GB |
| Sistema operativo + Docker | ~2 GB |
| Caché de disco del kernel (page cache) | el resto (~8 GB) |

Ese page cache es lo que hace que las consultas se sientan instantáneas: con ~8 GB libres,
todo el conjunto de datos caliente queda en memoria.

Con 8 GB el sistema funciona, pero se nota cuando varios usuarios abren fichas de vehículo
con fotos al mismo tiempo. Es un mínimo para piloto o para menos de 20 usuarios concurrentes.

---

## 4. Opción B — Base de datos en máquina dedicada

PostgreSQL solo, en su propia máquina. Dos variantes según dónde corra la aplicación.

**B1 — Dos servidores** (recomendada si se separa):

```
   PCs de usuarios      ┌──────────────┐        ┌──────────────┐
   (sólo navegador) ───▶│ SERVIDOR APP │───────▶│ SERVIDOR BD  │
                        │  API + SPA   │  LAN   │  PostgreSQL  │
                        └──────────────┘        └──────────────┘
```

**B2 — Backend en cada máquina** (el plan original: un ejecutable por puesto):

```
   ┌─────────────────┐
   │ PC 1: API + SPA │──┐
   ├─────────────────┤  │     ┌──────────────┐
   │ PC 2: API + SPA │──┼────▶│ SERVIDOR BD  │
   ├─────────────────┤  │     │  PostgreSQL  │
   │ PC N: API + SPA │──┘     └──────────────┘
   └─────────────────┘
```

### Requisitos de la máquina de base de datos

| Recurso | Mínimo funcional | **Recomendado** | Por qué |
|---|---|---|---|
| CPU | 2 núcleos | **4 núcleos** | PostgreSQL usa un proceso por conexión; con 10–30 conexiones, 4 núcleos van cómodos |
| RAM | 4 GB | **8 GB** (16 GB si se quieren las fotos en caché) | Con 8 GB entra en caché casi todo el conjunto caliente sin las fotos, que es lo que se consulta seguido |
| Disco | SSD 128 GB | **SSD/NVMe 256 GB en RAID 1** | El RAID pesa más que el CPU acá: el padrón vehicular no debería morir con un disco |
| Red | Gigabit, **mismo switch que la app** | ídem | Crítico, ver nota abajo |
| SO | Ubuntu Server 24.04 LTS / Debian 12 | ídem | |
| Energía | **UPS** | UPS + apagado automático | |

> **La latencia de red entre app y base de datos es lo más crítico de esta opción.** Los
> reportes usan `fetchAllPages`, que recorre páginas de 100 registros en bucle, porque el
> backend limita `take` a 100. Eso multiplica los viajes de ida y vuelta. Mismo switch,
> mismo rack. Un enlace WAN entre app y base haría los reportes inusables.

### Requisitos de cada máquina en la variante B2

| Recurso | Mínimo |
|---|---|
| CPU | 4 núcleos (compartidos con el trabajo del usuario) |
| RAM | 8 GB, de los cuales ~4 GB libres para su propio backend + navegador |
| Disco | 10 GB libres (imagen/runtime + `node_modules`) |

### Advertencia sobre B2: el pool de conexiones

`backend/src/prisma/prisma.service.ts:30` crea el pool sin límite explícito:

```ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

Sin `max`, node-postgres usa su default: **10 conexiones por instancia del backend**. Con
un solo servidor no hay problema. Con un backend por máquina, 10 puestos = 100 conexiones,
y el `max_connections` por defecto de PostgreSQL es exactamente 100 — se agota el margen
justo cuando entra el décimo puesto, y el undécimo recibe
`FATAL: sorry, too many clients already`.

Si se elige B2 hay que hacer **las dos cosas**:

```ts
// backend/src/prisma/prisma.service.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});
```

y subir `max_connections` a 150 en la base (ver [sección 9](#9-afinado-de-postgresql)).

---

## 5. Comparativa y recomendación

| | **A: servidor único** | **B1: dos servidores** | **B2: backend por puesto** |
|---|---|---|---|
| Máquinas a mantener | 1 | 2 | 1 + N puestos |
| Instalación en los puestos | ninguna (navegador) | ninguna (navegador) | ejecutable + servicio en cada uno |
| Secretos JWT a rotar | 1 juego | 1 juego | N juegos |
| Actualizar la aplicación | 1 despliegue | 1 despliegue | N despliegues coordinados |
| Riesgo de migraciones | nulo | nulo | **alto**: N instancias arrancando `migrate deploy` a la vez |
| Tolerancia a caída de red | ninguna | ninguna | **ninguna tampoco** (la base sigue siendo central) |
| Costo de hardware | 1 máquina de 16 GB | 2 máquinas | 1 máquina + RAM extra en cada puesto |

**Recomendación: Opción A.**

El frontend es una SPA estática: cualquier navegador de la red la descarga de un solo
servidor. Poner un backend en cada puesto multiplica el mantenimiento sin ganar nada —
no da tolerancia a fallos, porque la base de datos sigue siendo un punto central, y la
red tiene que estar arriba igual. La Opción A es además la que el `Dockerfile` ya soporta
sin cambios de arquitectura.

**Cuándo tiene sentido B1:** cuando ya existe un servidor de base de datos institucional
con respaldos y monitoreo, o cuando se quiere poder reiniciar la aplicación sin tocar la
base. Es una topología correcta y vale el segundo equipo si hay política de separar roles.

**Cuándo tiene sentido B2:** prácticamente nunca para este sistema. Si no se quiere
mantener un servidor, es mejor un servidor único mínimo (Opción A con 8 GB) que N backends.

---

## 6. Correcciones obligatorias antes de desplegar

Son tres problemas reales del código actual. Sin estos cambios el despliegue falla o
funciona sólo desde el propio servidor.

### 6.1 El build de producción no usa `environment.production.ts`

`frontend/angular.json` **no tiene `fileReplacements`** en la configuración de producción.
Como `defaultConfiguration` es `production`, `bun run build` compila con
`environment.ts`, que apunta a `http://localhost:3000/graphql`. Resultado: la aplicación
funciona desde el navegador del propio servidor y falla desde cualquier otra PC de la red,
porque `localhost` resuelve a la máquina del usuario.

En `frontend/angular.json`, agregar `fileReplacements` dentro de
`projects.web.architect.build.configurations.production`:

```json
"production": {
  "budgets": [
    { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
    { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
  ],
  "outputHashing": "all",
  "serviceWorker": "ngsw-config.json",
  "fileReplacements": [
    {
      "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.production.ts"
    }
  ]
}
```

### 6.2 La ruta de GraphQL de producción no existe

`frontend/src/environments/environment.production.ts` apunta a `/api/graphql`, pero el
backend sirve GraphQL en `/graphql`: `main.ts` no define prefijo global y el
`GraphQLModule` de `app.module.ts` no sobrescribe `path`. Con la corrección 6.1 aplicada y
este archivo sin tocar, **todas las consultas darían 404**.

Corregir `frontend/src/environments/environment.production.ts`:

```ts
export const environment = {
  production: true,
  graphqlUri: '/graphql',
};
```

Una URI relativa es lo correcto acá: el frontend se sirve desde la misma API, así que todo
queda en el mismo origen y `CORS_ORIGIN` deja de importar.

### 6.3 El seed no puede correr dentro del contenedor

`backend/prisma/seed.ts` importa `../src/generated/prisma/client.js`, pero la etapa de
runtime del `Dockerfile` copia sólo `dist`, `prisma`, `node_modules` y `package.json` — no
`src/`. La aplicación funciona (usa `dist/generated/`), pero
`docker compose exec api bun run prisma:seed` falla con módulo no encontrado, y el seed es
lo que crea los roles y los usuarios iniciales.

En el `Dockerfile`, agregar una línea en la etapa `runtime`, después de la copia de `dist`:

```dockerfile
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/src/generated ./src/generated
COPY --from=backend-build /app/backend/prisma ./prisma
```

> Alternativa sin tocar la imagen: correr el seed desde una máquina de desarrollo con
> `DATABASE_URL` apuntando al servidor. Funciona, pero deja el primer arranque dependiendo
> de un equipo externo; es preferible la corrección.

### 6.4 Sólo para B2: límite del pool

Ver [sección 4](#advertencia-sobre-b2-el-pool-de-conexiones).

---

## 7. Instalación — Opción A paso a paso

Sobre Ubuntu Server 24.04 LTS. Los comandos van como usuario con `sudo`.

### Paso 1 — Preparar el sistema operativo

```bash
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone America/La_Paz
sudo hostnamectl set-hostname transportes-srv
```

Fijar IP estática (ajustar interfaz, direcciones y DNS a la red real):

```bash
sudo tee /etc/netplan/01-static.yaml > /dev/null <<'EOF'
network:
  version: 2
  ethernets:
    enp1s0:
      dhcp4: no
      addresses: [192.168.1.10/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [192.168.1.1, 8.8.8.8]
EOF
sudo chmod 600 /etc/netplan/01-static.yaml
sudo netplan apply
```

Cortafuegos: sólo SSH y HTTP desde la red interna.

```bash
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp
sudo ufw allow from 192.168.1.0/24 to any port 80 proto tcp
sudo ufw --force enable
sudo ufw status verbose
```

### Paso 2 — Instalar Docker Engine

```bash
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
docker --version && docker compose version
```

### Paso 3 — Copiar el código al servidor

Desde la máquina de desarrollo, o clonando en el servidor:

```bash
sudo mkdir -p /opt/transportes
sudo chown $USER:$USER /opt/transportes
git clone <url-del-repositorio> /opt/transportes
cd /opt/transportes
```

Aplicar las [correcciones de la sección 6](#6-correcciones-obligatorias-antes-de-desplegar)
si todavía no están en la rama que se desplegó.

### Paso 4 — Generar los secretos

```bash
cd /opt/transportes
umask 077
cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
JWT_SECRET=$(openssl rand -hex 48)
JWT_REFRESH_SECRET=$(openssl rand -hex 48)
EOF
chmod 600 .env
```

Verificar que los tres valores quedaron distintos y no vacíos:

```bash
grep -c '=.\{20,\}' .env   # debe imprimir 3
```

> Guardar una copia de `.env` en el gestor de contraseñas de la institución. Si se pierde
> `JWT_SECRET` sólo se invalidan las sesiones activas; si se pierde `POSTGRES_PASSWORD`
> hay que entrar al contenedor para restablecerla.

### Paso 5 — Crear `docker-compose.yml`

El repositorio no trae uno. Crear `/opt/transportes/docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:18
    restart: unless-stopped
    environment:
      POSTGRES_DB: transportes
      POSTGRES_USER: transportes
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?falta POSTGRES_PASSWORD en .env}
      TZ: America/La_Paz
    # Afinado para un servidor de 16 GB compartido con la API (sección 9).
    command: >
      postgres
      -c shared_buffers=2GB
      -c effective_cache_size=6GB
      -c maintenance_work_mem=512MB
      -c work_mem=16MB
      -c max_connections=50
      -c wal_buffers=16MB
      -c max_wal_size=2GB
      -c min_wal_size=512MB
      -c checkpoint_completion_target=0.9
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
      -c timezone=America/La_Paz
      -c log_min_duration_statement=500
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U transportes -d transportes']
      interval: 10s
      timeout: 5s
      retries: 10
    # Sin `ports`: la base queda accesible sólo desde la red interna de compose.

  api:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://transportes:${POSTGRES_PASSWORD}@db:5432/transportes?schema=public
      JWT_SECRET: ${JWT_SECRET:?falta JWT_SECRET en .env}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:?falta JWT_REFRESH_SECRET en .env}
      JWT_EXPIRES_IN: 8h
      JWT_REFRESH_EXPIRES_IN: 7d
      GRAPHQL_PLAYGROUND: 'false'
      TZ: America/La_Paz
    ports:
      - '80:3000'

volumes:
  pgdata:
```

Notas sobre decisiones de este archivo:

- El afinado va por banderas `-c` en lugar de montar un `postgresql.conf`. Montar un
  archivo de configuración fuera de `PGDATA` en la imagen oficial obliga a declarar
  también `data_directory`, `hba_file` e `ident_file`, y es una fuente habitual de
  arranques fallidos. Con `-c` no hay ambigüedad.
- `depends_on: condition: service_healthy` evita que `prisma migrate deploy` corra antes de
  que la base acepte conexiones.
- Los campos de fecha del esquema son `Timestamptz`, así que el almacenamiento es UTC
  independientemente de `TZ`; la zona sólo afecta cómo se muestran los logs y cómo se
  interpretan las funciones de fecha.

### Paso 6 — Construir y levantar

```bash
cd /opt/transportes
docker compose build          # 5–15 min la primera vez
docker compose up -d
docker compose ps             # ambos servicios en "running"/"healthy"
docker compose logs -f api    # Ctrl+C para salir
```

En los logs de `api` se espera ver las migraciones aplicándose y después:

```
Conectado a PostgreSQL
API en http://localhost:3000/graphql
```

### Paso 7 — Sembrar roles y usuarios iniciales

**Sólo en la primera instalación.** Requiere la [corrección 6.3](#63-el-seed-no-puede-correr-dentro-del-contenedor).

```bash
docker compose exec api bun run prisma:seed
```

Crea los 7 roles del catálogo y un usuario por rol, todos con la contraseña temporal
`Test1234.`:

| Usuario | Rol |
|---|---|
| `administrador` | ADMINISTRADOR |
| `transportes` | TRANSPORTES |
| `combustible` | COMBUSTIBLE |
| `mantenimiento` | MANTENIMIENTO |
| `almacen` | ALMACEN |
| `consulta` | CONSULTA |
| `conductor` | CONDUCTOR |

> **Obligatorio antes de entregar el sistema:** entrar como `administrador`, cambiar su
> contraseña, y desactivar o recontraseñar los otros seis. Son credenciales públicas:
> están en el repositorio, en `backend/prisma/seed.ts:42`.

Opcionalmente, cargar el censo de vehículos 2025:

```bash
docker compose exec api bun run prisma:seed:inventory
```

> **`prisma:seed:demo` no va en producción.** Existe un tercer seed
> (`backend/prisma/seed-demo.ts`) que genera tráfico ficticio —personal,
> recorridos, cargas de combustible, órdenes de mantenimiento, incidentes— para
> poder probar las pantallas de cada rol en desarrollo. Inserta datos inventados
> en las mismas tablas que usa la operación real; sólo tiene sentido en un
> entorno de pruebas. Si se ejecutó por error, `prisma:seed:demo --reset` lo
> borra sin tocar el censo ni el kardex.

### Paso 8 — Verificar y dejar operativo

```bash
# La API responde
curl -s -o /dev/null -w '%{http_code}\n' http://localhost/        # 200
# El playground está cerrado en producción
curl -s -o /dev/null -w '%{http_code}\n' http://localhost/graphql # 400 o 405, no 200
```

Desde **otra PC de la red**, abrir `http://192.168.1.10/` e iniciar sesión. Esta prueba
desde otra máquina es la que confirma que las correcciones 6.1 y 6.2 quedaron bien: si la
pantalla de login aparece pero el ingreso falla con error de red, el build todavía apunta
a `localhost`.

`restart: unless-stopped` más el servicio `docker` habilitado por defecto hacen que todo
vuelva solo después de un reinicio. Confirmarlo:

```bash
sudo systemctl is-enabled docker   # enabled
sudo reboot
# al volver:
docker compose -f /opt/transportes/docker-compose.yml ps
```

### Variante Windows Server

1. Instalar Docker Desktop con backend WSL2, o Docker Engine en una VM Linux (preferible
   en un servidor: menos capas).
2. Asignar a WSL2 un límite de memoria explícito en `%USERPROFILE%\.wslconfig`, dejando
   4 GB al host:
   ```ini
   [wsl2]
   memory=12GB
   processors=6
   ```
3. Configurar Docker Desktop para iniciar con el sistema y la imagen con `restart: unless-stopped`.
4. Abrir el puerto 80 en el Firewall de Windows sólo para la subred interna.
5. El resto de los pasos es idéntico; usar PowerShell para los comandos de `docker compose`
   y generar los secretos con
   `[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))`.

---

## 8. Instalación — Opción B paso a paso

### Parte 1: la máquina de base de datos (común a B1 y B2)

#### Paso 1 — Sistema operativo y red

Igual que los pasos 1 de la Opción A (zona horaria, IP estática), con esta diferencia en el
cortafuegos: se abre 5432 **sólo** para la subred interna, nunca al mundo.

```bash
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp
sudo ufw allow from 192.168.1.0/24 to any port 5432 proto tcp
sudo ufw --force enable
```

#### Paso 2 — Instalar PostgreSQL 18 desde el repositorio oficial

Los repositorios de Ubuntu suelen traer una versión anterior; el proyecto se desarrolló
sobre PostgreSQL 18.

```bash
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update
sudo apt install -y postgresql-18
sudo systemctl enable --now postgresql
psql --version
```

#### Paso 3 — Crear base de datos y rol

```bash
DBPASS=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
echo "Contraseña generada: $DBPASS"   # copiarla al gestor de contraseñas

sudo -u postgres psql <<EOF
CREATE ROLE transportes WITH LOGIN PASSWORD '$DBPASS';
CREATE DATABASE transportes OWNER transportes ENCODING 'UTF8';
\c transportes
GRANT ALL ON SCHEMA public TO transportes;
EOF
```

#### Paso 4 — Permitir conexiones desde la red

Editar `/etc/postgresql/18/main/postgresql.conf`:

```conf
listen_addresses = '192.168.1.11'   # la IP del servidor de base de datos
```

Agregar al final de `/etc/postgresql/18/main/pg_hba.conf` — ajustar la subred, y en B1
preferir la IP exacta del servidor de aplicación (`192.168.1.10/32`) en lugar de toda la red:

```conf
# TYPE  DATABASE      USER          ADDRESS            METHOD
host    transportes   transportes   192.168.1.0/24     scram-sha-256
```

```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql --no-pager
```

#### Paso 5 — Afinar

Aplicar los valores de la [sección 9](#9-afinado-de-postgresql) en
`/etc/postgresql/18/main/postgresql.conf` y reiniciar.

#### Paso 6 — Probar la conectividad desde el servidor de aplicación

```bash
# desde la máquina de la app, no desde la de la base
psql "postgresql://transportes:<clave>@192.168.1.11:5432/transportes" -c 'SELECT version();'
```

Si esto no responde, no tiene sentido seguir: revisar `ufw`, `listen_addresses` y `pg_hba.conf`
en ese orden.

#### Paso 7 — Aplicar migraciones y sembrar, **una sola vez**

Desde el servidor de aplicación (B1) o desde **un solo** puesto (B2):

```bash
cd /opt/transportes/backend
export DATABASE_URL="postgresql://transportes:<clave>@192.168.1.11:5432/transportes?schema=public"
bun install --frozen-lockfile
bun run prisma:generate
bun run prisma:deploy
bun run prisma:seed
```

Cambiar después las contraseñas del seed, como en el paso 7 de la Opción A.

### Parte 2a: el servidor de aplicación (variante B1)

Idéntico a la Opción A salvo que el servicio `db` desaparece del compose y `DATABASE_URL`
apunta a la máquina de base de datos:

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://transportes:${POSTGRES_PASSWORD}@192.168.1.11:5432/transportes?schema=public
      JWT_SECRET: ${JWT_SECRET:?}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:?}
      JWT_EXPIRES_IN: 8h
      JWT_REFRESH_EXPIRES_IN: 7d
      GRAPHQL_PLAYGROUND: 'false'
      TZ: America/La_Paz
    ports:
      - '80:3000'
```

Requisitos de esa máquina: 4 núcleos, 8 GB de RAM, SSD 128 GB. Sin PostgreSQL local, la
API sola necesita bastante menos.

Como ya no hay `depends_on` que espere a la base, conviene que el servicio de PostgreSQL
esté arriba antes de levantar la API; si no, el contenedor reinicia hasta lograr conectarse
(`restart: unless-stopped` lo cubre, pero ensucia los logs).

### Parte 2b: backend en cada puesto (variante B2)

Primero aplicar la [corrección 6.4](#64-sólo-para-b2-límite-del-pool) (`max: 5` en el pool).

En cada máquina Windows:

1. **Instalar Bun:**
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
2. **Copiar el proyecto compilado** a `C:\transportes` (traer `dist`, `prisma`, `public`,
   `package.json`, `bun.lock`, `prisma.config.ts`) e instalar dependencias:
   ```powershell
   cd C:\transportes
   bun install --frozen-lockfile
   ```
3. **Crear el `.env`** apuntando a la base central. Los secretos JWT **deben ser los mismos
   en todos los puestos**, o un token emitido en una máquina será rechazado en otra:
   ```ini
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://transportes:<clave>@192.168.1.11:5432/transportes?schema=public
   JWT_SECRET=<el mismo en todos los puestos>
   JWT_REFRESH_SECRET=<el mismo en todos los puestos>
   GRAPHQL_PLAYGROUND=false
   ```
4. **Registrar como servicio de Windows** con [NSSM](https://nssm.cc/):
   ```powershell
   nssm install TransportesAPI "C:\Users\<usuario>\.bun\bin\bun.exe" "dist\main.js"
   nssm set TransportesAPI AppDirectory C:\transportes
   nssm set TransportesAPI Start SERVICE_AUTO_START
   nssm start TransportesAPI
   ```
5. El usuario entra a `http://localhost:3000/`.

> **Sobre el “ejecutable único”:** `bun build --compile` puede producir un `.exe`, pero
> `argon2` (el hash de contraseñas) es un módulo nativo con binario `.node`, y empaquetarlo
> así no es confiable sin probarlo en la máquina destino. La ruta con Bun instalado + NSSM
> es la que funciona sin sorpresas. Si el `.exe` único es un requisito firme, hay que
> validarlo antes en un equipo de prueba.
>
> **No incluir `prisma migrate deploy` en el arranque de los puestos.** Prisma toma un
> advisory lock, así que N instancias migrando a la vez no corrompen nada, pero sí producen
> arranques lentos y errores confusos. Las migraciones se aplican una vez, desde un solo
> lugar, antes de actualizar los puestos.

---

## 9. Afinado de PostgreSQL

Valores para `postgresql.conf` (instalación nativa) o banderas `-c` (Docker). Reiniciar el
servicio después de cambiarlos.

| Parámetro | A: único, 16 GB | B: dedicada, 8 GB | B: dedicada, 16 GB | Por qué |
|---|---|---|---|---|
| `shared_buffers` | `2GB` | `2GB` | `4GB` | ~25 % de la RAM disponible para PostgreSQL |
| `effective_cache_size` | `6GB` | `6GB` | `12GB` | Estimación de caché total; no reserva memoria, guía al planificador |
| `maintenance_work_mem` | `512MB` | `512MB` | `1GB` | `VACUUM`, creación de índices, restauraciones |
| `work_mem` | `16MB` | `8MB` | `16MB` | Por operación de ordenamiento. Bajo en B porque hay más conexiones concurrentes |
| `max_connections` | `50` | `150` (B2) / `50` (B1) | ídem | B2 necesita margen: N puestos × `max` del pool |
| `wal_buffers` | `16MB` | `16MB` | `16MB` | |
| `max_wal_size` | `2GB` | `2GB` | `4GB` | Menos checkpoints, escritura más pareja |
| `min_wal_size` | `512MB` | `512MB` | `1GB` | |
| `checkpoint_completion_target` | `0.9` | `0.9` | `0.9` | Reparte la escritura del checkpoint, evita picos de latencia |
| `random_page_cost` | `1.1` | `1.1` | `1.1` | **Clave en SSD**: el default `4.0` asume disco mecánico y hace que el planificador evite índices que sí conviene usar |
| `effective_io_concurrency` | `200` | `200` | `200` | SSD/NVMe |
| `timezone` | `America/La_Paz` | ídem | ídem | |
| `log_min_duration_statement` | `500` | `500` | `500` | Registra consultas de más de 500 ms: así se detectan los reportes lentos |

> Si se eligió B2, verificar la cuenta de memoria: `max_connections` × `work_mem` es el peor
> caso de los ordenamientos, más ~10 MB de overhead por proceso. Con 150 conexiones y
> `work_mem=8MB` eso es ~2.7 GB sobre los 2 GB de `shared_buffers` — entra en 8 GB, pero sin
> holgura. Con `max: 5` en el pool de cada puesto, 150 conexiones alcanzan para 30 máquinas.

---

## 10. HTTPS y la PWA

El build de producción activa el service worker (`"serviceWorker": "ngsw-config.json"` en
`angular.json`). **Los service workers sólo se registran en contextos seguros**: HTTPS, o
`localhost`. Consecuencias según la topología:

- **Opción A o B1 sobre HTTP simple** (`http://192.168.1.10/`): la aplicación funciona
  normalmente, pero el service worker no se registra. No hay caché offline ni banner de
  instalación — la PWA no se puede instalar como aplicación.
- **Opción B2**: cada usuario entra por `http://localhost:3000/`, que *sí* es contexto
  seguro, así que la PWA funciona sin certificados. Es la única ventaja real de B2.

Si se quiere la PWA instalable en A o B1, hay que servir HTTPS con un certificado que las
máquinas cliente reconozcan. Un certificado autofirmado no alcanza: el navegador lo rechaza
y el service worker tampoco se registra. Dos caminos:

1. **CA interna + distribución por GPO** (lo correcto en un dominio): emitir el certificado
   para el nombre del servidor e instalar la CA en el almacén de entidades de confianza de
   las máquinas por política de grupo.
2. **Nombre público con Let's Encrypt**: sólo si el servidor tiene un nombre DNS resoluble
   y salida a Internet para la validación. En una red cerrada, normalmente no aplica.

Con el certificado en mano, agregar un proxy inverso al compose (Caddy es el de menor
configuración) y cambiar el mapeo de la API de `80:3000` a sólo `expose`, para que el
tráfico entre por el proxy en 443.

---

## 11. Respaldos y restauración

**Un respaldo que nunca se restauró no es un respaldo.** El paso de prueba de esta sección
no es opcional.

### Respaldo diario automático

En la máquina que tiene PostgreSQL:

```bash
sudo mkdir -p /var/backups/transportes
sudo tee /usr/local/bin/respaldo-transportes.sh > /dev/null <<'EOF'
#!/bin/bash
set -euo pipefail
DESTINO=/var/backups/transportes
FECHA=$(date +%F_%H%M)
# Opción A (PostgreSQL en contenedor):
docker exec -i $(docker ps -qf name=db) \
  pg_dump -U transportes -Fc transportes > "$DESTINO/transportes_$FECHA.dump"
# Opción B (PostgreSQL nativo) — usar esta línea en lugar de la anterior:
# sudo -u postgres pg_dump -Fc transportes > "$DESTINO/transportes_$FECHA.dump"

# Retención: 14 diarios
find "$DESTINO" -name 'transportes_*.dump' -mtime +14 -delete
EOF
sudo chmod 700 /usr/local/bin/respaldo-transportes.sh
```

Programarlo a las 2 de la mañana:

```bash
echo '0 2 * * * root /usr/local/bin/respaldo-transportes.sh' \
  | sudo tee /etc/cron.d/respaldo-transportes
sudo chmod 644 /etc/cron.d/respaldo-transportes
```

Ejecutarlo una vez a mano para confirmar que genera un archivo con tamaño razonable:

```bash
sudo /usr/local/bin/respaldo-transportes.sh
ls -lh /var/backups/transportes/
```

El formato `-Fc` (custom) está comprimido: para esta base, un respaldo completo son unos
cientos de MB y toma menos de un minuto.

### Copia fuera de la máquina

Un respaldo en el mismo disco que la base no protege de la falla más probable. Copiarlo a
otra máquina o a un disco externo:

```bash
echo '30 2 * * * root rsync -az --delete /var/backups/transportes/ \
  respaldos@192.168.1.50:/respaldos/transportes/' \
  | sudo tee /etc/cron.d/respaldo-transportes-remoto
```

### Prueba de restauración

Hacerla al instalar, y repetirla cada seis meses. Restaurar **a una base nueva**, nunca
sobre la de producción:

```bash
# Opción A
docker exec -i $(docker ps -qf name=db) \
  createdb -U transportes transportes_prueba
docker exec -i $(docker ps -qf name=db) \
  pg_restore -U transportes -d transportes_prueba --no-owner \
  < /var/backups/transportes/transportes_2026-10-01_0200.dump

# Comprobar que los datos están
docker exec -i $(docker ps -qf name=db) psql -U transportes -d transportes_prueba \
  -c 'SELECT count(*) FROM vehicle;' \
  -c 'SELECT count(*) FROM vehicle_photo;' \
  -c 'SELECT count(*) FROM "User";'

# Limpiar
docker exec -i $(docker ps -qf name=db) dropdb -U transportes transportes_prueba
```

### Si se necesita recuperación a un punto en el tiempo

`pg_dump` diario implica perder hasta 24 horas de trabajo. Si eso es inaceptable, el paso
siguiente es archivado de WAL con `pg_basebackup` más `archive_command`, que permite
restaurar a cualquier instante. Es más configuración y más disco; para el volumen de este
sistema, el respaldo diario suele ser suficiente, pero es una decisión del área.

---

## 12. Verificación posterior al despliegue

Recorrer la lista completa antes de entregar el sistema.

### Infraestructura

- [ ] `docker compose ps` muestra todos los servicios `running` / `healthy`
- [ ] El servidor sobrevive un `reboot` y los servicios vuelven solos
- [ ] `ufw status` muestra 5432 cerrado desde fuera de la subred (o no expuesto en Opción A)
- [ ] `free -h` muestra al menos 4 GB disponibles con el sistema en uso normal
- [ ] `df -h` muestra más del 50 % libre en la partición de datos
- [ ] El UPS está conectado y probado

### Aplicación

- [ ] `http://<ip-servidor>/` carga la pantalla de login **desde otra PC de la red**
- [ ] El login funciona desde esa otra PC (confirma las correcciones 6.1 y 6.2)
- [ ] `http://<ip-servidor>/graphql` **no** devuelve el playground (confirma `GRAPHQL_PLAYGROUND=false`)
- [ ] Una ficha de vehículo con fotos carga en menos de 2 segundos en la LAN
- [ ] Un reporte con exportación a Excel se descarga correctamente
- [ ] Una ruta profunda recargada con F5 (ej. `/vehiculos/<id>`) no da 404
- [ ] El panel de auditoría muestra los eventos de las pruebas anteriores

### Seguridad

- [ ] La contraseña de `administrador` fue cambiada
- [ ] Los otros seis usuarios del seed están desactivados o con contraseña nueva
- [ ] `JWT_SECRET` y `JWT_REFRESH_SECRET` son aleatorios, distintos entre sí, y no son los de `.env.example`
- [ ] `.env` tiene permisos `600` y no está versionado
- [ ] Los secretos quedaron en el gestor de contraseñas institucional

### Respaldos

- [ ] El script de respaldo corrió a mano y generó un archivo
- [ ] El cron está instalado
- [ ] La copia fuera de la máquina funciona
- [ ] **La restauración de prueba se completó y los conteos de filas son correctos**

---

## 13. Mantenimiento y actualizaciones

### Desplegar una versión nueva (Opción A o B1)

```bash
cd /opt/transportes
/usr/local/bin/respaldo-transportes.sh     # respaldo antes de migrar: no negociable
git pull
docker compose build api
docker compose up -d api
docker compose logs -f api                 # confirmar migraciones y arranque limpio
```

Las migraciones pendientes se aplican en el arranque del contenedor. Si una migración
falla, el contenedor no levanta y la versión anterior de los datos sigue intacta: ahí es
donde sirve el respaldo que se tomó un paso antes.

### Desplegar en B2

Orden obligatorio, porque hay N instancias:

1. Respaldo de la base.
2. Aplicar migraciones **una vez**, desde un solo lugar: `bun run prisma:deploy`.
3. Actualizar los archivos de cada puesto y reiniciar su servicio (`nssm restart TransportesAPI`).

Entre los pasos 2 y 3 hay una ventana en la que puestos sin actualizar hablan con un
esquema nuevo. Con migraciones aditivas (agregar columnas o tablas) no hay problema; con
migraciones que renombran o eliminan, sí. Planificar esos despliegues fuera de horario.

### Tareas periódicas

| Frecuencia | Tarea |
|---|---|
| Diaria | Automática: respaldo + copia remota |
| Semanal | Revisar `docker compose logs --since 168h api \| grep -i error` |
| Mensual | `sudo apt update && sudo apt upgrade` en el servidor; revisar espacio en disco |
| Semestral | Prueba de restauración; rotar los secretos JWT (invalida las sesiones activas) |
| Anual | Revisar el crecimiento de `audit_log` y el plan de retención |

### Retención de la auditoría

No existe hoy ninguna política de purga: `AuditLog` crece indefinidamente a ~1 GB por año.
El disco no es el problema; las consultas del panel de auditoría sí se van degradando a
medida que la tabla acumula millones de filas. Antes de llegar ahí, definir con el área
una de estas dos salidas:

- **Borrado por antigüedad**, si la normativa permite descartar el rastro viejo:
  ```sql
  DELETE FROM audit_log WHERE created_at < now() - interval '3 years';
  ```
- **Particionado por rango de fecha**, si el rastro debe conservarse completo: mantiene
  las consultas rápidas sobre los meses recientes y permite archivar particiones antiguas.

### Qué monitorear

```bash
# Tamaño de la base y de las tablas más grandes
docker compose exec db psql -U transportes -d transportes -c \
  "SELECT pg_size_pretty(pg_database_size('transportes')) AS total;"

docker compose exec db psql -U transportes -d transportes -c \
  "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS tamanio
     FROM pg_catalog.pg_statio_user_tables
    ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;"

# Conexiones en uso contra el máximo
docker compose exec db psql -U transportes -d transportes -c \
  "SELECT count(*) AS en_uso,
          current_setting('max_connections') AS maximo
     FROM pg_stat_activity;"
```

Si `en_uso` se acerca al máximo de forma habitual, revisar el `max` del pool antes de subir
`max_connections`: casi siempre el problema son instancias de más, no un límite bajo.

---

## 14. Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El login carga pero falla desde otras PC, funciona desde el servidor | El build quedó apuntando a `localhost` | Aplicar [6.1](#61-el-build-de-producción-no-usa-environmentproductionts) y [6.2](#62-la-ruta-de-graphql-de-producción-no-existe), reconstruir con `docker compose build api` |
| Todas las consultas GraphQL dan 404 | `graphqlUri` apunta a `/api/graphql`, el backend sirve `/graphql` | Corrección [6.2](#62-la-ruta-de-graphql-de-producción-no-existe) |
| `Cannot find module '../src/generated/prisma/client.js'` al sembrar | La imagen no copia `src/generated` | Corrección [6.3](#63-el-seed-no-puede-correr-dentro-del-contenedor) |
| `FATAL: sorry, too many clients already` | Instancias × pool superan `max_connections` | Fijar `max: 5` en el pool ([6.4](#64-sólo-para-b2-límite-del-pool)) y subir `max_connections` |
| El contenedor `api` reinicia en bucle | No alcanza la base, o faltan `JWT_SECRET` / `DATABASE_URL` | `docker compose logs api`; verificar `.env` y `docker compose ps db` |
| `prisma migrate deploy` falla al arrancar | Migración incompatible con datos existentes | Revisar el log, restaurar el respaldo previo, corregir la migración |
| La PWA no ofrece instalarse | Service worker sin contexto seguro (HTTP) | Ver [sección 10](#10-https-y-la-pwa) |
| Los reportes tardan mucho | Latencia app↔base, o falta de índices | Revisar `log_min_duration_statement`; en B verificar que ambas máquinas estén en el mismo switch |
| Las fichas con fotos van lentas | Red a 100 Mbit, o poca RAM para caché | Confirmar enlace gigabit; revisar `free -h` |
| `psql` no conecta desde la máquina de la app (Opción B) | `ufw`, `listen_addresses` o `pg_hba.conf` | Revisarlos en ese orden |

---

## Referencias al código

| Tema | Archivo |
|---|---|
| Variables de entorno | `backend/.env.example`, `backend/src/config/configuration.ts` |
| Ruta de GraphQL y estáticos | `backend/src/app.module.ts`, `backend/src/main.ts` |
| Pool de conexiones | `backend/src/prisma/prisma.service.ts:30` |
| Esquema y migraciones | `backend/prisma/schema.prisma`, `backend/prisma/migrations/` |
| Usuarios y roles iniciales | `backend/prisma/seed.ts` |
| Censo de vehículos 2025 | `backend/prisma/seed-inventory.ts`, `backend/prisma/seed-data/inventory-2025.json` |
| Almacenamiento de fotos | `backend/prisma/schema.prisma:677`, `frontend/src/app/features/vehicles/vehicle-form/vehicle-form.component.ts:62` |
| Censura en auditoría | `backend/src/modules/audit/audit-map.ts:173` |
| Imagen de producción | `Dockerfile` |
| URI de GraphQL del cliente | `frontend/src/environments/`, `frontend/angular.json` |
