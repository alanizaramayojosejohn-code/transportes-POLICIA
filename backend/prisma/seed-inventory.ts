import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import type { VehicleType, VehicleConditionCode, StockMovementType, SparePartType } from '../src/generated/prisma/enums.js';

/**
 * Importa el censo de vehículos 2025 (`INVENTARIO POR UNIDADES Y RURAL.xlsx`,
 * `RELEVO INVENTARIO RESUMEN...xlsx`) y el kardex de lubricantes 2025
 * (`KARDEX ACEITE 2025.xlsx`) del Comando Departamental de Oruro. Los datos
 * ya vienen normalizados por `scripts/` fuera del repo en
 * `seed-data/inventory-2025.json`; ver el mensaje de cierre de este script
 * (o la conversación que lo generó) para las decisiones de mapeo tomadas
 * sobre placas faltantes, clases de vehículo y saldo inicial del kardex.
 *
 * Requiere que `prisma:seed` (roles, usuarios, categorías de repuesto) ya
 * se haya ejecutado: usa el usuario `transportes` y las categorías
 * `Lubricante`/`Fluido` sembrados ahí.
 */

type InventoryData = {
  units: Array<{ code: string; name: string; type: string; location: string | null; parentCode: string | null }>;
  vehicles: Array<{
    key: string;
    plate: string;
    plateDnfr: string | null;
    type: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    chassisNumber: string | null;
    engineNumber: string | null;
    origin: string | null;
    receptionSource: string | null;
    observations: string | null;
    isActive: boolean;
  }>;
  conditions: Array<{ vehicleKey: string; code: string; reason: string }>;
  unitAssignments: Array<{ vehicleKey: string; unitCode: string }>;
  spareParts: Array<{ key: string; name: string; category: string; type: string; unit: string }>;
  stockMovements: Array<{
    sparePartKey: string;
    type: 'IN' | 'OUT';
    quantity: number;
    unitCost: number | null;
    reason: string;
    reference: string;
    vehicleKey: string | null;
    nro: string;
    occurredAt: string;
  }>;
};

const dataPath = fileURLToPath(new URL('./seed-data/inventory-2025.json', import.meta.url));
const data: InventoryData = JSON.parse(readFileSync(dataPath, 'utf-8'));

const CENSUS_DATE = new Date(Date.UTC(2025, 0, 1));
const REGISTERED_BY_ROLE = 'TRANSPORTES';

