import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import type {
  FuelType,
  IncidentSeverity,
  IncidentType,
  MaintenanceStatus,
  MaintenanceType,
  OdometerSource,
  RequestStatus,
} from '../src/generated/prisma/enums.js';
import type {
  AssignmentCreateManyInput,
  FuelRecordCreateManyInput,
  IncidentCreateManyInput,
  MaintenanceItemCreateManyInput,
  MaintenanceOrderCreateManyInput,
  MaintenancePlanCreateManyInput,
  OdometerReadingCreateManyInput,
  TripCreateManyInput,
  VehicleRequestCreateManyInput,
} from '../src/generated/prisma/models.js';

/**
 * Tráfico de prueba para ejercitar las interfaces de los siete usuarios del
 * seed (`prisma:seed`). El censo 2025 (`prisma:seed:inventory`) deja 512
 * vehículos y 96 unidades, pero **cero** registros operativos: sin recorridos,
 * cargas, órdenes ni fichas de personal, la mayoría de las pantallas están
 * vacías y dos usuarios directamente no funcionan:
 *
 * - `conductor`: `myVehicleAssignment` devuelve `null` si la cuenta no tiene
 *   ficha de personal (`vehicle-driver-assignments.resolver.ts`, RF-15 del
 *   spec 014). Sin `Personnel` no hay «Mi vehículo».
 * - `transportes`: el alcance del rol sale de `TransportManagerAssignment`
 *   (`common/unit-scope.ts`, spec 015). Sin designación vigente
 *   `managedUnitIds` queda vacío y `assertInScope` rechaza *todo*.
 *
 * Por eso este script siembra primero las fichas de personal y sus vínculos, y
 * recién encima el tráfico. **Son datos ficticios**: van marcados para poder
 * borrarlos y regenerarlos sin tocar el censo real ni el kardex de lubricantes.
 *
 * Uso:
 *   bun run prisma:seed:demo           genera (borra el tráfico demo previo)
 *   bun run prisma:seed:demo --reset   sólo borra el tráfico demo
 *
 * Requiere `prisma:seed` y `prisma:seed:inventory` ya ejecutados.
 */

/// Marcas que identifican lo sembrado aquí, para que `wipe()` lo pueda quitar
/// sin arrastrar datos reales. Las CI demo viven en un rango reservado que no
/// colisiona con cédulas bolivianas reales (7-8 dígitos empezando en 9).
const DEMO_CI_BASE = 90_000_000;
const DEMO_REQUEST_PREFIX = 'SOL-DEMO-';
const DEMO_ORDER_PREFIX = 'OT-DEMO-';
const DEMO_INCIDENT_PREFIX = 'INC-DEMO-';
const DEMO_PART_PREFIX = 'DEMO-';
const DEMO_NOTE = '[DEMO]';

const MONTHS_BACK = 12;
const VEHICLE_COUNT = 80;
const MANAGED_UNIT_COUNT = 8;
const EXTRA_PERSONNEL = 56;
const RANDOM_SEED = 20_261_005;

/// PRNG determinista: dos corridas del script producen exactamente el mismo
/// tráfico, así que una captura de pantalla o un reporte se puede reproducir.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(RANDOM_SEED);

