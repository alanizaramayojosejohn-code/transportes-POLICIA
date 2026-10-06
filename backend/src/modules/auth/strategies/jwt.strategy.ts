import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { resolveAuthenticatedUser } from '../resolve-authenticated-user.js';
import type { AuthenticatedUser, JwtPayload } from '../auth.types.js';

/**
 * Verifica el JWT de cada petición y recarga el usuario desde la base en
 * vez de confiar en lo que traiga el token: si se dio de baja o le
 * cambiaron el rol después de emitirlo, se entera en la siguiente petición,
 * no recién cuando expire (spec 013, casos límite).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') ?? '',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, personnel: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sesión no válida');
    }
    return resolveAuthenticatedUser(
      this.prisma,
      user,
      user.personnel?.id ?? null,
    );
  }
}
