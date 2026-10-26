import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { z } from 'zod';
import {
  AuthGuard,
  AuthRequest,
  AuthUser,
  CurrentUser,
  Roles,
  RolesGuard,
} from '../common/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { cursorSchema, uuidSchema } from '../common/validation';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get('me')
  profile(@CurrentUser() user: AuthUser) {
    return this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerifiedAt: true,
        notificationPreferences: true,
        totpEnabled: true,
        version: true,
      },
    });
  }
  @Patch('me')
  async update(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
    @Headers('if-match') match?: string,
  ) {
    const input = z
      .object({
        name: z.string().trim().min(2).max(120).optional(),
        phone: z
          .string()
          .regex(/^\+591[67]\d{7}$/)
          .optional(),
        notificationPreferences: z
          .object({ email: z.boolean(), push: z.boolean() })
          .strict()
          .optional(),
      })
      .strict()
      .parse(body);
    const version = this.version(match);
    const result = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id: user.id, businessId: user.businessId, version },
        data: { ...input, version: { increment: 1 } },
      });
      if (changed.count)
        await tx.customer.updateMany({
          where: { userId: user.id, businessId: user.businessId },
          data: { name: input.name, phone: input.phone },
        });
      return changed;
    });
    if (!result.count)
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'El perfil cambió. Vuelve a cargarlo.',
      });
    return this.profile(user);
  }
  @Get('me/export')
  async export(@CurrentUser() user: AuthUser) {
    const [profile, customer, bookings, notifications] = await Promise.all([
      this.profile(user),
      this.prisma.customer.findUnique({
        where: { userId: user.id },
        select: { id: true, name: true, email: true, phone: true },
      }),
      this.prisma.booking.findMany({
        where: { businessId: user.businessId, customer: { userId: user.id } },
        include: {
          items: true,
          payments: {
            select: { id: true, amount: true, status: true, method: true, createdAt: true },
          },
        },
      }),
      this.prisma.notification.findMany({
        where: { businessId: user.businessId, userId: user.id },
        select: { event: true, subject: true, status: true, createdAt: true },
      }),
    ]);
    return { exportedAt: new Date().toISOString(), profile, customer, bookings, notifications };
  }
  @Delete('me')
  async delete(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = z
      .object({ password: z.string().min(1).max(128), confirm: z.literal('ELIMINAR') })
      .strict()
      .parse(body);
    if (['OWNER', 'SUPERADMIN'].includes(user.role))
      throw new ForbiddenException(
        'Transfiere la propiedad del negocio antes de eliminar tu cuenta.',
      );
    const record = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await argon2.verify(record.passwordHash, input.password)))
      throw new ForbiddenException('Contraseña incorrecta.');
    const anonymized = `deleted-${user.id}@invalid.local`;
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.updateMany({
        where: { userId: user.id },
        data: { revokedAt: new Date() },
      });
      await tx.authToken.deleteMany({ where: { userId: user.id } });
      await tx.deviceToken.deleteMany({ where: { userId: user.id } });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.customer.updateMany({
        where: { userId: user.id },
        data: {
          name: 'Cuenta eliminada',
          email: anonymized,
          phone: '',
          internalNotes: null,
          tags: Prisma.JsonNull,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: 'Cuenta eliminada',
          email: anonymized,
          phone: null,
          passwordHash: await argon2.hash(randomBytes(32)),
          deletedAt: new Date(),
          totpSecret: null,
          totpEnabled: false,
          notificationPreferences: Prisma.JsonNull,
        },
      });
      await tx.auditLog.create({
        data: {
          businessId: user.businessId,
          action: 'ACCOUNT_DELETED',
          entityType: 'User',
          entityId: user.id,
        },
      });
    });
    return {
      message:
        'Cuenta eliminada. Los registros contables anonimizados se conservan según la política del negocio.',
    };
  }
  @Get()
  @Roles('ADMIN', 'OWNER')
  async list(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    const { cursor, limit } = cursorSchema.parse(query);
    const items = await this.prisma.user.findMany({
      where: {
        businessId: user.businessId,
        deletedAt: null,
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: { id: true, name: true, email: true, role: true, version: true },
      orderBy: { id: 'asc' },
      take: limit + 1,
    });
    const more = items.length > limit;
    if (more) items.pop();
    return { items, nextCursor: more ? items.at(-1)?.id : null };
  }
  @Patch(':id/role')
  @Roles('OWNER')
  async role(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('if-match') match: string | undefined,
    @Req() req: AuthRequest,
  ) {
    uuidSchema.parse(id);
    const input = z
      .object({ role: z.enum(['CLIENT', 'STAFF', 'ADMIN']) })
      .strict()
      .parse(body);
    if (id === user.id) throw new ForbiddenException('No puedes cambiar tu propio rol.');
    const target = await this.prisma.user.findFirst({
      where: { id, businessId: user.businessId, deletedAt: null },
    });
    if (!target) throw new NotFoundException();
    if (['OWNER', 'SUPERADMIN'].includes(target.role)) throw new ForbiddenException();
    const changed = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id, businessId: user.businessId, version: this.version(match) },
        data: { role: input.role, version: { increment: 1 } },
      });
      if (result.count)
        await tx.auditLog.create({
          data: {
            businessId: user.businessId,
            userId: user.id,
            action: 'USER_ROLE_CHANGED',
            entityType: 'User',
            entityId: id,
            ip: req.ip,
            requestId: req.id,
            metadata: { previous: target.role, next: input.role },
          },
        });
      return result;
    });
    if (!changed.count)
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'El usuario cambió. Vuelve a cargarlo.',
      });
    return { id, role: input.role, version: target.version + 1 };
  }
  private version(match?: string) {
    return z.coerce.number().int().positive().parse(match?.replaceAll('"', ''));
  }
}
