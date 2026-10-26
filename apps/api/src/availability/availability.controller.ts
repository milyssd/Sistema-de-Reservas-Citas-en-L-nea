import { BadRequestException, Controller, Get, Inject, Query, Sse } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { interval, map, startWith } from 'rxjs';
import { AvailabilityService } from './availability.service';
import { AvailabilityResponseDto } from './availability.dto';

const availabilityQuery = z
  .object({
    serviceId: z.string().uuid().optional(),
    serviceIds: z.string().max(300).optional(),
    staffId: z.string().uuid().optional(),
    staffIds: z.string().max(300).optional(),
    locationId: z.string().uuid().optional(),
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
  .strict()
  .refine(
    (value) => Boolean(value.serviceId) !== Boolean(value.serviceIds),
    'Indica serviceId o serviceIds.',
  )
  .refine(
    (value) =>
      Date.parse(value.to) > Date.parse(value.from) &&
      Date.parse(value.to) - Date.parse(value.from) <= 32 * 86_400_000,
    'Consulta como máximo 32 días.',
  );

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(@Inject(AvailabilityService) private readonly availability: AvailabilityService) {}

  @Sse('events')
  @ApiOperation({
    summary:
      'Pulso público para refrescar los turnos cada cinco segundos; no transmite datos de clientes',
  })
  events() {
    return interval(5_000).pipe(
      startWith(0),
      map(() => ({
        type: 'availability.changed',
        data: { revision: Math.floor(Date.now() / 5_000).toString() },
      })),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Turnos libres, evaluados en la zona de la sede y serializados en UTC' })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiQuery({
    name: 'serviceIds',
    required: false,
    description: 'UUID separados por comas, en orden de atención',
  })
  @ApiQuery({ name: 'staffId', required: false })
  @ApiQuery({
    name: 'staffIds',
    required: false,
    description: 'UUID o any por servicio, separados por comas; no combinar con staffId',
  })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiResponse({ status: 200, type: AvailabilityResponseDto })
  list(@Query() raw: unknown) {
    const parsed = availabilityQuery.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Consulta de disponibilidad inválida.',
      });
    const input = parsed.data;
    const ids = z
      .array(z.string().uuid())
      .min(1)
      .max(8)
      .safeParse(input.serviceId ? [input.serviceId] : input.serviceIds!.split(','));
    if (!ids.success) throw new BadRequestException('Servicios inválidos.');
    const assignments = input.staffIds
      ? z
          .array(z.string().uuid().nullable())
          .min(1)
          .max(8)
          .safeParse(input.staffIds.split(',').map((value) => (value === 'any' ? null : value)))
      : undefined;
    if (assignments && !assignments.success)
      throw new BadRequestException('Profesionales inválidos.');
    return this.availability.list({
      serviceIds: ids.data,
      staffId: input.staffId,
      staffIds: assignments?.success ? assignments.data : undefined,
      locationId: input.locationId,
      from: input.from,
      to: input.to,
    });
  }
}
