import { Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'argon2';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { withUniqueConstraintHandling } from '../../common/prisma-errors.js';
import { CreateUserInput } from './dto/create-user.input.js';
import { UpdateUserInput } from './dto/update-user.input.js';
import { UserFilterArgs } from './dto/user-filter.args.js';

/**
 * Único lugar con decisiones sobre cuentas de usuario (spec 004). El nombre
 * de usuario se normaliza a minúsculas y sin espacios sobrantes antes de
 * guardar o comparar (RF-3); la contraseña nunca se guarda ni se devuelve
 * en texto plano, sólo como hash Argon2 (RF-1, RF-12).
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: UserFilterArgs) {
    const where: Prisma.UserWhereInput = {
      ...(filters.roleId ? { roleId: filters.roleId } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [
              { username: { contains: filters.search, mode: 'insensitive' } },
              { fullName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    return user;
  }

  /// Campo resuelto `role` en el resolver: un usuario persistido siempre
  /// tiene un rol válido (FK con onDelete: Restrict).
  getRole(roleId: string) {
    return this.prisma.role.findUniqueOrThrow({ where: { id: roleId } });
  }

  /// RF-13: catálogo cerrado para el selector del formulario de usuario.
  listRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async create(input: CreateUserInput) {
    await this.findRoleOrThrow(input.roleId);
    const passwordHash = await hash(input.password);

    return withUniqueConstraintHandling(
      () =>
        this.prisma.user.create({
          data: {
            username: this.normalizeUsername(input.username),
            passwordHash,
            fullName: input.fullName,
            email: input.email,
            rank: input.rank,
            phone: input.phone,
            roleId: input.roleId,
          },
        }),
      'Ya existe un usuario con ese',
    );
  }

  async update(id: string, input: UpdateUserInput) {
    await this.findOne(id);
    if (input.roleId) {
      await this.findRoleOrThrow(input.roleId);
    }

    const { password, username, ...rest } = input;
    const passwordHash = password ? await hash(password) : undefined;

    return withUniqueConstraintHandling(
      () =>
        this.prisma.user.update({
          where: { id },
          data: {
            ...rest,
            ...(username ? { username: this.normalizeUsername(username) } : {}),
            ...(passwordHash ? { passwordHash } : {}),
          },
        }),
      'Ya existe un usuario con ese',
    );
  }

  /// RF-9: la baja es reversible y no borra el registro.
  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /// RF-10: conserva rol y contraseña sin cambios.
  async reactivate(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /// RF-6: el rol es una lista cerrada; un id que no existe se rechaza con
  /// un mensaje claro en vez de dejar pasar el error crudo de la FK.
  private async findRoleOrThrow(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Rol ${roleId} no encontrado`);
    }
    return role;
  }

  /// RF-3: minúsculas y sin espacios sobrantes, para que "Jperez" y
  /// "jperez " sean la misma cuenta.
  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }
}
