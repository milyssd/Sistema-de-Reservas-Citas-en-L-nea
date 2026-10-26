import { z } from 'zod';

export const DEFAULT_TIMEZONE = 'America/La_Paz';
export const DEFAULT_LOCALE = 'es-BO';
export const CURRENCY = 'BOB';
export const CURRENCY_SYMBOL = 'Bs';
export const API_PREFIX = '/api/v1';
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const DEMO_BUSINESS_ID = '11111111-1111-4111-8111-111111111111';
export const ROLES = ['CLIENT', 'STAFF', 'ADMIN', 'OWNER', 'SUPERADMIN'] as const;
export const BOOKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'EXPIRED',
] as const;
export const BOOKING_SOURCES = ['WEB', 'MOBILE', 'ADMIN', 'WALK_IN'] as const;
export const PAYMENT_METHODS = ['QR', 'TRANSFER', 'CASH'] as const;
export const PAYMENT_STATUSES = [
  'PENDING',
  'SUBMITTED',
  'CONFIRMED',
  'REJECTED',
  'REFUNDED',
  'RETAINED',
] as const;
export const NOTIFICATION_CHANNELS = ['EMAIL', 'WEB_PUSH', 'EXPO_PUSH', 'IN_APP'] as const;
export const roleSchema = z.enum(ROLES);
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export const bookingSourceSchema = z.enum(BOOKING_SOURCES);
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const uuidSchema = z.string().uuid();
export const httpUrlSchema = z
  .string()
  .url()
  .max(512)
  .regex(/^https?:\/\/[^\s]+$/i, 'Usa una URL http o https')
  .refine((value) => {
    try {
      const url = new URL(value);
      return !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'La URL debe ser válida y no incluir credenciales');
export const utcDateTimeSchema = z.string().datetime({ offset: false });
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const phoneSchema = z
  .string()
  .regex(/^\+591[67]\d{7}$/, 'Usa un número boliviano con +591 y ocho dígitos.');
export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/, 'Incluye una minúscula.')
  .regex(/[A-Z]/, 'Incluye una mayúscula.')
  .regex(/\d/, 'Incluye un número.');
export const timezoneSchema = z
  .string()
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('es-BO', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Zona horaria IANA inválida.');
export const moneySchema = z
  .number()
  .finite()
  .min(0)
  .max(99_999_999.99)
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-5, 'Máximo dos decimales.');
export const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
export const versionSchema = z.number().int().positive();
export const paginationSchema = z
  .object({
    cursor: uuidSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    order: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
    deviceName: z.string().trim().min(1).max(150).optional(),
    totpCode: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
    platform: z.enum(['web', 'mobile']).default('web'),
  })
  .strict();
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    platform: z.enum(['web', 'mobile']).default('web'),
  })
  .strict();
export const refreshSchema = z
  .object({
    platform: z.enum(['web', 'mobile']).default('web'),
    refreshToken: z.string().min(40).max(200).optional(),
  })
  .strict();
export const forgotPasswordSchema = z.object({ email: emailSchema }).strict();
export const resetPasswordSchema = z
  .object({ token: z.string().min(40).max(200), password: passwordSchema })
  .strict();
export const verifyEmailSchema = z.object({ token: z.string().min(40).max(200) }).strict();
export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: phoneSchema.optional(),
    notificationPreferences: z
      .object({ email: z.boolean(), push: z.boolean() })
      .strict()
      .optional(),
  })
  .strict();
export const customerInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: emailSchema,
    phone: phoneSchema,
  })
  .strict();
export const availabilityQuerySchema = z
  .object({
    serviceId: uuidSchema,
    staffId: uuidSchema.optional(),
    locationId: uuidSchema.optional(),
    from: utcDateTimeSchema,
    to: utcDateTimeSchema,
  })
  .strict()
  .refine((v) => Date.parse(v.to) > Date.parse(v.from), {
    message: 'El final debe ser posterior al inicio.',
    path: ['to'],
  })
  .refine((v) => Date.parse(v.to) - Date.parse(v.from) <= 31 * 86400_000, {
    message: 'Consulta como máximo 31 días.',
    path: ['to'],
  });
