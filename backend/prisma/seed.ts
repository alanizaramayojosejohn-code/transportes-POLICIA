import 'dotenv/config';
import { hash } from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * Catálogo completo de roles, igual al de `CurrentRoleService` (frontend) y
 * `base_datos_transportes_postgresql_final.sql` sección 2: son el mismo
 * catálogo, uno lo usa el selector de rol simulado y el otro las
 * asignaciones reales de `User.roleId`.
 */
const ROLES = [
  { code: 'ADMINISTRADOR', name: 'Administrador', isSystem: true },
  { code: 'TRANSPORTES', name: 'Área de Transportes', isSystem: false },
  { code: 'COMBUSTIBLE', name: 'Combustible', isSystem: false },
  { code: 'MANTENIMIENTO', name: 'Mantenimiento', isSystem: false },
  { code: 'ALMACEN', name: 'Almacén', isSystem: false },
  { code: 'CONSULTA', name: 'Consulta', isSystem: false },
];

/**
 * Un usuario activo por rol (spec 006, `resolveActingUserId`): sin
 * autenticación real, los módulos operativos (Recorridos, Combustible,
 * Mantenimiento, Inventario, Incidentes) igual necesitan un `User` real
 * como autor de cada registro (FK obligatoria del esquema). Se busca el
 * primer usuario activo con el rol simulado activo en el topbar; si no
 * existe ninguno, esos módulos no pueden operar. Nombres de usuario y
 * contraseña temporal tomados de la maqueta (`usuarioModal`).
 */
const USERS = [
  { username: 'admin', fullName: 'Administrador del Sistema', roleCode: 'ADMINISTRADOR' },
  { username: 'transportes.admin', fullName: 'Área de Transportes', roleCode: 'TRANSPORTES' },
  { username: 'combustible.01', fullName: 'Encargado de Combustible', roleCode: 'COMBUSTIBLE' },
  { username: 'mantenimiento.01', fullName: 'Encargado de Mantenimiento', roleCode: 'MANTENIMIENTO' },
  { username: 'almacen.01', fullName: 'Encargado de Almacén', roleCode: 'ALMACEN' },
  { username: 'consulta.01', fullName: 'Usuario de Consulta', roleCode: 'CONSULTA' },
];
const DEFAULT_PASSWORD = 'Temporal2026';

/**
 * Categorías de repuestos (spec 009): `SparePartCategory` es un catálogo
 * real, no un enum, pero la maqueta (`articuloModal`) sugiere una lista
 * cerrada; se siembra con esos mismos nombres para no dejarla vacía.
 */
const SPARE_PART_CATEGORIES = ['Lubricante', 'Repuesto', 'Filtro', 'Fluido', 'Material', 'Otro'];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    for (const role of ROLES) {
      await prisma.role.upsert({
        where: { code: role.code },
        update: { name: role.name },
        create: role,
      });
    }
    console.log(`Roles sembrados: ${ROLES.map((r) => r.code).join(', ')}`);

    const passwordHash = await hash(DEFAULT_PASSWORD);
    for (const user of USERS) {
      const role = await prisma.role.findUniqueOrThrow({ where: { code: user.roleCode } });
      await prisma.user.upsert({
        where: { username: user.username },
        update: { fullName: user.fullName, roleId: role.id, isActive: true },
        create: {
          username: user.username,
          fullName: user.fullName,
          roleId: role.id,
          passwordHash,
        },
      });
    }
    console.log(`Usuarios sembrados: ${USERS.map((u) => u.username).join(', ')}`);

    for (const name of SPARE_PART_CATEGORIES) {
      await prisma.sparePartCategory.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    console.log(`Categorías de repuestos sembradas: ${SPARE_PART_CATEGORIES.join(', ')}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
