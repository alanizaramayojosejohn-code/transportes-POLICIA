import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from './auth.types.js';

/**
 * Construye el `AuthenticatedUser` completo (con alcance por unidad, spec
 * 015) a partir de un `User` ya cargado con su rol y su ficha de personal.
 * Compartido por `AuthService.login` y `JwtStrategy.validate` para que las
 * dos rutas de entrada a una sesión calculen el alcance igual.
 */
export async function resolveAuthenticatedUser(
  prisma: PrismaService,
  user: {
    id: string;
    username: string;
    fullName: string;
    role: { code: string };
  },
  personnelId: string | null,
): Promise<AuthenticatedUser> {
  const managedUnitIds = personnelId
    ? (
        await prisma.transportManagerAssignment.findMany({
          where: { officerId: personnelId, endDate: null },
          select: { unitId: true },
        })
      ).map((assignment) => assignment.unitId)
    : [];

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role.code,
    personnelId,
    managedUnitIds,
  };
}
