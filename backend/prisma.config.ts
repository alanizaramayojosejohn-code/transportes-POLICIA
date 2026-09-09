import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

// El proyecto es ESM, así que no hay __dirname: se usa import.meta.dirname.
const here = import.meta.dirname

export default defineConfig({
  schema: path.join(here, 'prisma', 'schema.prisma'),

  datasource: {
    url: process.env.DATABASE_URL!,
  },

  migrations: {
    path: path.join(here, 'prisma', 'migrations'),
    seed: 'bun run prisma/seed.ts',
  },
})
