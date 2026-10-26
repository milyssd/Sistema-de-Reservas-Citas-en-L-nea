import { BadRequestException, HttpException } from '@nestjs/common';
import { z } from 'zod';
import { httpUrlSchema } from '@reservas/shared';

export const idSchema = z.string().uuid();
const money = z.coerce.number().finite().min(0).max(1000000).multipleOf(0.01);
const name = z.string().trim().min(2).max(120);
const timezone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat('es-BO', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, 'Zona horaria inválida');
export const pageSchema = z
  .object({
    cursor: idSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();
export const reportSchema = z
  .object({ from: z.string().datetime(), to: z.string().datetime() })
  .strict()
  .refine((v) => {
    const range = Date.parse(v.to) - Date.parse(v.from);
    return range > 0 && range <= 93 * 86400000;
  }, 'El período debe ser positivo y de hasta 93 días');
export const resourceSchemas = {
  services: z
    .object({
      name,
      description: z.string().max(4000).default(''),
      categoryId: idSchema.nullable().optional(),
      durationMinutes: z.number().int().min(5).max(720),
      bufferBeforeMinutes: z.number().int().min(0).max(240).default(0),
      bufferAfterMinutes: z.number().int().min(0).max(240).default(0),
      price: money,
      depositAmount: money.default(0),
      depositPercent: z.number().int().min(0).max(100).nullable().optional(),
      sortOrder: z.number().int().min(0).default(0),
      capacity: z.number().int().min(1).max(100).default(1),
      active: z.boolean().default(true),
      onlineBookable: z.boolean().default(true),
    })
    .strict(),
  categories: z
    .object({
      name: name.max(100),
      active: z.boolean().default(true),
      sortOrder: z.number().int().min(0).default(0),
    })
    .strict(),
  locations: z
    .object({
      name,
      address: z.string().min(2).max(300),
      timezone: timezone.default('America/La_Paz'),
      phone: z
        .string()
        .regex(/^\+591[67]\d{7}$/)
        .optional(),
      mapUrl: httpUrlSchema.optional(),
      active: z.boolean().default(true),
    })
    .strict(),
  staff: z
    .object({
      name,
      isResource: z.boolean().default(false),
      locationId: idSchema,
      userId: idSchema.nullable().optional(),
      bio: z.string().max(2000).default(''),
      photoUrl: httpUrlSchema.nullable().optional(),
      active: z.boolean().default(true),
      sortOrder: z.number().int().min(0).default(0),
    })
    .strict(),
  'staff-services': z
    .object({
      staffId: idSchema,
      serviceId: idSchema,
      durationMinutes: z.number().int().min(5).max(720).nullable().optional(),
      price: money.nullable().optional(),
    })
    .strict(),
  'working-hours': z
    .object({
      staffId: idSchema,
      locationId: idSchema,
      dayOfWeek: z.number().int().min(0).max(6),
      startMinute: z.number().int().min(0).max(1439),
      endMinute: z.number().int().min(0).max(2880),
    })
    .strict(),
  'time-off': z
    .object({
      staffId: idSchema.nullable().optional(),
      locationId: idSchema,
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      reason: z.string().trim().min(2).max(200),
      isHoliday: z.boolean().default(false),
    })
    .strict(),
  customers: z
    .object({
      name,
      email: z.string().email().max(254),
      phone: z.string().regex(/^\+591[67]\d{7}$/),
      internalNotes: z.string().max(5000).optional(),
      tags: z.array(z.string().max(40)).max(20).optional(),
      blocked: z.boolean().default(false),
    })
    .strict(),
  settings: z
    .object({
      key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$/),
      value: z
        .unknown()
        .refine((value) => value !== undefined && value !== null, 'Valor requerido'),
    })
    .strict(),
};
export type Resource = keyof typeof resourceSchemas;
export const businessSchema = z
  .object({
    name: name.optional(),
    description: z.string().max(4000).optional(),
    brandColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    logoUrl: httpUrlSchema.nullable().optional(),
    minimumNoticeMinutes: z.number().int().min(0).max(10080).optional(),
    maximumAdvanceDays: z.number().int().min(1).max(365).optional(),
    slotIntervalMinutes: z.number().int().min(5).max(120).optional(),
    cancellationHours: z.number().int().min(0).max(168).optional(),
    autoConfirm: z.boolean().optional(),
    featureFlags: z.object({ multiStaffBookings: z.boolean() }).strict().optional(),
    maintenanceMode: z.boolean().optional(),
    holdMinutes: z.number().int().min(1).max(30).optional(),
    paymentExpiryHours: z.number().int().min(1).max(168).optional(),
    assignmentRule: z.enum(['LEAST_BUSY', 'ORDER']).optional(),
    maxPendingBookings: z.number().int().min(1).max(20).optional(),
    maxNoShows: z.number().int().min(1).max(100).optional(),
  })
  .strict();
export const paymentSchema = z
  .object({
    bookingId: idSchema,
    amount: money.refine((v) => v > 0),
    method: z.enum(['QR', 'TRANSFER', 'CASH']),
  })
  .strict();
export const refundSchema = z
  .object({ amount: money.refine((v) => v > 0), reason: z.string().trim().min(5).max(500) })
  .strict();
export const reviewSchema = z
  .object({
    bookingId: idSchema,
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(2).max(1000),
  })
  .strict();
export const waitlistSchema = z
  .object({
    serviceId: idSchema,
    locationId: idSchema,
    staffId: idSchema.nullable().optional(),
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
  .strict()
  .refine(
    (v) =>
      Date.parse(v.to) > Date.parse(v.from) &&
      Date.parse(v.to) - Date.parse(v.from) <= 93 * 86400000,
  );
export const deviceSchema = z
  .object({ platform: z.enum(['WEB', 'EXPO']), token: z.string().min(20).max(4096) })
  .strict();
export function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const r = schema.safeParse(value);
  if (!r.success)
    throw new BadRequestException({
      code: 'INVALID_INPUT',
      message: 'Datos inválidos',
      errors: r.error.flatten(),
    });
  return r.data;
}
export function expectedVersion(value: unknown): number {
  if (value === undefined)
    throw new HttpException({ code: 'IF_MATCH_REQUIRED', message: 'Se requiere If-Match' }, 428);
  const result = z
    .string()
    .regex(/^(?:"\d+"|\d+)$/)
    .safeParse(value);
  if (!result.success) throw new BadRequestException('If-Match inválido');
  return Number(result.data.replaceAll('"', ''));
}
