# Transportes

Sistema de Información para Gestionar la Información Vehicular del Comando Policial de Oruro.

Ver `docs/PROPUESTA DE DESARROLLO.pdf` para el alcance funcional completo (15 requerimientos
funcionales) y `docs/design/Transportes.pen` para el diseño de interfaz (Pencil).

## Stack

- **Backend**: NestJS 12 + GraphQL (Apollo Server 5, code-first) + Prisma 7 sobre PostgreSQL 18.
- **Frontend**: Angular 22 (standalone, signals nativos) + Tailwind CSS 4 + Apollo Angular.
- **Runtime / paquetes**: Bun. `backend/` y `frontend/` son dos proyectos independientes, cada uno
  con su propio `package.json` y `node_modules`; no hay workspace ni instalación compartida.

## Estructura

```
Transportes/
├── backend/     # NestJS — GraphQL en /graphql (proyecto independiente)
└── frontend/    # Angular — cliente (proyecto independiente)
    ├── docs/        # Propuesta de desarrollo y diseño
    ├── specs/       # Una carpeta por funcionalidad, con su spec.md
    ├── AGENTS.md    # Convenciones y reglas para todo el sistema
    └── prototype.html  # Prototipo estático de interfaz aportado antes del desarrollo
```

La documentación (specs, constitución, propuesta) vive dentro de `frontend/` aunque describa
trabajo de los dos proyectos.

## Requisitos previos

- Bun 1.3+
- PostgreSQL 18 corriendo localmente (u otra instancia accesible)

## Arranque

```bash
# Backend
cd backend
bun install
cp .env.example .env   # ajustar DATABASE_URL y JWT_SECRET
bun run prisma:migrate  # crea las tablas en la base configurada
bun run start:dev       # http://localhost:3000/graphql

# Frontend (en otra terminal)
cd frontend
bun install
bun run start            # http://localhost:4200
```

El cliente espera la API en `http://localhost:3000/graphql`
(`frontend/src/environments/environment.ts`) y la API permite por defecto el origen
`http://localhost:4200` (`CORS_ORIGIN` en `backend/.env`).

## Estado actual

Lo que existe hoy es el andamiaje base y un módulo de referencia (`vehicles`, RF-01), verificado
de punta a punta: typecheck, lint, formato, tests unitarios y build de producción pasan limpios en
los dos proyectos (`bun run verify` en cada uno), y se probó manualmente contra PostgreSQL real
(migración, mutación de creación, unicidad de placa, búsqueda por QR) y en navegador (listado
reactivo con filtros).

**Modelado en `schema.prisma`** (24 tablas, cubre los 15 RF de la propuesta): usuarios/roles/
permisos/auditoría, vehículos, conductores, solicitudes y asignaciones, salidas/retornos y
kilometraje, mantenimiento (órdenes, ítems, plan por kilometraje), combustible, documentación con
vencimientos, incidentes, inventario de repuestos y movimientos de stock, y alertas.

**Implementado como código** (más allá del esquema): sólo el módulo `vehicles` — entidad
GraphQL, DTOs con `class-validator`, resolver, service con manejo de conflictos de unicidad, y
tests unitarios. Es la plantilla a seguir para el resto de los módulos.

**Pendiente** (no es parte de este scaffold, son los siguientes pasos naturales):
autenticación JWT y guards de rol (RF-13; las dependencias ya están instaladas: `@nestjs/jwt`,
`passport-jwt`, `argon2`), el resto de los módulos de dominio (unidades, conductores,
asignaciones, mantenimiento, combustible, documentación, incidentes, inventario), el dashboard
(RF-11), la PWA de campo (RF-12) y el generador/lector de QR en el cliente.

## Comandos

Cada proyecto expone `typecheck`, `lint`, `format` / `format:check`, `test` y `verify` (los cuatro
anteriores encadenados), corridos desde su propia carpeta:

```bash
cd backend  && bun run verify
cd frontend && bun run verify
```