export const bookingCreateSchema = z
  .object({
    locationId: uuidSchema,
    serviceIds: z.array(uuidSchema).min(1).max(8),
    staffId: uuidSchema.optional(),
    staffIds: z.array(uuidSchema.nullable()).min(1).max(8).optional(),
    startAt: utcDateTimeSchema,
    customer: customerInputSchema.optional(),
    notes: z.string().trim().max(1000).optional(),
    source: bookingSourceSchema.default('WEB'),
    holdId: uuidSchema.optional(),
    holdToken: z.string().min(32).max(512).optional(),
  })
  .strict()
  .refine((v) => !(v.staffId && v.staffIds), {
    message: 'Usa staffId o staffIds, no ambos.',
    path: ['staffIds'],
  })
  .refine((v) => !v.staffIds || v.staffIds.length === v.serviceIds.length, {
    message: 'Indica un profesional por cada servicio.',
    path: ['staffIds'],
  });
export const holdCreateSchema = z
  .object({
    locationId: uuidSchema,
    serviceIds: z.array(uuidSchema).min(1).max(8),
    staffId: uuidSchema.optional(),
    staffIds: z.array(uuidSchema.nullable()).min(1).max(8).optional(),
    startAt: utcDateTimeSchema,
  })
  .strict()
  .refine((v) => !(v.staffId && v.staffIds), {
    message: 'Usa staffId o staffIds, no ambos.',
    path: ['staffIds'],
  })
  .refine((v) => !v.staffIds || v.staffIds.length === v.serviceIds.length, {
    message: 'Indica un profesional por cada servicio.',
    path: ['staffIds'],
  });
export const bookingRescheduleSchema = z
  .object({
    startAt: utcDateTimeSchema,
    staffId: uuidSchema.optional(),
    staffIds: z.array(uuidSchema.nullable()).min(1).max(8).optional(),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .refine((v) => !(v.staffId && v.staffIds), {
    message: 'Usa staffId o staffIds, no ambos.',
    path: ['staffIds'],
  });
export const bookingCancelSchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();
export const bookingStatusUpdateSchema = z
  .object({ status: bookingStatusSchema, reason: z.string().max(500).optional() })
  .strict();
export const serviceSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    description: z.string().max(5000).nullable().optional(),
    categoryId: uuidSchema.nullable().optional(),
    durationMinutes: z.number().int().min(5).max(1440),
    bufferBeforeMinutes: z.number().int().min(0).max(240).default(0),
    bufferAfterMinutes: z.number().int().min(0).max(240).default(0),
    price: moneySchema,
    depositAmount: moneySchema.default(0),
    depositPercent: z.number().int().min(0).max(100).nullable().optional(),
    capacity: z.number().int().min(1).max(100).default(1),
    active: z.boolean().default(true),
    onlineBookable: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
  })
  .strict();
export const serviceCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    sortOrder: z.number().int().min(0).default(0),
    active: z.boolean().default(true),
  })
  .strict();
export const staffSchema = z
  .object({
    locationId: uuidSchema,
    userId: uuidSchema.nullable().optional(),
    name: z.string().trim().min(2).max(120),
    bio: z.string().max(5000).nullable().optional(),
    photoUrl: httpUrlSchema.nullable().optional(),
    isResource: z.boolean().default(false),
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
  })
  .strict();
export const staffServiceSchema = z
  .object({
    staffId: uuidSchema,
    serviceId: uuidSchema,
    durationMinutes: z.number().int().min(5).max(1440).nullable().optional(),
    price: moneySchema.nullable().optional(),
  })
  .strict();
export const locationSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    address: z.string().trim().min(3).max(300),
    timezone: timezoneSchema.default(DEFAULT_TIMEZONE),
    phone: phoneSchema.nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    mapUrl: httpUrlSchema.nullable().optional(),
    active: z.boolean().default(true),
  })
  .strict();
