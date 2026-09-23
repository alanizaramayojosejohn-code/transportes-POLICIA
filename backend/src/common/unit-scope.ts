import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../modules/auth/auth.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/** `null` = sin restricción; un arreglo = sólo esas unidades (spec 015, RF-12 a RF-15). */
export type UnitScope = string[] | null;

/**
 * Alcance por unidad (spec 015). `null` significa sin restricción
 * (ADMINISTRADOR, y cualquier rol que no se acote por unidad); un arreglo
 * significa "sólo estas unidades", posiblemente vacío si el usuario todavía
 * no es encargado de ninguna.
 */
export function unitScopeFor(user: AuthenticatedUser): UnitScope {
  if (user.role === 'TRANSPORTES') {
    return user.managedUnitIds;
  }
  return null;
}

/**
 * RF-14: rechaza si la unidad indicada no está dentro del alcance. Los
 * services reciben el `UnitScope` ya resuelto (no `AuthenticatedUser`
 * completo) para no acoplarse al módulo de auth.
 */
export function assertInScope(scope: UnitScope, unitId: string | null): void {
  if (scope === null) {
    return;
  }
  if (!unitId || !scope.includes(unitId)) {
    throw new ForbiddenException(
      'No tiene permiso para operar sobre esa unidad',
    );
  }
}

/**
 * RF-14, variante para módulos que no tienen `unitId` propio pero cuelgan de
 * un vehículo (recorridos, combustible, incidentes): rechaza si ese vehículo
 * no tiene asignación vigente a alguna unidad del alcance. A diferencia de
 * `assertInScope`, necesita consultar `UnitAssignment` porque el vínculo
 * vehículo → unidad es indirecto.
 */
export async function assertVehicleInScope(
  prisma: PrismaService,
  scope: UnitScope,
  vehicleId: string,
): Promise<void> {
  if (scope === null) {
    return;
  }
  const current = await prisma.unitAssignment.findFirst({
    where: { vehicleId, endDate: null, unitId: { in: scope } },
  });
  if (!current) {
    throw new ForbiddenException(
      'No tiene permiso para operar sobre ese vehículo',
    );
  }
}
