# AGENTS.md

## Proyecto

Sistema de Información para Gestionar la Información Vehicular del Comando Policial de Oruro.
Dos proyectos independientes, uno junto al otro: `../backend/` (NestJS 12, GraphQL code-first
sobre Apollo Server 5, Prisma 7 + PostgreSQL 18) y este mismo, `frontend/` (Angular 22 standalone
con signals nativos, Tailwind 4, Apollo Angular). Cada uno tiene su propio `package.json` y su
propio `node_modules`; no hay workspace ni instalación compartida entre los dos. Este directorio
(`frontend/`) también concentra la documentación de todo el sistema: specs, constitución y la
propuesta de desarrollo, aunque parte de esa documentación describa trabajo del backend. Ver
`docs/PROPUESTA DE DESARROLLO.pdf` para el alcance funcional completo.

## Comandos

Cada proyecto se instala y se ejecuta desde su propia carpeta, por separado.

Backend (desde `../backend/`):
- `bun install` (primera vez o tras cambiar dependencias)
- `bun run start:dev` → http://localhost:3000/graphql
- `bun run test`, `bun run lint`, `bun run format:check` (usar `format` para corregir)
- `bun run verify` (typecheck + lint + format + tests)
- Prisma: `bun run prisma:generate`, `bun run prisma:migrate`, `bun run prisma:studio`

Frontend (desde este directorio, `frontend/`):
- `bun install` (primera vez o tras cambiar dependencias)
- `bun run start` → http://localhost:4200
- `bun run test`, `bun run lint`, `bun run format:check` (usar `format` para corregir)
- `bun run verify` (typecheck + lint + format + tests)

No existe un `bun run verify` combinado en la raíz: al terminar un cambio que toca los dos
proyectos, se corre `verify` en cada carpeta por separado.

## Estilo y convenciones

- TypeScript estricto en los dos proyectos. Backend ESM (imports con extensión `.js`, aunque el
  código fuente sea `.ts`). Frontend sin TypeScript laxo: nada de `any` implícito.
- Identificadores de código (modelos, campos, tipos, variables) en **inglés**. Comentarios,
  mensajes de validación y textos de interfaz en **español**.
- Backend: módulos por feature en `src/modules/<nombre>/` (dentro de `../backend/`) con
  `entities/`, `dto/`, `<nombre>.service.ts`, `<nombre>.resolver.ts`, `<nombre>.module.ts`. El
  resolver sólo traduce GraphQL a llamadas al service; el service es el único que habla con
  `PrismaService`.
- Frontend: `core/` (proveedores transversales, ej. GraphQL), `features/<nombre>/` (modelo,
  service con Apollo, componentes standalone). Signals nativos de Angular para estado reactivo;
  sin NgRx ni otra librería de estado.
- Prettier + oxlint en los dos proyectos; usar `bun run format` antes de dar algo por terminado,
  nunca editar a mano el estilo para "hacerlo pasar".
- `schema.prisma` (en `../backend/prisma/`) es la fuente de verdad del dominio: un campo se
  declara una vez ahí; el tipo GraphQL y los DTOs se derivan a mano siguiendo el patrón de
  `vehicles`, no se inventan campos nuevos fuera del esquema.

## Reglas

- Lee `docs/constitution.md` y la spec activa (`specs/<nnn>-<nombre>/spec.md`, con RF derivados de
  `docs/PROPUESTA DE DESARROLLO.pdf`) antes de tocar código, sea del backend o del frontend.
- No instales ni cambies el stack (Angular/NestJS/Prisma/Tailwind/Bun) sin preguntar primero.
- No implementes un requerimiento funcional (RF) que no se haya pedido explícitamente en la
  conversación, aunque esté en el alcance de la propuesta.
- No toques `../backend/src/generated/` a mano: es salida de `prisma generate`, se regenera, no se
  edita.
- No apliques migraciones destructivas, `prisma migrate reset`, ni operaciones sobre datos reales
  sin confirmación explícita.

## Al terminar cualquier tarea

- Corre `bun run verify` en el/los proyecto(s) que tocaste (desde su propia carpeta); no reportes
  algo como terminado si falla.
- Si el cambio afecta a UI, arranca el dev server y verifica el flujo en el navegador (no sólo
  que compile).
- Si tocaste `schema.prisma`, corre `prisma:generate` y crea la migración correspondiente antes
  de dar el cambio por cerrado.
