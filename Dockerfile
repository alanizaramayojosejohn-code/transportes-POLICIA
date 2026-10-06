# ---- Frontend: build estático de Angular ----
FROM oven/bun:1 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile
COPY frontend/ .
RUN bun run build

# ---- Backend: build de Nest + cliente Prisma ----
FROM oven/bun:1 AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/bun.lock ./
RUN bun install --frozen-lockfile
COPY backend/ .
RUN bun run prisma:generate
RUN bun run build

# ---- Runtime: API + estáticos en un solo contenedor ----
FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/package.json ./package.json
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/prisma ./prisma
COPY --from=backend-build /app/backend/prisma.config.ts ./prisma.config.ts
COPY --from=frontend-build /app/frontend/dist/web/browser ./public
RUN mkdir -p ./graphql

EXPOSE 3000

# `prisma migrate deploy` es idempotente: aplica solo las migraciones
# pendientes, así que es seguro correrlo en cada arranque del contenedor.
CMD ["sh", "-c", "bun run prisma:deploy && bun dist/main.js"]
