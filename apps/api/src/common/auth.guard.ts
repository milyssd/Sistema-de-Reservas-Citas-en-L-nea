import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { getConfig } from './config';
import { PrismaService } from './prisma.service';
import { RateLimitService } from './rate-limit';

export interface AuthUser {
  id: string;
  businessId: string;
  role: string;
  name: string;
  email: string;
  staffId?: string;
  customerId?: string;
  sessionId: string;
}
export interface AuthRequest extends Request {
  user: AuthUser;
  id: string;
}
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<AuthRequest>().user,
);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RateLimitService) private readonly limiter: RateLimitService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer '))
      throw new UnauthorizedException('Inicia sesión para continuar.');
    try {
      const claims = await this.jwt.verifyAsync<{ sub: string; sid: string; businessId: string }>(
        authorization.slice(7),
        {
          secret: getConfig().JWT_SECRET,
          algorithms: ['HS256'],
          issuer: 'reservas-api',
          audience: 'reservas-clients',
        },
      );
      if (claims.businessId !== getConfig().BUSINESS_ID || !claims.sub || !claims.sid)
        throw new Error('Invalid token');
      const session = await this.prisma.refreshSession.findFirst({
        where: {
          id: claims.sid,
          userId: claims.sub,
          businessId: claims.businessId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { user: { include: { customer: true, staff: true } } },
      });
      if (!session || session.user.deletedAt) throw new Error('Invalid session');
      const user = session.user;
      request.user = {
        id: user.id,
        businessId: user.businessId,
        role: user.role,
        name: user.name,
        email: user.email,
        sessionId: session.id,
        ...(user.staff ? { staffId: user.staff.id } : {}),
        ...(user.customer ? { customerId: user.customer.id } : {}),
      };
    } catch {
      throw new UnauthorizedException('La sesión expiró. Inicia sesión nuevamente.');
    }
    const sensitive =
      (request.path.includes('/bookings') && request.method !== 'GET') ||
      request.path.includes('/payments');
    await this.limiter.consume(
      `authenticated:${sensitive ? 'write' : 'read'}:${request.user.businessId}:${request.user.id}`,
      sensitive ? 30 : 180,
      60000,
      context.switchToHttp().getResponse(),
    );
    return true;
  }
}
@Injectable()
export class OptionalAuthGuard extends AuthGuard {
  override canActivate(context: ExecutionContext): Promise<boolean> {
    if (!context.switchToHttp().getRequest<Request>().headers.authorization)
      return Promise.resolve(true);
    return super.canActivate(context);
  }
}
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest<AuthRequest>().user;
    if (!user || !roles.includes(user.role))
      throw new ForbiddenException('No tienes permiso para esta acción.');
    return true;
  }
}
