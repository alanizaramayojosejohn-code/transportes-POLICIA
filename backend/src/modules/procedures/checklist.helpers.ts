import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ProcedureChecklistItemInput } from './dto/procedure-checklist-item.input.js';

export interface ChecklistParentLinks {
  vehicleId?: string;
  fuelRecordId?: string;
  stockMovementId?: string;
  maintenanceOrderId?: string;
}

/**
 * RF-9/RF-10: guarda un ítem de checklist por cada tipo de trámite que el
 * formulario mostró al registrar vehículo, vale de combustible, entrega de
 * refacciones u orden de mantenimiento. Función libre (no un servicio
 * inyectado) para que los cuatro módulos dueños de esas acciones la llamen
 * dentro de su propia `$transaction` (NFR: alta y checklist en una sola
 * transacción) sin depender de `ProceduresModule`.
 */
export async function saveChecklistItems(
  tx: Prisma.TransactionClient,
  items: ProcedureChecklistItemInput[] | undefined,
  links: ChecklistParentLinks,
): Promise<void> {
  if (!items || items.length === 0) {
    return;
  }

  const ids = [...new Set(items.map((item) => item.procedureTypeId))];
  const found = await tx.procedureType.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  if (found.length !== ids.length) {
    throw new NotFoundException('Tipo de trámite no encontrado');
  }

  await tx.procedureChecklistItem.createMany({
    data: items.map((item) => ({
      procedureTypeId: item.procedureTypeId,
      completed: item.completed ?? false,
      documentCode: item.documentCode,
      ...links,
    })),
  });
}
