# Constitución del proyecto Transportes

1. **Stack cerrado**: NestJS 12 + GraphQL code-first + Prisma 7 + PostgreSQL; Angular 22 standalone + signals (sin NgRx) + Tailwind 4 + Apollo Angular; Bun como runtime/gestor.
2. **Un módulo de dominio = un directorio** `backend/src/modules/<nombre>` con entity, dto, service, resolver, module — plantilla: `vehicles`.
3. **Ningún resolver toca Prisma directamente**; toda lógica vive en el service.
4. **Toda mutación se valida con `class-validator`**; sin `any` implícito en DTOs.
5. **Los errores de Prisma (P2002, etc.) se traducen a excepciones de Nest**, nunca se filtran crudos al cliente.
6. **Identificadores y esquema en inglés; comentarios y mensajes de usuario en español.**
7. **Todo cambio de esquema pasa por una migración de Prisma versionada**, nunca `db push` manual en el repo.
8. **Ningún módulo se cierra sin `bun run verify` en verde** (typecheck + lint + format + tests) en la app tocada.
9. **No se añaden librerías de estado, ORM alternativo o UI kit sin aprobación explícita.**
10. **No se implementa ningún RF fuera del alcance de la propuesta** (`docs/PROPUESTA DE DESARROLLO.pdf`) sin pedirlo antes.
11. **Cambios irreversibles** (migraciones destructivas, borrado de datos, force-push) requieren confirmación explícita antes de ejecutarse.
