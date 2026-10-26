import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import {
  bookingCancelSchema,
  bookingCreateSchema,
  bookingRescheduleSchema,
  holdCreateSchema,
} from '@reservas/shared';
import type { Response } from 'express';
import { interval, startWith, switchMap } from 'rxjs';
import { z } from 'zod';
import { AuthGuard, AuthRequest, OptionalAuthGuard } from '../common/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { bookingPatchSchema, BookingsService } from './bookings.service';
import { BookingDto, BookingPageDto, HoldDto } from './booking.dto';
import { AntiAbuseService } from '../anti-abuse/anti-abuse.service';

const listQuery = z
  .object({
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    staffId: z.string().uuid().optional(),
    locationId: z.string().uuid().optional(),
    status: z
      .enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'])
      .optional(),
    order: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();
function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Revisa los datos de la reserva.',
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  return result.data;
}
const id = (value: string) => parse(z.string().uuid(), value);

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    @Inject(BookingsService) private readonly bookings: BookingsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AntiAbuseService) private readonly antiAbuse: AntiAbuseService,
  ) {}

  @Post('holds')
  @UseGuards(OptionalAuthGuard)
  @ApiHeader({
    name: 'X-Guest-Challenge',
    required: false,
    description: 'Firmado por /anti-abuse/challenge, requerido tras el umbral de invitado',
  })
  @ApiHeader({
    name: 'X-Guest-Nonce',
    required: false,
    description: 'Solución decimal de la prueba de trabajo del invitado',
  })
  @ApiOperation({ summary: 'Retener temporalmente un turno sin crear todavía una reserva' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['locationId', 'serviceIds', 'startAt'],
      properties: {
        locationId: { type: 'string', format: 'uuid' },
        serviceIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        staffId: { type: 'string', format: 'uuid' },
        staffIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid', nullable: true },
          description:
            'Un profesional por servicio; null asigna cualquiera. No combinar con staffId.',
        },
        startAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 201, type: HoldDto })
  async hold(@Body() body: unknown, @Req() request: AuthRequest) {
    const input = parse(holdCreateSchema, body);
    await this.antiAbuse.assertGuest(request, 'HOLD', body);
    return this.bookings.hold(input);
  }

  @Post()
  @UseGuards(OptionalAuthGuard)
  @ApiHeader({
    name: 'X-Guest-Challenge',
    required: false,
    description: 'Firmado por /anti-abuse/challenge, requerido tras el umbral de invitado',
  })
  @ApiHeader({
    name: 'X-Guest-Nonce',
    required: false,
    description: 'Solución decimal de la prueba de trabajo del invitado',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Identificador único del intento, reutilizado para reintentos con los mismos datos',
  })
  @ApiOperation({
    summary: 'Reservar como invitado, cliente o personal; comprueba ocupación en una transacción',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['locationId', 'serviceIds', 'startAt'],
      properties: {
        locationId: { type: 'string', format: 'uuid' },
        serviceIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
        staffId: { type: 'string', format: 'uuid' },
        staffIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid', nullable: true },
          description:
            'Un profesional por servicio; null asigna cualquiera. No combinar con staffId.',
        },
        startAt: { type: 'string', format: 'date-time' },
        source: { type: 'string', enum: ['WEB', 'MOBILE', 'ADMIN', 'WALK_IN'] },
        notes: { type: 'string' },
        holdToken: { type: 'string' },
        customer: {
          type: 'object',
          required: ['name', 'email', 'phone'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', example: '+59171234567' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    type: BookingDto,
    description: 'Reserva creada o respuesta idempotente del intento original',
  })
  @Header('Cache-Control', 'no-store')
  create(
    @Body() body: unknown,
    @Headers('idempotency-key') key: string | undefined,
    @Req() request: AuthRequest,
  ) {
    return this.bookings.create(
      parse(bookingCreateSchema, body),
      key,
      request.user,
      request.ip,
      () => this.antiAbuse.assertGuest(request, 'BOOK', body, key),
    );
  }

  @Sse('events')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cambios de la agenda, sin datos personales; reconectar con Authorization',
  })
  events(@Req() request: AuthRequest) {
    return interval(5_000).pipe(
      startWith(0),
      switchMap(async () => {
        const scope =
          request.user.role === 'STAFF'
            ? { items: { some: { staffId: request.user.staffId ?? 'unassigned' } } }
            : request.user.role === 'CLIENT'
              ? { customer: { userId: request.user.id } }
              : {};
        const revision = await this.prisma.booking.aggregate({
          where: { businessId: request.user.businessId, ...scope },
          _max: { updatedAt: true },
        });
        return {
          type: 'agenda.changed',
          data: { updatedAt: revision._max.updatedAt?.toISOString() ?? null },
        };
      }),
    );
  }

  @Get('manage/:token/calendar.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="cita.ics"')
  @Header('Cache-Control', 'no-store')
  guestCalendar(@Param('token') token: string) {
    return this.bookings.calendar(this.bookings.tokenId(token), undefined, token);
  }

  @Get('manage/:token')
  @Header('Cache-Control', 'no-store')
  @ApiResponse({ status: 200, type: BookingDto })
  async guestRead(@Param('token') token: string, @Res({ passthrough: true }) response: Response) {
    const booking = await this.bookings.read(this.bookings.tokenId(token), undefined, token);
    response.setHeader('ETag', `"${booking.version}"`);
    return booking;
  }

  @Patch('manage/:token')
  @Header('Cache-Control', 'no-store')
  @ApiResponse({ status: 200, type: BookingDto })
  guestPatch(
    @Param('token') token: string,
    @Body() body: unknown,
    @Headers('if-match') version: string | undefined,
    @Req() request: AuthRequest,
  ) {
    return this.bookings.patch(
      this.bookings.tokenId(token),
      parse(bookingPatchSchema, body),
      version,
      undefined,
      token,
      request.ip,
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Citas propias; personal limitado a su agenda y administradores a su negocio',
  })
  @Header('Cache-Control', 'no-store')
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'staffId', required: false, type: String })
  @ApiQuery({ name: 'locationId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, type: BookingPageDto })
  list(@Query() query: unknown, @Req() request: AuthRequest) {
    return this.bookings.list(request.user, parse(listQuery, query));
  }

  @Get(':id/calendar.ics')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="cita.ics"')
  @Header('Cache-Control', 'no-store')
  calendar(@Param('id') bookingId: string, @Req() request: AuthRequest) {
    return this.bookings.calendar(id(bookingId), request.user);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Header('Cache-Control', 'no-store')
  @ApiResponse({ status: 200, type: BookingDto })
  async read(
    @Param('id') bookingId: string,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const booking = await this.bookings.read(id(bookingId), request.user);
    response.setHeader('ETag', `"${booking.version}"`);
    return booking;
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiOperation({ summary: 'Reprogramar o actualizar el estado con control de versión' })
  @Header('Cache-Control', 'no-store')
  @ApiResponse({ status: 200, type: BookingDto })
  patch(
    @Param('id') bookingId: string,
    @Body() body: unknown,
    @Headers('if-match') version: string | undefined,
    @Req() request: AuthRequest,
  ) {
    return this.bookings.patch(
      id(bookingId),
      parse(bookingPatchSchema, body),
      version,
      request.user,
      undefined,
      request.ip,
    );
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiResponse({ status: 201, type: BookingDto })
  cancel(
    @Param('id') bookingId: string,
    @Body() body: unknown,
    @Headers('if-match') version: string | undefined,
    @Req() request: AuthRequest,
  ) {
    return this.bookings.patch(
      id(bookingId),
      { ...parse(bookingCancelSchema, body), status: 'CANCELLED' },
      version,
      request.user,
      undefined,
      request.ip,
    );
  }

  @Post(':id/reschedule')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiResponse({ status: 201, type: BookingDto })
  reschedule(
    @Param('id') bookingId: string,
    @Body() body: unknown,
    @Headers('if-match') version: string | undefined,
    @Req() request: AuthRequest,
  ) {
    return this.bookings.patch(
      id(bookingId),
      parse(bookingRescheduleSchema, body),
      version,
      request.user,
      undefined,
      request.ip,
    );
  }
}