export const workingHoursSchema = z
  .object({
    staffId: uuidSchema,
    locationId: uuidSchema,
    dayOfWeek: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(2880),
  })
  .strict()
  .refine((v) => v.endMinute > v.startMinute && v.endMinute - v.startMinute <= 1440, {
    message: 'El tramo debe durar entre 1 y 1440 minutos.',
    path: ['endMinute'],
  });
export const timeOffSchema = z
  .object({
    staffId: uuidSchema.nullable().optional(),
    locationId: uuidSchema,
    startAt: utcDateTimeSchema,
    endAt: utcDateTimeSchema,
    reason: z.string().trim().max(200).optional(),
    isHoliday: z.boolean().default(false),
  })
  .strict()
  .refine((v) => Date.parse(v.endAt) > Date.parse(v.startAt), {
    message: 'El final debe ser posterior al inicio.',
    path: ['endAt'],
  });
export const businessPoliciesSchema = z
  .object({
    minimumNoticeMinutes: z.number().int().min(0).max(10080).optional(),
    maximumAdvanceDays: z.number().int().min(1).max(365).optional(),
    slotIntervalMinutes: z.number().int().min(5).max(120).optional(),
    cancellationHours: z.number().int().min(0).max(168).optional(),
    holdMinutes: z.number().int().min(1).max(30).optional(),
    paymentExpiryHours: z.number().int().min(1).max(72).optional(),
    maxPendingBookings: z.number().int().min(1).max(20).optional(),
    maxNoShows: z.number().int().min(1).max(20).optional(),
    autoConfirm: z.boolean().optional(),
    assignmentRule: z.enum(['LEAST_BUSY', 'ORDER']).optional(),
    maintenanceMode: z.boolean().optional(),
  })
  .strict();
export const paymentCreateSchema = z
  .object({
    bookingId: uuidSchema,
    method: paymentMethodSchema,
    amount: moneySchema.refine((v) => v > 0),
    reference: z.string().trim().max(200).optional(),
  })
  .strict();
export const paymentReviewSchema = z
  .object({
    status: z.enum(['CONFIRMED', 'REJECTED', 'REFUNDED', 'RETAINED']),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();
export const waitlistSchema = z
  .object({
    locationId: uuidSchema,
    serviceId: uuidSchema,
    staffId: uuidSchema.optional(),
    from: utcDateTimeSchema,
    to: utcDateTimeSchema,
  })
  .strict()
  .refine((v) => Date.parse(v.to) > Date.parse(v.from), {
    message: 'Rango inválido.',
    path: ['to'],
  });
export const reviewSchema = z
  .object({
    bookingId: uuidSchema,
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  })
  .strict();
export const crmCustomerSchema = z
  .object({
    internalNotes: z.string().max(5000).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    blocked: z.boolean().optional(),
  })
  .strict();

export type Role = z.infer<typeof roleSchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type BookingSource = z.infer<typeof bookingSourceSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type BookingCreateInput = z.input<typeof bookingCreateSchema>;
export type CustomerInput = z.infer<typeof customerInputSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export interface AuthUser {
  id: string;
  businessId: string;
  email: string;
  name: string;
  role: Role;
  staffId?: string;
  customerId?: string;
}
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  requestId: string;
  instance?: string;
}
export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
}
export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
  staffId: string;
  locationId: string;
  remainingCapacity: number;
}
export const esBO = {
  reserve: 'Reservar',
  confirmBooking: 'Confirmar cita',
  cancelBooking: 'Cancelar cita',
  reschedule: 'Reprogramar',
  anyProfessional: 'Cualquier profesional',
  upcomingBookings: 'Próximas citas',
  bookingCode: 'Código de reserva',
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  noShow: 'No asistió',
  expired: 'Vencida',
  currency: 'Bs',
  timezone: 'Hora de Bolivia',
} as const;
