import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard, AuthUser, CurrentUser, Roles, RolesGuard } from '../common/auth.guard';
import { getConfig } from '../common/config';
import { PrismaService } from '../common/prisma.service';
import { RateLimitService } from '../common/rate-limit';
import { cursorSchema, uuidSchema } from '../common/validation';
import {
  emailSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetSchema,
  tokenSchema,
  totpSchema,
} from './auth.schemas';
import { AuthService, tokenHash } from './auth.service';
import {
  authResponseSchema,
  userResponseSchema,
  refreshRequestSchema,
  messageResponseSchema,
  emailRequestSchema,
  tokenRequestSchema,
} from './auth.openapi';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RateLimitService) private readonly limiter: RateLimitService,
  ) {}
  private agent(req: Request) {
    return { ip: req.ip, userAgent: req.get('user-agent') };
  }
  private origin(req: Request, cookie = false) {
    if (
      (req.headers.origin && req.headers.origin !== getConfig().WEB_ORIGIN) ||
      (cookie &&
        (req.headers.origin !== getConfig().WEB_ORIGIN ||
          req.get('X-Requested-With') !== 'reservas-client'))
    )
      throw new ForbiddenException({
        code: 'CSRF_REJECTED',
        message: 'Origen de solicitud no permitido.',
      });
  }
  private send(
    res: Response,
    platform: 'web' | 'mobile',
    result: Awaited<ReturnType<AuthService['login']>>,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    if (platform === 'web') {
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: getConfig().NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: getConfig().AUTH_REFRESH_DAYS * 86400000,
      });
      const { refreshToken: _secret, ...publicResult } = result;
      return publicResult;
    }
    return result;
  }
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ schema: authResponseSchema })
  @ApiOperation({ summary: 'Login web (cookie) o móvil (refresh token en respuesta)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      additionalProperties: false,
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 1 },
        platform: { type: 'string', enum: ['web', 'mobile'], default: 'web' },
        totpCode: { type: 'string', pattern: '^\\d{6}$' },
      },
    },
  })
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.origin(req);
    await this.limiter.request(req, res, 'login', 10, 60000);
    const input = loginSchema.parse(body);
    await this.limiter.consume(`login:email:${tokenHash(input.email)}`, 20, 15 * 60000, res);
    return this.send(res, input.platform, await this.auth.login(input, this.agent(req)));
  }
  @Post('register')
  @ApiCreatedResponse({ schema: authResponseSchema })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'phone', 'password'],
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string', example: '+59170123456' },
        password: { type: 'string', minLength: 12 },
        platform: { type: 'string', enum: ['web', 'mobile'] },
      },
    },
  })
  async register(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.origin(req);
    await this.limiter.request(req, res, 'register', 5, 3600000);
    const input = registerSchema.parse(body);
    return this.send(res, input.platform, await this.auth.register(input, this.agent(req)));
  }
  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ schema: authResponseSchema })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        platform: { type: 'string', enum: ['web', 'mobile'], default: 'web' },
        refreshToken: { type: 'string' },
      },
    },
  })
  async refresh(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = refreshSchema.parse(body ?? {});
    this.origin(req, input.platform === 'web');
    await this.limiter.request(req, res, 'refresh', 30);
    const token =
      input.platform === 'mobile'
        ? input.refreshToken
        : (req.cookies as Record<string, string> | undefined)?.refresh_token;
    if (!token) throw new UnauthorizedException('No hay una sesión activa.');
    return this.send(res, input.platform, await this.auth.refresh(token, this.agent(req)));
  }
  @Post('logout')
  @HttpCode(200)
  @ApiBody({ schema: refreshRequestSchema })
  @ApiOkResponse({ schema: messageResponseSchema })
  async logout(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = refreshSchema.parse(body ?? {});
    this.origin(req, input.platform === 'web');
    await this.auth.logout(
      input.platform === 'mobile'
        ? input.refreshToken
        : (req.cookies as Record<string, string> | undefined)?.refresh_token,
    );
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: getConfig().NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
    return { message: 'Sesión cerrada.' };
  }
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ schema: userResponseSchema })
  me(@CurrentUser() user: AuthUser) {
    const { sessionId: _sessionId, ...profile } = user;
    return profile;
  }
  @Get('sessions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['items', 'nextCursor'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'createdAt', 'expiresAt'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              userAgent: { type: 'string', nullable: true },
              ip: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        nextCursor: { type: 'string', format: 'uuid', nullable: true },
      },
    },
  })
  async sessions(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    const { cursor, limit } = cursorSchema.parse(query);
    const items = await this.prisma.refreshSession.findMany({
      where: {
        businessId: user.businessId,
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
      orderBy: { id: 'asc' },
      take: limit + 1,
    });
    const more = items.length > limit;
    if (more) items.pop();
    return { items, nextCursor: more ? items.at(-1)?.id : null };
  }
  @Delete('sessions/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async revokeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    uuidSchema.parse(id);
    const target = await this.prisma.refreshSession.findFirst({
      where: { id, userId: user.id, businessId: user.businessId },
    });
    if (target)
      await this.prisma.refreshSession.updateMany({
        where: { familyId: target.familyId, userId: user.id, businessId: user.businessId },
        data: { revokedAt: new Date() },
      });
    return { message: 'Sesión cerrada.' };
  }
  @Delete('sessions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async revokeAll(@CurrentUser() user: AuthUser) {
    await this.prisma.refreshSession.updateMany({
      where: { userId: user.id, businessId: user.businessId },
      data: { revokedAt: new Date() },
    });
    return { message: 'Todas las sesiones fueron cerradas.' };
  }
  @Post('forgot-password')
  @HttpCode(200)
  @ApiBody({ schema: emailRequestSchema })
  @ApiOkResponse({ schema: messageResponseSchema })
  async forgot(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.origin(req);
    await this.limiter.request(req, res, 'forgot-password', 3, 3600000);
    return this.auth.requestAction(emailSchema.parse(body).email, 'RESET_PASSWORD');
  }
  @Post('resend-verification')
  @HttpCode(200)
  @ApiBody({ schema: emailRequestSchema })
  @ApiOkResponse({ schema: messageResponseSchema })
  async resend(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.origin(req);
    await this.limiter.request(req, res, 'verification', 3, 3600000);
    return this.auth.requestAction(emailSchema.parse(body).email, 'VERIFY_EMAIL');
  }
  @Post('verify-email')
  @HttpCode(200)
  @ApiBody({ schema: tokenRequestSchema })
  @ApiOkResponse({ schema: messageResponseSchema })
  async verify(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.limiter.request(req, res, 'verify-email', 10);
    return this.auth.consumeAction(tokenSchema.parse(body).token, 'VERIFY_EMAIL');
  }
  @Post('reset-password')
  @HttpCode(200)
  @ApiBody({
    schema: {
      ...tokenRequestSchema,
      required: ['token', 'password'],
      properties: {
        ...tokenRequestSchema.properties,
        password: { type: 'string', minLength: 12, maxLength: 128 },
      },
    },
  })
  @ApiOkResponse({ schema: messageResponseSchema })
  async reset(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.origin(req);
    await this.limiter.request(req, res, 'reset-password', 5);
    const input = resetSchema.parse(body);
    return this.auth.consumeAction(input.token, 'RESET_PASSWORD', input.password);
  }
  @Post('totp/setup')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @ApiBearerAuth()
  setupTotp(@CurrentUser() user: AuthUser) {
    return this.auth.setupTotp(user);
  }
  @Post('totp/confirm')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @ApiBearerAuth()
  confirmTotp(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.auth.confirmTotp(user, totpSchema.parse(body).code, true);
  }
  @Delete('totp')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @ApiBearerAuth()
  disableTotp(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.auth.confirmTotp(user, totpSchema.parse(body).code, false);
  }
}