function dec(n: number): string {
  return n.toFixed(2);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const registeredBy = await prisma.user.findUnique({ where: { username: 'transportes' } });
    if (!registeredBy) {
      throw new Error(
        "Usuario 'transportes' no encontrado. Corre `bun run prisma/seed.ts` primero (siembra roles, usuarios y categorías de repuesto).",
      );
    }

    // --- Unidades ---
    const unitIdByCode = new Map<string, string>();
    for (const u of data.units) {
      const parentId = u.parentCode ? unitIdByCode.get(u.parentCode) : null;
      const unit = await prisma.unit.upsert({
        where: { code: u.code },
        update: { name: u.name, type: u.type, location: u.location, parentId: parentId ?? null },
        create: { code: u.code, name: u.name, type: u.type, location: u.location, parentId: parentId ?? null },
      });
      unitIdByCode.set(u.code, unit.id);
    }
    console.log(`Unidades sembradas: ${data.units.length}`);

    // --- Vehículos ---
    const vehicleIdByKey = new Map<string, string>();
    for (const v of data.vehicles) {
      const vehicle = await prisma.vehicle.upsert({
        where: { plate: v.plate },
        update: {},
        create: {
          plate: v.plate,
          plateDnfr: v.plateDnfr,
          type: v.type as VehicleType,
          brand: v.brand,
          model: v.model,
          year: v.year,
          color: v.color,
          chassisNumber: v.chassisNumber,
          engineNumber: v.engineNumber,
          origin: v.origin,
          receptionSource: v.receptionSource,
          observations: v.observations,
          isActive: v.isActive,
        },
      });
      vehicleIdByKey.set(v.key, vehicle.id);
    }
    console.log(`Vehículos sembrados: ${data.vehicles.length}`);

    // --- Condición inicial ---
    let conditionsCreated = 0;
    for (const c of data.conditions) {
      const vehicleId = vehicleIdByKey.get(c.vehicleKey);
      if (!vehicleId) continue;
      const existing = await prisma.vehicleCondition.count({ where: { vehicleId } });
      if (existing > 0) continue;
      await prisma.vehicleCondition.create({
        data: {
          vehicleId,
          code: c.code as VehicleConditionCode,
          reason: c.reason,
          registeredByRole: REGISTERED_BY_ROLE,
          changedAt: CENSUS_DATE,
        },
      });
      conditionsCreated++;
    }
    console.log(`Condiciones iniciales creadas: ${conditionsCreated}`);

    // --- Asignación a unidad ---
    let assignmentsCreated = 0;
    for (const a of data.unitAssignments) {
      const vehicleId = vehicleIdByKey.get(a.vehicleKey);
      const unitId = unitIdByCode.get(a.unitCode);
      if (!vehicleId || !unitId) continue;
      const existing = await prisma.unitAssignment.findFirst({ where: { vehicleId, endDate: null } });
      if (existing) continue;
      await prisma.unitAssignment.create({
        data: {
          vehicleId,
          unitId,
          startDate: CENSUS_DATE,
          reason: 'Carga inicial desde censo de inventario 2025.',
        },
      });
      assignmentsCreated++;
    }
    console.log(`Asignaciones a unidad creadas: ${assignmentsCreated}`);

    // --- Catálogo de lubricantes/fluidos ---
    const categoryIdByName = new Map<string, string>();
    const sparePartIdByKey = new Map<string, string>();
    for (const sp of data.spareParts) {
      let categoryId = categoryIdByName.get(sp.category);
      if (!categoryId) {
        const category = await prisma.sparePartCategory.findUnique({ where: { name: sp.category } });
        if (!category) {
          throw new Error(`Categoría de repuesto '${sp.category}' no encontrada. Corre \`bun run prisma/seed.ts\` primero.`);
        }
        categoryId = category.id;
        categoryIdByName.set(sp.category, categoryId);
      }
      const code = `KARDEX-${sp.key}`;
      const part = await prisma.sparePart.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: sp.name,
          type: sp.type as SparePartType,
          unit: sp.unit,
          categoryId,
        },
      });
      sparePartIdByKey.set(sp.key, part.id);
    }
    console.log(`Repuestos (lubricantes/fluidos) sembrados: ${data.spareParts.length}`);

    // --- Movimientos de stock (kardex 2025) ---
    let movementsCreated = 0;
    const movementsByPart = new Map<string, typeof data.stockMovements>();
    for (const m of data.stockMovements) {
      const list = movementsByPart.get(m.sparePartKey) ?? [];
      list.push(m);
      movementsByPart.set(m.sparePartKey, list);
    }

    for (const [sparePartKey, movements] of movementsByPart) {
      const sparePartId = sparePartIdByKey.get(sparePartKey);
      if (!sparePartId) continue;
      const existing = await prisma.stockMovement.count({ where: { sparePartId } });
      if (existing > 0) continue;

      let balance = 0;
      for (const m of movements) {
        balance = m.type === 'IN' ? balance + m.quantity : balance - m.quantity;
        const vehicleId = m.vehicleKey ? (vehicleIdByKey.get(m.vehicleKey) ?? null) : null;
        await prisma.stockMovement.create({
          data: {
            sparePartId,
            type: m.type as StockMovementType,
            quantity: dec(m.quantity),
            unitCost: m.unitCost != null ? dec(m.unitCost) : null,
            balanceAfter: dec(balance),
            reason: m.reason,
            reference: m.reference,
            vehicleId,
            registeredById: registeredBy.id,
            createdAt: new Date(m.occurredAt),
          },
        });
        movementsCreated++;
      }

      const last = movements[movements.length - 1];
      await prisma.sparePart.update({
        where: { id: sparePartId },
        data: {
          currentStock: dec(balance),
          lastUnitCost: last?.unitCost != null ? dec(last.unitCost) : undefined,
        },
      });
    }
    console.log(`Movimientos de stock creados: ${movementsCreated}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
