import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { authenticator } from 'otplib';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service';
import { getConfig } from '../common/config';
import { AuthUser } from '../common/auth.guard';
import { loginSchema, registerSchema } from './auth.schemas';

export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
const newToken = () => randomBytes(48).toString('base64url');
const dummyPassword = argon2.hash(randomBytes(24).toString('hex'));
type Agent = { ip?: string; userAgent?: string };

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}
  async register(input: z.infer<typeof registerSchema>, agent: Agent) {
    const config = getConfig();
    const business = await this.prisma.business.findUnique({ where: { id: config.BUSINESS_ID } });
    if (!business) throw new BadRequestException('El negocio todavía no está configurado.');
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    let user: User;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const existingGuest = await tx.customer.findUnique({
          where: { businessId_email: { businessId: config.BUSINESS_ID, email: input.email } },
        });
        // A password registration does not prove ownership of an existing guest's email.
        return tx.user.create({
          data: {
            businessId: config.BUSINESS_ID,
            name: input.name,
            email: input.email,
            phone: input.phone,
            passwordHash,
            ...(!existingGuest
              ? {
                  customer: {
                    create: { name: input.name, email: input.email, phone: input.phone },
                  },
                }
              : {}),
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException({
          code: 'ACCOUNT_EXISTS',
          message: 'No se pudo registrar esta cuenta. Puedes intentar recuperar el acceso.',
        });
      throw error;
    }
    await this.issueActionToken(user, 'VERIFY_EMAIL');
    return this.issueSession(user, randomUUID(), agent);
  }
  async login(input: z.infer<typeof loginSchema>, agent: Agent) {
    const user = await this.prisma.user.findUnique({
      where: { businessId_email: { businessId: getConfig().BUSINESS_ID, email: input.email } },
    });
    const valid = await argon2.verify(user?.passwordHash ?? (await dummyPassword), input.password);
    if (!user || user.deletedAt || (user.lockedUntil && user.lockedUntil > new Date()))
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    if (!valid) {
      const failed = await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
      });
      if (failed.failedLoginAttempts >= 5)
        await this.prisma.user.update({
          where: { id: user.id },
          data: { lockedUntil: new Date(Date.now() + 15 * 60000) },
        });
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    if (
      user.totpEnabled &&
      (!input.totpCode ||
        !user.totpSecret ||
        !authenticator.check(input.totpCode, this.decrypt(user.totpSecret)))
    )
      throw new UnauthorizedException({
        code: 'TOTP_REQUIRED',
        message: 'Ingresa un código de autenticación válido.',
      });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    await this.prisma.auditLog.create({
      data: {
        businessId: user.businessId,
        userId: user.id,
        action: 'AUTH_LOGIN',
        entityType: 'User',
        entityId: user.id,
        ip: agent.ip,
      },
    });
    return this.issueSession(user, randomUUID(), agent);
  }
  private async issueSession(user: User, familyId: string, agent: Agent) {
    const refreshToken = newToken();
    const session = await this.prisma.refreshSession.create({
      data: {
        businessId: user.businessId,
        userId: user.id,
        tokenHash: tokenHash(refreshToken),
        familyId,
        userAgent: agent.userAgent?.slice(0, 512),
        ip: agent.ip?.slice(0, 45),
        expiresAt: new Date(Date.now() + getConfig().AUTH_REFRESH_DAYS * 86400000),
      },
    });
    return this.result(user, session.id, refreshToken);
  }
  private async result(user: User, sessionId: string, refreshToken: string) {
    const [customer, staff] = await Promise.all([
      this.prisma.customer.findUnique({ where: { userId: user.id }, select: { id: true } }),
      this.prisma.staff.findUnique({ where: { userId: user.id }, select: { id: true } }),
    ]);
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, sid: sessionId, businessId: user.businessId },
      {
        secret: getConfig().JWT_SECRET,
        expiresIn: '15m',
        algorithm: 'HS256',
        issuer: 'reservas-api',
        audience: 'reservas-clients',
      },
    );
    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        businessId: user.businessId,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: Boolean(user.emailVerifiedAt),
        ...(customer ? { customerId: customer.id } : {}),
        ...(staff ? { staffId: staff.id } : {}),
      },
    };
  }
  async refresh(rawToken: string, agent: Agent) {
    const nextToken = newToken();
    const outcome = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.refreshSession.findUnique({
        where: { tokenHash: tokenHash(rawToken) },
        include: { user: true },
      });
      if (
        !previous ||
        previous.businessId !== getConfig().BUSINESS_ID ||
        previous.user.deletedAt ||
        previous.expiresAt <= new Date()
      )
        return null;
      if (previous.revokedAt) {
        await tx.refreshSession.updateMany({
          where: { familyId: previous.familyId },
          data: { revokedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            businessId: previous.businessId,
            userId: previous.userId,
            action: 'REFRESH_REUSE_DETECTED',
            entityType: 'RefreshSession',
            entityId: previous.id,
            ip: agent.ip,
          },
        });
        return null;
      }
      const claimed = await tx.refreshSession.updateMany({
        where: { id: previous.id, revokedAt: null },
        data: { revokedAt: new Date(), lastUsedAt: new Date() },
      });
      if (claimed.count !== 1) {
        await tx.refreshSession.updateMany({
          where: { familyId: previous.familyId },
          data: { revokedAt: new Date() },
        });
        return null;
      }
      const next = await tx.refreshSession.create({
        data: {
          businessId: previous.businessId,
          userId: previous.userId,
          familyId: previous.familyId,
          tokenHash: tokenHash(nextToken),
          expiresAt: new Date(Date.now() + getConfig().AUTH_REFRESH_DAYS * 86400000),
          userAgent: agent.userAgent?.slice(0, 512),
          ip: agent.ip?.slice(0, 45),
        },
      });
      await tx.refreshSession.update({
        where: { id: previous.id },
        data: { replacedById: next.id },
      });
      return { user: previous.user, id: next.id };
    });
    if (!outcome) throw new UnauthorizedException('La sesión expiró. Inicia sesión nuevamente.');
    return this.result(outcome.user, outcome.id, nextToken);
  }
  async logout(rawToken?: string) {
    if (!rawToken) return;
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash: tokenHash(rawToken) },
    });
    if (session?.businessId === getConfig().BUSINESS_ID)
      await this.prisma.refreshSession.updateMany({
        where: { familyId: session.familyId, businessId: session.businessId },
        data: { revokedAt: new Date() },
      });
  }
  async requestAction(email: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD') {
    const user = await this.prisma.user.findUnique({
      where: { businessId_email: { businessId: getConfig().BUSINESS_ID, email } },
    });
    if (user && !user.deletedAt && !(purpose === 'VERIFY_EMAIL' && user.emailVerifiedAt))
      await this.issueActionToken(user, purpose);
    return { message: 'Si la cuenta existe, recibirás las instrucciones en tu correo.' };
  }
  private async issueActionToken(user: User, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD') {
    const raw = newToken();
    const link = `${getConfig().WEB_ORIGIN}/${purpose === 'VERIFY_EMAIL' ? 'verificar-correo' : 'recuperar'}?token=${encodeURIComponent(raw)}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.authToken.updateMany({
        where: { userId: user.id, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await tx.authToken.create({
        data: {
          businessId: user.businessId,
          userId: user.id,
          tokenHash: tokenHash(raw),
          purpose,
          expiresAt: new Date(Date.now() + (purpose === 'VERIFY_EMAIL' ? 86400000 : 3600000)),
        },
      });
      await tx.notification.create({
        data: {
          businessId: user.businessId,
          userId: user.id,
          recipient: user.email,
          event: purpose,
          channel: 'EMAIL',
          subject: purpose === 'VERIFY_EMAIL' ? 'Verifica tu correo' : 'Recupera tu acceso',
          body: `Hola ${user.name}. Abre este enlace de un solo uso: ${link}`,
        },
      });
    });
  }
  async consumeAction(raw: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD', password?: string) {
    const passwordHash = password
      ? await argon2.hash(password, { type: argon2.argon2id })
      : undefined;
    const succeeded = await this.prisma.$transaction(async (tx) => {
      const token = await tx.authToken.findUnique({ where: { tokenHash: tokenHash(raw) } });
      if (
        !token ||
        token.businessId !== getConfig().BUSINESS_ID ||
        token.purpose !== purpose ||
        token.consumedAt ||
        token.expiresAt <= new Date()
      )
        return false;
      const claimed = await tx.authToken.updateMany({
        where: { id: token.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (!claimed.count) return false;
      const user = await tx.user.update({
        where: { id: token.userId },
        data:
          purpose === 'VERIFY_EMAIL'
            ? { emailVerifiedAt: new Date() }
            : { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      });
      if (purpose === 'VERIFY_EMAIL')
        await tx.customer.updateMany({
          where: { businessId: user.businessId, email: user.email, userId: null },
          data: { userId: user.id, name: user.name, ...(user.phone ? { phone: user.phone } : {}) },
        });
      if (purpose === 'RESET_PASSWORD')
        await tx.refreshSession.updateMany({
          where: { userId: token.userId },
          data: { revokedAt: new Date() },
        });
      return true;
    });
    if (!succeeded)
      throw new BadRequestException({
        code: 'TOKEN_INVALID',
        message: 'El enlace ya fue utilizado o expiró.',
      });
    return {
      message:
        purpose === 'VERIFY_EMAIL'
          ? 'Correo verificado.'
          : 'Contraseña actualizada. Inicia sesión nuevamente.',
    };
  }
  private encryptionKey() {
    const key = getConfig().AUTH_ENCRYPTION_KEY;
    if (!key)
      throw new BadRequestException(
        'El administrador debe configurar AUTH_ENCRYPTION_KEY para activar 2FA.',
      );
    return Buffer.from(key, 'hex');
  }
  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${ciphertext.toString('hex')}`;
  }
  private decrypt(value: string) {
    const [iv, tag, ciphertext] = value.split(':');
    const cipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(iv, 'hex'));
    cipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([cipher.update(Buffer.from(ciphertext, 'hex')), cipher.final()]).toString(
      'utf8',
    );
  }
  async setupTotp(user: AuthUser) {
    if (!['OWNER', 'ADMIN'].includes(user.role))
      throw new ForbiddenException('2FA disponible para administración.');
    const record = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (record.totpEnabled)
      throw new ConflictException('La autenticación de dos factores ya está activa.');
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: this.encrypt(secret) },
    });
    return { secret, uri: authenticator.keyuri(user.email, 'Reservas Bolivia', secret) };
  }
  async confirmTotp(user: AuthUser, code: string, enabled: boolean) {
    const record = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!record.totpSecret || !authenticator.check(code, this.decrypt(record.totpSecret)))
      throw new UnauthorizedException('Código de autenticación incorrecto.');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { totpEnabled: enabled, ...(!enabled ? { totpSecret: null } : {}) },
      }),
      this.prisma.auditLog.create({
        data: {
          businessId: user.businessId,
          userId: user.id,
          action: enabled ? 'TOTP_ENABLED' : 'TOTP_DISABLED',
          entityType: 'User',
          entityId: user.id,
        },
      }),
    ]);
    return { enabled };
  }
}