/// Los `@default(uuid(7))` del esquema son v7 (ordenables por tiempo).
/// `createMany` no devuelve los ids generados y aquí hacen falta para enlazar
/// solicitud → asignación → recorrido, así que se generan en el script
/// respetando el mismo formato en vez de caer a un v4 de `randomUUID`.
function uuidv7(ms: number): string {
  const bytes = new Uint8Array(16);
  const stamp = BigInt(Math.floor(ms));
  for (let i = 0; i < 6; i++) {
    bytes[i] = Number((stamp >> BigInt(8 * (5 - i))) & 0xffn);
  }
  for (let i = 6; i < 16; i++) {
    bytes[i] = Math.floor(rand() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    '',
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

function intBetween(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function chance(probability: number): boolean {
  return rand() < probability;
}

function dec(n: number): string {
  return n.toFixed(2);
}

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

const FIRST_NAMES = [
  'Juan Carlos',
  'María Elena',
  'José Luis',
  'Ana Gabriela',
  'Pedro Antonio',
  'Rosa Mery',
  'Luis Fernando',
  'Carmen Rosa',
  'Jorge Iván',
  'Silvia Patricia',
  'Marco Antonio',
  'Elena Beatriz',
  'Ramiro',
  'Gladys',
  'Freddy',
  'Verónica',
  'Wilson',
  'Nora',
  'Edwin',
  'Roxana',
  'Grover',
  'Mirtha',
  'Rolando',
  'Jhovana',
  'Ever',
  'Lidia',
  'Nelson',
  'Sonia',
  'Mauricio',
  'Delia',
];

const LAST_NAMES = [
  'Mamani Quispe',
  'Condori Choque',
  'Flores Apaza',
  'Cruz Villca',
  'Choquehuanca Luna',
  'Vargas Rojas',
  'Gutiérrez Soto',
  'Álvarez Medina',
  'Colque Huanca',
  'Ticona Mendoza',
  'Poma Cáceres',
  'Quisbert Nina',
  'Arancibia León',
  'Calle Mamani',
  'Fernández Ayala',
  'Chambi Yucra',
  'Salazar Pinto',
  'Torrez Guzmán',
  'Aguilar Siles',
  'Marca Challapa',
];

/// `frontend/src/app/shared/police-ranks.ts`, lista cerrada de la maqueta.
const RANKS = [
  'Pol.',
  'Cabo',
  'Sgto.',
  'Sof.',
  'Subof.',
  'Subtte.',
  'Tte.',
  'Cap.',
  'My.',
];
const LICENSE_CATEGORIES = ['A', 'B', 'C', 'P', 'T'];

const DESTINATIONS = [
  'Challapata',
  'Huanuni',
  'Caracollo',
  'Toledo',
  'Poopó',
  'Machacamarca',
  'Pazña',
  'Corque',
  'Turco',
  'Sabaya',
  'La Paz',
  'Cochabamba',
  'Patacamaya',
  'Tambo Quemado',
  'Eucaliptus',
];

const REQUEST_REASONS = [
  'Patrullaje preventivo en zona rural',
  'Traslado de personal a operativo',
  'Comisión de servicio',
  'Apoyo a operativo de tránsito',
  'Traslado de detenido a celdas judiciales',
  'Notificación de citaciones',
  'Inspección técnica ocular',
  'Relevo de personal en puesto fronterizo',
];

const STATIONS = [
  'YPFB Oruro Centro',
  'Surtidor Bolívar',
  'Estación Norte',
  'Surtidor 6 de Agosto',
  'YPFB Challapata',
  'Surtidor Huanuni',
];

const WORKSHOPS = [
  'Taller Central Comando',
  'Mecánica Oruro Motors',
  'Servicio Técnico Toyota',
  'Taller Hermanos Condori',
  'Electromecánica del Altiplano',
];

const MAINTENANCE_TASKS = [
  {
    name: 'Cambio de aceite y filtro',
    interval: 5_000,
    cost: [250, 650] as const,
  },
  { name: 'Revisión de frenos', interval: 20_000, cost: [400, 1_200] as const },
  {
    name: 'Rotación y balanceo de llantas',
    interval: 15_000,
    cost: [180, 450] as const,
  },
];

const CORRECTIVE_WORK = [
  'Reemplazo de pastillas de freno delanteras',
  'Reparación del sistema de embrague',
  'Cambio de batería',
  'Reparación de alternador',
  'Cambio de amortiguadores traseros',
  'Reparación de caja de dirección',
  'Cambio de correa de distribución',
];

const INCIDENT_PLACES = [
  'Av. 6 de Agosto esq. Caro',
  'Carretera Oruro–Challapata km 32',
  'Av. Circunvalación',
  'Plaza 10 de Febrero',
  'Ruta Oruro–La Paz km 15',
  'Av. España zona Norte',
];

const DEMO_PARTS = [
  {
    code: 'DEMO-001',
    name: 'Pastilla de freno delantera',
    unit: 'juego',
    min: 8,
    stock: 3,
  },
  {
    code: 'DEMO-002',
    name: 'Filtro de aceite motor',
    unit: 'unidad',
    min: 20,
    stock: 42,
  },
  {
    code: 'DEMO-003',
    name: 'Filtro de aire',
    unit: 'unidad',
    min: 15,
    stock: 6,
  },
  {
    code: 'DEMO-004',
    name: 'Batería 12V 75Ah',
    unit: 'unidad',
    min: 5,
    stock: 11,
  },
  {
    code: 'DEMO-005',
    name: 'Amortiguador trasero',
    unit: 'unidad',
    min: 6,
    stock: 2,
  },
  {
    code: 'DEMO-006',
    name: 'Correa de distribución',
    unit: 'unidad',
    min: 10,
    stock: 18,
  },
  {
    code: 'DEMO-007',
    name: 'Bujía de encendido',
    unit: 'unidad',
    min: 40,
    stock: 95,
  },
  {
    code: 'DEMO-008',
    name: 'Líquido de frenos DOT 4',
    unit: 'litro',
    min: 12,
    stock: 7,
  },
];

/// El esquema no guarda combustible en `Vehicle`; cada `FuelRecord` lo lleva.
/// Se fija por tipo para que el historial de un vehículo sea coherente.
function fuelTypeFor(vehicleType: string): FuelType {
  if (vehicleType === 'MOTOCICLETA' || vehicleType === 'CUADRATRACK')
    return 'GASOLINA';
  if (
    vehicleType.startsWith('CAMION') ||
    vehicleType === 'MINIBUS' ||
    vehicleType === 'AMBULANCIA'
  ) {
    return 'DIESEL';
  }
  return chance(0.25) ? 'DIESEL' : 'GASOLINA';
}

/// Rendimiento nominal en km por litro, por clase de vehículo. Fija el volumen
/// de cada carga para que `efficiencyKmPerUnit` caiga en un rango creíble.
function consumptionFor(vehicleType: string): number {
  if (vehicleType === 'MOTOCICLETA' || vehicleType === 'CUADRATRACK')
    return 28 + rand() * 12;
  if (vehicleType.startsWith('CAMION')) return 3.5 + rand() * 2.5;
  if (
    vehicleType === 'MINIBUS' ||
    vehicleType === 'AMBULANCIA' ||
    vehicleType === 'FURGON'
  ) {
    return 7 + rand() * 3;
  }
  return 9 + rand() * 4;
}

function priceFor(fuel: FuelType): number {
  if (fuel === 'DIESEL') return 3.72;
  if (fuel === 'GNV') return 1.66;
  return 3.74;
}

async function wipe(prisma: PrismaClient): Promise<void> {
  /// Orden hijo → padre. `VehicleRequest` arrastra en cascada su `Assignment`
  /// y éste su `Trip` (ver `onDelete: Cascade` del esquema), pero los módulos
  /// que apuntan al recorrido con `SetNull` (combustible, incidentes) hay que
  /// borrarlos antes para no dejarlos huérfanos y marcados como demo.
  const demoPersonnel = await prisma.personnel.findMany({
    where: { ci: { startsWith: '9' }, observations: { contains: DEMO_NOTE } },
    select: { id: true },
  });
  const personnelIds = demoPersonnel.map((p) => p.id);

  await prisma.incident.deleteMany({
    where: { code: { startsWith: DEMO_INCIDENT_PREFIX } },
  });
  await prisma.fuelRecord.deleteMany({
    where: { notes: { contains: DEMO_NOTE } },
  });
  await prisma.odometerReading.deleteMany({
    where: { notes: { contains: DEMO_NOTE } },
  });
  await prisma.maintenanceOrder.deleteMany({
    where: { code: { startsWith: DEMO_ORDER_PREFIX } },
  });
  await prisma.maintenancePlan.deleteMany({
    where: { taskName: { in: MAINTENANCE_TASKS.map((t) => t.name) } },
  });
  await prisma.vehicleRequest.deleteMany({
    where: { code: { startsWith: DEMO_REQUEST_PREFIX } },
  });

  if (personnelIds.length > 0) {
    await prisma.vehicleDriverAssignment.deleteMany({
      where: { driverId: { in: personnelIds } },
    });
    await prisma.transportManagerAssignment.deleteMany({
      where: { officerId: { in: personnelIds } },
    });
  }

  await prisma.stockMovement.deleteMany({
    where: { sparePart: { code: { startsWith: DEMO_PART_PREFIX } } },
  });
  await prisma.sparePart.deleteMany({
    where: { code: { startsWith: DEMO_PART_PREFIX } },
  });

  if (personnelIds.length > 0) {
    await prisma.personnel.deleteMany({ where: { id: { in: personnelIds } } });
  }
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const resetOnly = process.argv.includes('--reset');

  try {
    await wipe(prisma);
    console.log('Tráfico de prueba anterior eliminado.');
    if (resetOnly) return;

    const users = await prisma.user.findMany({ include: { role: true } });
    const userBy = (code: string) => {
      const found = users.find((u) => u.role.code === code);
      if (!found) {
        throw new Error(
          `Falta el usuario con rol ${code}: corra antes "bun run prisma:seed".`,
        );
      }
      return found;
    };
    const uAdmin = userBy('ADMINISTRADOR');
    const uTransportes = userBy('TRANSPORTES');
    const uCombustible = userBy('COMBUSTIBLE');
    const uMantenimiento = userBy('MANTENIMIENTO');
    const uAlmacen = userBy('ALMACEN');
    const uConsulta = userBy('CONSULTA');
    const uConductor = userBy('CONDUCTOR');

    // --- Unidades y vehículos sobre los que se va a generar el tráfico ------
    // Se eligen las unidades con más vehículos y se designa a `transportes`
    // encargado de ellas; los vehículos del tráfico salen de esas mismas
    // unidades para que ese rol (acotado por `unitScopeFor`) vea el movimiento.
    const currentAssignments = await prisma.unitAssignment.findMany({
      where: { endDate: null },
      select: { unitId: true, vehicleId: true },
    });
    if (currentAssignments.length === 0) {
      throw new Error(
        'No hay vehículos asignados a unidades: corra antes "bun run prisma:seed:inventory".',
      );
    }

    // Sólo vehículos activos: los dados de baja en el censo no deben generar
    // recorridos. Se filtran antes de repartir por unidad, para que el cupo de
    // `VEHICLE_COUNT` se llene con vehículos utilizables.
    const activeIds = new Set(
      (
        await prisma.vehicle.findMany({
          where: { isActive: true },
          select: { id: true },
        })
      ).map((v) => v.id),
    );

    const byUnit = new Map<string, string[]>();
    for (const a of currentAssignments) {
      if (!activeIds.has(a.vehicleId)) continue;
      const list = byUnit.get(a.unitId) ?? [];
      list.push(a.vehicleId);
      byUnit.set(a.unitId, list);
    }
    const rankedUnits = [...byUnit.entries()].sort(
      (a, b) => b[1].length - a[1].length,
    );
    const managedUnitIds = rankedUnits
      .slice(0, MANAGED_UNIT_COUNT)
      .map(([unitId]) => unitId);
    const allUnitIds = rankedUnits.map(([unitId]) => unitId);

    const inScope = shuffled(
      managedUnitIds.flatMap((unitId) => byUnit.get(unitId) ?? []),
    );
    const outOfScope = shuffled(
      rankedUnits
        .slice(MANAGED_UNIT_COUNT)
        .flatMap(([, vehicleIds]) => vehicleIds),
    );
    const vehicleIds = [...inScope, ...outOfScope].slice(0, VEHICLE_COUNT);

    const vehicles = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds }, isActive: true },
      select: { id: true, plate: true, type: true },
    });

    // --- Personal -----------------------------------------------------------
    // Una ficha por cuenta de prueba (es lo que destraba `conductor` y
    // `transportes`) más un padrón de conductores para repartir el tráfico.
    type NewPersonnel = {
      id: string;
      ci: string;
      firstName: string;
      lastName: string;
      rank: string;
      isDriver: boolean;
      isOfficer: boolean;
      isAdmin: boolean;
      licenseNumber: string | null;
      licenseCategory: string | null;
      licenseExpiresAt: Date | null;
      observations: string;
      unitId: string | null;
      userId: string | null;
    };

    const now = new Date();
    const personnel: NewPersonnel[] = [];
    let ciSeq = 1;

    const makePersonnel = (opts: {
      firstName?: string;
      lastName?: string;
      isDriver: boolean;
      isOfficer: boolean;
      isAdmin?: boolean;
      unitId: string | null;
      userId?: string | null;
    }): NewPersonnel => {
      const ci = String(DEMO_CI_BASE + ciSeq++);
      const isDriver = opts.isDriver;
      return {
        id: uuidv7(now.getTime() - ciSeq * 1000),
        ci,
        firstName: opts.firstName ?? pick(FIRST_NAMES),
        lastName: opts.lastName ?? pick(LAST_NAMES),
        rank: pick(RANKS),
        isDriver,
        isOfficer: opts.isOfficer,
        isAdmin: opts.isAdmin ?? false,
        licenseNumber: isDriver ? `LIC-${intBetween(100000, 999999)}` : null,
        licenseCategory: isDriver ? pick(LICENSE_CATEGORIES) : null,
        licenseExpiresAt: isDriver
          ? new Date(
              Date.UTC(
                now.getUTCFullYear() + intBetween(0, 3),
                intBetween(0, 11),
                intBetween(1, 28),
              ),
            )
          : null,
        observations: `${DEMO_NOTE} Ficha de prueba generada por seed-demo.`,
        unitId: opts.unitId,
        userId: opts.userId ?? null,
      };
    };

    const pConductor = makePersonnel({
      firstName: 'Conductor',
      lastName: 'de Prueba',
      isDriver: true,
      isOfficer: false,
      unitId: managedUnitIds[0] ?? null,
      userId: uConductor.id,
    });
    const pTransportes = makePersonnel({
      firstName: 'Encargado',
      lastName: 'de Transportes',
      isDriver: false,
      isOfficer: true,
      unitId: managedUnitIds[0] ?? null,
      userId: uTransportes.id,
    });
    personnel.push(pConductor, pTransportes);

    for (const [user, label] of [
      [uAdmin, 'Administrador'],
      [uCombustible, 'Encargado de Combustible'],
      [uMantenimiento, 'Encargado de Mantenimiento'],
      [uAlmacen, 'Encargado de Almacén'],
      [uConsulta, 'Usuario de Consulta'],
    ] as const) {
      personnel.push(
        makePersonnel({
          firstName: label,
          lastName: 'del Sistema',
          isDriver: false,
          isOfficer: true,
          isAdmin: user.id === uAdmin.id,
          unitId: managedUnitIds[0] ?? null,
          userId: user.id,
        }),
      );
    }

    for (let i = 0; i < EXTRA_PERSONNEL; i++) {
      personnel.push(
        makePersonnel({
          isDriver: i < EXTRA_PERSONNEL - 8,
          isOfficer: i >= EXTRA_PERSONNEL - 8,
          unitId: pick(allUnitIds),
        }),
      );
    }

    await prisma.personnel.createMany({ data: personnel });

    const drivers = personnel.filter((p) => p.isDriver);
    const officers = personnel.filter((p) => p.isOfficer);

    // `transportes` encargado de las unidades elegidas: sin esto su
    // `managedUnitIds` queda vacío y no puede operar sobre nada (spec 015).
    await prisma.transportManagerAssignment.createMany({
      data: managedUnitIds.map((unitId) => ({
        id: uuidv7(now.getTime()),
        unitId,
        officerId: pTransportes.id,
        startDate: new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 15)),
        referenceDocument: `MEMO-DEMO-${intBetween(100, 999)}/${now.getUTCFullYear() - 1}`,
        notes: `${DEMO_NOTE} Designación de prueba.`,
      })),
    });

    // Un conductor encargado por vehículo. Los índices únicos parciales del
    // esquema sólo admiten una vigente por vehículo *y* por conductor, así que
    // se emparejan uno a uno. El vehículo de `conductor` va primero para que
    // «Mi vehículo» siempre tenga contenido.
    const pairable = Math.min(drivers.length, vehicles.length);
    const driverOfVehicle = new Map<string, string>();
    const driverPool = [
      pConductor,
      ...drivers.filter((d) => d.id !== pConductor.id),
    ];
    const vehicleDriverRows = [];
    for (let i = 0; i < pairable; i++) {
      const vehicle = vehicles[i]!;
      const driver = driverPool[i]!;
      driverOfVehicle.set(vehicle.id, driver.id);
      vehicleDriverRows.push({
        id: uuidv7(now.getTime() + i),
        vehicleId: vehicle.id,
        driverId: driver.id,
        startDate: new Date(
          Date.UTC(
            now.getUTCFullYear() - 1,
            intBetween(0, 11),
            intBetween(1, 28),
          ),
        ),
        referenceDocument: `RES-DEMO-${intBetween(100, 999)}`,
        notes: `${DEMO_NOTE} Asignación de prueba.`,
      });
    }
    await prisma.vehicleDriverAssignment.createMany({
      data: vehicleDriverRows,
    });

    // --- Repuestos de prueba (almacén) --------------------------------------
    // El kardex 2025 real no se toca: se agregan artículos propios, algunos
    // bajo el mínimo para que la alerta de stock mínimo tenga de qué disparar.
    const category = await prisma.sparePartCategory.findFirst({
      where: { name: 'Repuesto' },
    });
    const partRows = DEMO_PARTS.map((part, i) => ({
      id: uuidv7(now.getTime() + i),
      code: part.code,
      name: part.name,
      type: 'OTRO' as const,
      unit: part.unit,
      minStock: dec(part.min),
      currentStock: dec(part.stock),
      lastUnitCost: dec(intBetween(40, 900)),
      location: `Estante ${pick(['A', 'B', 'C'])}-${intBetween(1, 9)}`,
      categoryId: category?.id ?? null,
      description: `${DEMO_NOTE} Artículo de prueba.`,
    }));
    await prisma.sparePart.createMany({ data: partRows });
    await prisma.stockMovement.createMany({
      data: partRows.map((part, i) => ({
        id: uuidv7(now.getTime() + i),
        type: 'IN' as const,
        quantity: part.currentStock,
        unitCost: part.lastUnitCost,
        balanceAfter: part.currentStock,
        reason: 'Carga inicial de prueba',
        reference: `ING-DEMO-${String(i + 1).padStart(3, '0')}`,
        sparePartId: part.id,
        registeredById: uAlmacen.id,
      })),
    });

    // --- Tráfico operativo por vehículo -------------------------------------
    // Se recorre cada vehículo en orden cronológico para que el odómetro sea
    // monótono: recorridos, cargas y órdenes comparten el mismo contador.
    const requests: VehicleRequestCreateManyInput[] = [];
    const assignments: AssignmentCreateManyInput[] = [];
    const trips: TripCreateManyInput[] = [];
    const odometers: OdometerReadingCreateManyInput[] = [];
    const fuelRecords: FuelRecordCreateManyInput[] = [];
    const orders: MaintenanceOrderCreateManyInput[] = [];
    const orderItems: MaintenanceItemCreateManyInput[] = [];
    const incidents: IncidentCreateManyInput[] = [];
    const plans: MaintenancePlanCreateManyInput[] = [];

    let reqSeq = 0;
    let orderSeq = 0;
    let incidentSeq = 0;
    const windowStart = new Date(now);
    windowStart.setMonth(windowStart.getMonth() - MONTHS_BACK);
    const windowMs = now.getTime() - windowStart.getTime();

    for (const vehicle of vehicles) {
      const fuel = fuelTypeFor(vehicle.type);
      const unitPrice = priceFor(fuel);
      let odometer = intBetween(12_000, 185_000);
      const tankLitres =
        vehicle.type === 'MOTOCICLETA' ? 12 : intBetween(45, 90);
      const kmPerLitre = consumptionFor(vehicle.type);
      const driverId = driverOfVehicle.get(vehicle.id) ?? pick(drivers).id;
      let lastFuelOdometer: number | null = null;

      // Entre 6 y 16 recorridos al año, repartidos por posición dentro de la
      // ventana en lugar de encadenados sumando intervalos. Dos razones:
      //
      // - Un vehículo no puede estar en dos viajes a la vez. Sortear instantes
      //   al azar y ordenarlos sí lo permite (un recorrido largo seguido de uno
      //   corto), y entonces el retorno posterior registra menos kilómetros que
      //   el anterior y el odómetro deja de ser monótono. Al derivar la salida
      //   del índice, la separación mínima es 0.3 × intervalo —días— contra un
      //   viaje que dura 30 horas como mucho.
      // - Acumulando intervalos la cadena deriva y se agota antes de hoy: los
      //   meses recientes, que son los que miran el panel, el contador "este
      //   mes" y los filtros por defecto, quedaban casi vacíos. Anclado al
      //   índice, la última salida siempre cae dentro del último intervalo.
      const tripCount = intBetween(6, 16);
      const avgGapMs = windowMs / tripCount;

      for (let index = 0; index < tripCount; index++) {
        // El desplazamiento llega hasta 0.95 del intervalo para que la última
        // salida caiga a ~0.05 × intervalo de hoy (poco más de un día) y el mes
        // en curso no quede sin recorridos. El tope lo fija la separación
        // mínima entre salidas consecutivas, (1 − 0.95) × intervalo ≥ 27 h, que
        // tiene que superar la duración máxima de un recorrido; por eso ésta es
        // de 14 h y no de 30 — una comisión policial se cierra el mismo día.
        const ms = windowStart.getTime() + (index + rand() * 0.95) * avgGapMs;
        if (ms >= now.getTime()) break;
        const departureAt = new Date(ms);
        const returnAt = new Date(ms + intBetween(2, 14) * 3_600_000);
        /// Cota inferior de la próxima salida: ubica la carga de combustible
        /// sin que se pase al recorrido siguiente.
        const nextDepartureMs = windowStart.getTime() + (index + 1) * avgGapMs;
        const isLast =
          index === tripCount - 1 || nextDepartureMs >= now.getTime();
        reqSeq += 1;
        const code = `${DEMO_REQUEST_PREFIX}${String(reqSeq).padStart(5, '0')}`;

        // Mezcla de estados para que la bandeja de solicitudes no sea
        // uniformemente aprobada: hay pendientes, rechazadas y canceladas.
        const roll = rand();
        let status: RequestStatus;
        if (isLast && chance(0.35)) status = 'PENDING';
        else if (roll < 0.76) status = 'APPROVED';
        else if (roll < 0.86) status = 'PENDING';
        else if (roll < 0.95) status = 'REJECTED';
        else status = 'CANCELLED';

        const requestId = uuidv7(ms);
        requests.push({
          id: requestId,
          code,
          reason: pick(REQUEST_REASONS),
          destination: pick(DESTINATIONS),
          requestedFrom: departureAt,
          requestedTo: new Date(ms + intBetween(3, 48) * 3_600_000),
          passengers: intBetween(1, 5),
          status,
          reviewNotes:
            status === 'REJECTED'
              ? pick([
                  'Vehículo comprometido en otra comisión',
                  'Falta respaldo de la solicitud',
                ])
              : null,
          reviewedAt: status === 'PENDING' ? null : new Date(ms - 3_600_000),
          reviewedById: status === 'PENDING' ? null : uTransportes.id,
          requesterId: pick([uTransportes.id, uConsulta.id, uAdmin.id]),
          createdAt: new Date(ms - 86_400_000),
        });

        if (status !== 'APPROVED') continue;

        // Recorrido abierto: el último de algunos vehículos se deja sin
        // retorno, que es el estado que la pantalla de recorridos destaca.
        // También queda abierto si el retorno caería en el futuro.
        const open =
          (isLast && chance(0.3)) || returnAt.getTime() > now.getTime();
        const distance = intBetween(18, 420);
        const departureOdometer = odometer;
        odometer += distance;

        const assignmentId = uuidv7(ms);
        assignments.push({
          id: assignmentId,
          requestId,
          vehicleId: vehicle.id,
          driverId,
          assignedById: uTransportes.id,
          assignedAt: departureAt,
          status: open ? 'ACTIVE' : 'COMPLETED',
          notes: null,
          createdAt: departureAt,
        });

        const departureFuelLevel = intBetween(45, 100);
        trips.push({
          id: uuidv7(ms),
          assignmentId,
          departureAt,
          departureOdometer,
          departureFuelLevel,
          departureConditionNotes: chance(0.25)
            ? 'Sin observaciones a la salida.'
            : null,
          returnAt: open ? null : returnAt,
          returnOdometer: open ? null : odometer,
          returnFuelLevel: open
            ? null
            : Math.max(8, departureFuelLevel - intBetween(10, 38)),
          returnConditionNotes: null,
          damagesFound:
            !open && chance(0.07) ? 'Rayón en puerta lateral derecha.' : null,
          incidentNotes: null,
          distanceKm: open ? null : distance,
          departureRegisteredById: uTransportes.id,
          returnRegisteredById: open ? null : uTransportes.id,
          createdAt: departureAt,
        });

        odometers.push({
          id: uuidv7(ms),
          vehicleId: vehicle.id,
          value: departureOdometer,
          readingAt: departureAt,
          source: 'TRIP_DEPARTURE' as OdometerSource,
          notes: DEMO_NOTE,
          registeredById: uTransportes.id,
        });
        if (!open) {
          odometers.push({
            id: uuidv7(returnAt.getTime()),
            vehicleId: vehicle.id,
            value: odometer,
            readingAt: returnAt,
            source: 'TRIP_RETURN' as OdometerSource,
            notes: DEMO_NOTE,
            registeredById: uTransportes.id,
          });
        }

        // Incidente ocasional atado al recorrido.
        if (!open && chance(0.06)) {
          incidentSeq += 1;
          const severity = pick([
            'MINOR',
            'MINOR',
            'MODERATE',
            'SEVERE',
          ]) as IncidentSeverity;
          incidents.push({
            id: uuidv7(returnAt.getTime()),
            code: `${DEMO_INCIDENT_PREFIX}${String(incidentSeq).padStart(4, '0')}`,
            type: pick([
              'ACCIDENTE',
              'AVERIA',
              'INFRACCION',
              'OTRO',
            ]) as IncidentType,
            severity,
            occurredAt: returnAt,
            place: pick(INCIDENT_PLACES),
            description: pick([
              'Colisión leve durante maniobra de estacionamiento.',
              'Falla mecánica en ruta, se requirió remolque.',
              'Infracción de tránsito registrada por radar.',
              'Daño en parabrisas por impacto de piedra.',
            ]),
            damages:
              severity === 'MINOR'
                ? 'Daños menores en carrocería.'
                : 'Daños de consideración.',
            estimatedCost: dec(intBetween(150, 7_800)),
            vehicleId: vehicle.id,
            driverId,
            registeredById: uTransportes.id,
          });
        }

        // Carga de combustible después de la mayoría de los recorridos. Tiene
        // que caer entre el retorno y la salida siguiente: si se desborda hacia
        // el recorrido posterior, su lectura de odómetro (la de *este* viaje)
        // queda cronológicamente después de una lectura mayor y el historial
        // deja de ser monótono. Por lo mismo se omite en un recorrido abierto,
        // que todavía no tiene retorno contra el cual ubicarla.
        const earliestFuelMs = returnAt.getTime() + 3_600_000;
        const latestFuelMs = Math.min(
          earliestFuelMs + 18 * 3_600_000,
          nextDepartureMs - 3_600_000,
        );
        // Los litros salen de la distancia recorrida desde la carga anterior,
        // no al azar: `efficiencyKmPerUnit` se calcula contra esa distancia, y
        // un volumen independiente del kilometraje produce rendimientos
        // imposibles (160 km/l) que ensucian el reporte de combustible.
        const sinceLastFuel =
          lastFuelOdometer === null ? null : odometer - lastFuelOdometer;
        // Ningún tanque rinde más que su autonomía: pasado ~60 % del rango la
        // carga deja de ser opcional. Sin esto el volumen se topa contra la
        // capacidad del tanque y el rendimiento se dispara igual (una moto
        // "haciendo" 66 km/l porque se saltó dos cargas).
        const mustRefuel =
          sinceLastFuel !== null &&
          sinceLastFuel > tankLitres * kmPerLitre * 0.6;
        if (
          !open &&
          latestFuelMs > earliestFuelMs &&
          (mustRefuel || chance(0.72))
        ) {
          const fuelAt = new Date(
            earliestFuelMs + rand() * (latestFuelMs - earliestFuelMs),
          );
          const needed =
            sinceLastFuel === null
              ? tankLitres * (0.35 + rand() * 0.5)
              : (sinceLastFuel / kmPerLitre) * (0.9 + rand() * 0.2);
          const quantity = Math.max(
            5,
            Math.min(tankLitres, Math.round(needed)),
          );
          const efficiency =
            sinceLastFuel === null ? null : dec(sinceLastFuel / quantity);
          lastFuelOdometer = odometer;
          fuelRecords.push({
            id: uuidv7(fuelAt.getTime()),
            suppliedAt: fuelAt,
            fuelType: fuel,
            quantity: dec(quantity),
            unitPrice: dec(unitPrice),
            totalCost: dec(quantity * unitPrice),
            station: pick(STATIONS),
            ticketNumber: `T-${intBetween(100000, 999999)}`,
            odometer,
            efficiencyKmPerUnit: efficiency,
            notes: DEMO_NOTE,
            vehicleId: vehicle.id,
            driverId,
            registeredById: uCombustible.id,
          });
          odometers.push({
            id: uuidv7(fuelAt.getTime()),
            vehicleId: vehicle.id,
            value: odometer,
            readingAt: fuelAt,
            source: 'FUEL' as OdometerSource,
            notes: DEMO_NOTE,
            registeredById: uCombustible.id,
          });
        }
      }

      // --- Órdenes de mantenimiento del vehículo ----------------------------
      const orderCount = intBetween(1, 3);
      for (let i = 0; i < orderCount; i++) {
        orderSeq += 1;
        const startedMs = windowStart.getTime() + rand() * windowMs;
        const startedAt = new Date(startedMs);
        const type: MaintenanceType = chance(0.6) ? 'PREVENTIVE' : 'CORRECTIVE';
        const roll = rand();
        const status: MaintenanceStatus =
          roll < 0.62
            ? 'COMPLETED'
            : roll < 0.8
              ? 'IN_PROGRESS'
              : roll < 0.94
                ? 'SCHEDULED'
                : 'CANCELLED';
        const task = pick(MAINTENANCE_TASKS);
        const description =
          type === 'PREVENTIVE' ? task.name : pick(CORRECTIVE_WORK);
        const labor = intBetween(120, 900);
        const orderId = uuidv7(startedMs);

        const itemCount = intBetween(1, 3);
        let itemsTotal = 0;
        for (let k = 0; k < itemCount; k++) {
          const part = pick(partRows);
          const qty = intBetween(1, 4);
          const unitCost = intBetween(45, 820);
          itemsTotal += qty * unitCost;
          orderItems.push({
            id: uuidv7(startedMs + k),
            orderId,
            description: part.name,
            quantity: dec(qty),
            unitCost: dec(unitCost),
            subtotal: dec(qty * unitCost),
            sparePartId: part.id,
          });
        }

        const completed = status === 'COMPLETED';
        orders.push({
          id: orderId,
          code: `${DEMO_ORDER_PREFIX}${String(orderSeq).padStart(5, '0')}`,
          type,
          status,
          description,
          workshopName: pick(WORKSHOPS),
          odometer: Math.max(1, odometer - intBetween(0, 4_000)),
          scheduledFor: startedAt,
          startedAt: status === 'SCHEDULED' ? null : startedAt,
          finishedAt: completed
            ? new Date(startedMs + intBetween(4, 120) * 3_600_000)
            : null,
          laborCost: dec(labor),
          totalCost: completed ? dec(labor + itemsTotal) : dec(0),
          invoiceNumber: completed ? `FAC-${intBetween(10000, 99999)}` : null,
          vehicleId: vehicle.id,
          registeredById: uMantenimiento.id,
          createdAt: startedAt,
        });
      }

      // Planes de mantenimiento: algunos ya vencidos contra el odómetro actual,
      // que es lo que alimenta el aviso de «próximo servicio» (RF-06).
      for (const task of MAINTENANCE_TASKS) {
        const lastService = Math.max(
          0,
          odometer - intBetween(1_000, task.interval),
        );
        plans.push({
          id: uuidv7(now.getTime()),
          vehicleId: vehicle.id,
          taskName: task.name,
          intervalKm: task.interval,
          lastServiceOdometer: lastService,
          lastServiceAt: new Date(
            now.getTime() - intBetween(20, 300) * 86_400_000,
          ),
          nextDueOdometer: lastService + task.interval,
          isActive: true,
        });
      }
    }

    // --- Inserción ----------------------------------------------------------
    // El orden respeta las FK: solicitud → asignación → recorrido, y recién
    // después lo que cuelga del recorrido.
    await prisma.vehicleRequest.createMany({ data: requests });
    await prisma.assignment.createMany({ data: assignments });
    await prisma.trip.createMany({ data: trips });
    await prisma.odometerReading.createMany({ data: odometers });
    await prisma.fuelRecord.createMany({ data: fuelRecords });
    await prisma.maintenanceOrder.createMany({ data: orders });
    await prisma.maintenanceItem.createMany({ data: orderItems });
    await prisma.incident.createMany({ data: incidents });
    await prisma.maintenancePlan.createMany({ data: plans });

    console.log(`
Tráfico de prueba generado (${MONTHS_BACK} meses, ${vehicles.length} vehículos):

  Personal                 ${personnel.length}   (7 fichas vinculadas a las cuentas de prueba)
  Encargaturas de unidad   ${managedUnitIds.length}   (usuario "transportes")
  Conductor ↔ vehículo     ${vehicleDriverRows.length}
  Solicitudes              ${requests.length}
  Asignaciones             ${assignments.length}
  Recorridos               ${trips.length}
  Lecturas de odómetro     ${odometers.length}
  Cargas de combustible    ${fuelRecords.length}
  Órdenes de mantenimiento ${orders.length}  (+ ${orderItems.length} ítems)
  Planes de mantenimiento  ${plans.length}
  Incidentes               ${incidents.length}
  Repuestos de prueba      ${partRows.length}  (varios bajo stock mínimo)

Entrar con cualquiera de los usuarios del seed (contraseña Test1234.):
  conductor    → «Mi vehículo» ya resuelve: tiene ficha y vehículo a cargo.
  transportes  → encargado de ${managedUnitIds.length} unidades; su alcance ya no está vacío.
  combustible / mantenimiento / almacen / consulta / administrador.

Para quitarlo todo sin tocar el censo real:  bun run prisma:seed:demo --reset
`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
