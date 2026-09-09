import { ConflictException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';

/**
 * Traduce el error de restricción única de Prisma (P2002) a un
 * `ConflictException` legible, en vez de dejar pasar el error crudo del
 * driver. Compartido por los servicios de vehicles/units/unit-assignments.
 */
interface DriverAdapterConstraintMeta {
  target?: string[];
  modelName?: string;
  driverAdapterError?: {
    cause?: { constraint?: { index?: string } };
  };
}

/// Con el driver adapter de Prisma 7 (@prisma/adapter-pg), el P2002 no trae
/// `meta.target` (eso es del motor Rust clásico): el nombre de columna hay
/// que sacarlo del nombre del índice de Postgres, que sigue el patrón
/// `<tabla>_<columna(s)>_key`.
function describeConflictingField(
  meta: DriverAdapterConstraintMeta | undefined,
): string {
  if (meta?.target) {
    return meta.target.join(', ');
  }
  const index = meta?.driverAdapterError?.cause?.constraint?.index;
  if (!index) {
    return 'campo único';
  }
  const tablePrefix = meta?.modelName ? `${meta.modelName.toLowerCase()}_` : '';
  const withoutTable =
    tablePrefix && index.startsWith(tablePrefix)
      ? index.slice(tablePrefix.length)
      : index;
  const field = withoutTable.replace(/_key$|_pkey$/, '');
  return field || 'campo único';
}

export async function withUniqueConstraintHandling<T>(
  operation: () => Promise<T>,
  /** P. ej. "Ya existe un vehículo con ese" — se le agrega el campo detectado. */
  conflictMessage = 'Ya existe un registro con ese',
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const field = describeConflictingField(
        error.meta as DriverAdapterConstraintMeta | undefined,
      );
      throw new ConflictException(`${conflictMessage} ${field}`);
    }
    throw error;
  }
}
