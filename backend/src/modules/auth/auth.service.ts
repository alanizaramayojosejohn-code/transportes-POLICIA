import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify } from 'argon2';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LoginInput } from './dto/login.input.js';
import { resolveAuthenticatedUser } from './resolve-authenticated-user.js';
import type { AuthenticatedUser } from './auth.types.js';

const INVALID_CREDENTIALS_MESSAGE = 'Usuario o contraseña incorrectos';

/**
 * Único lugar que verifica credenciales y emite tokens (spec 013). El
 * mensaje de rechazo es siempre el mismo sin importar si el usuario no
 * existe, la contraseña no coincide o la cuenta está inactiva: no hay que
 * revelar cuál de las tres pasó (RF-2).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    input: LoginInput,
  ): Promise<{ accessToken: string; user: AuthenticatedUser }> {
    const user = await this.prisma.user.findUnique({
      where: { username: this.normalizeUsername(input.username) },
      include: { role: true, personnel: true },
    });

    if (
      !user ||
      !user.isActive ||
      !(await verify(user.passwordHash, input.password))
    ) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authUser = await resolveAuthenticatedUser(
      this.prisma,
      user,
      user.personnel?.id ?? null,
    );

    const accessToken = await this.jwtService.signAsync({
      sub: authUser.id,
      username: authUser.username,
      role: authUser.role,
    });

    return { accessToken, user: authUser };
  }

  /// RF-3: mismo criterio de normalización que el alta de cuentas (spec 004).
  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }
}
