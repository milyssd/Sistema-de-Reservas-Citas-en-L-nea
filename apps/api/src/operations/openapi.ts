import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { z } from 'zod';
import { resourceSchemas } from './validation';

// Preserve the same validation contract in OpenAPI without defining divergent DTOs.
export function schemaFor(schema: z.ZodType): SchemaObject {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'input',
    unrepresentable: 'any',
  }) as SchemaObject;
}

const text: SchemaObject = { type: 'string' },
  id: SchemaObject = { type: 'string', format: 'uuid' },
  integer: SchemaObject = { type: 'integer' },
  bool: SchemaObject = { type: 'boolean' },
  date: SchemaObject = { type: 'string', format: 'date-time' },
  money: SchemaObject = { type: 'string', pattern: '^\\d+(\\.\\d+)?$', example: '50.00' };
const object = (
  properties: Record<string, SchemaObject>,
  required = Object.keys(properties),
): SchemaObject => ({ type: 'object', properties, required });
const array = (items: SchemaObject): SchemaObject => ({ type: 'array', items });
export const apiPage = (item: SchemaObject): SchemaObject =>
  object({ items: array(item), nextCursor: { ...id, nullable: true } });
export const apiConfig = object({ vapidPublicKey: { ...text, nullable: true }, pushEnabled: bool });
export const apiService = object({
  id,
  businessId: id,
  categoryId: { ...id, nullable: true },
  name: text,
  description: { ...text, nullable: true },
  durationMinutes: integer,
  bufferBeforeMinutes: integer,
  bufferAfterMinutes: integer,
  price: money,
  depositAmount: money,
  depositPercent: { ...integer, nullable: true },
  capacity: integer,
  active: bool,
  onlineBookable: bool,
  sortOrder: integer,
  version: integer,
  createdAt: date,
  updatedAt: date,
});
export const apiLocation = object({
  id,
  businessId: id,
  name: text,
  address: text,
  timezone: text,
  phone: { ...text, nullable: true },
  mapUrl: { ...text, nullable: true },
  latitude: { ...text, nullable: true },
  longitude: { ...text, nullable: true },
  active: bool,
  version: integer,
  createdAt: date,
  updatedAt: date,
});
export const apiCatalog = object({
  business: object({
    id,
    name: text,
    slug: text,
    description: { ...text, nullable: true },
    currency: text,
    locale: text,
    timezone: text,
    logoUrl: { ...text, nullable: true },
    brandColor: text,
    minimumNoticeMinutes: integer,
    maximumAdvanceDays: integer,
    slotIntervalMinutes: integer,
    cancellationHours: integer,
    maintenanceMode: bool,
    featureFlags: object({ multiStaffBookings: bool }),
  }),
  locations: array(apiLocation),
  services: array(apiService),
  categories: array(object({ id, name: text, sortOrder: integer, active: bool, version: integer })),
  staff: array(
    object({
      id,
      locationId: id,
      name: text,
      bio: { ...text, nullable: true },
      photoUrl: { ...text, nullable: true },
      isResource: bool,
      staffServices: array(
        object({
          serviceId: id,
          durationMinutes: { ...integer, nullable: true },
          price: { ...money, nullable: true },
        }),
      ),
      workingHours: array(object({ dayOfWeek: integer, startMinute: integer, endMinute: integer })),
    }),
  ),
  reviews: array(
    object({
      id,
      rating: integer,
      comment: { ...text, nullable: true },
      createdAt: date,
      customer: object({ name: text }),
    }),
  ),
});
export const apiPayment = object({
  id,
  businessId: id,
  bookingId: id,
  amount: money,
  currency: text,
  method: { type: 'string', enum: ['QR', 'TRANSFER', 'CASH'] },
  status: {
    type: 'string',
    enum: ['PENDING', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'REFUNDED', 'RETAINED'],
  },
  receiptAvailable: bool,
  refundedAmount: money,
  netAmount: { type: 'number' },
  remainingRefundable: { type: 'number' },
  receiptMime: { ...text, nullable: true },
  reference: { ...text, nullable: true },
  confirmedById: { ...id, nullable: true },
  confirmedAt: { ...date, nullable: true },
  reason: { ...text, nullable: true },
  version: integer,
  createdAt: date,
  updatedAt: date,
});
export const apiAdminEntity: SchemaObject = {
  oneOf: Object.values(resourceSchemas).map((schema) => {
    const base = schemaFor(schema);
    const properties = {
      ...base.properties,
      id,
      businessId: id,
      version: integer,
      createdAt: date,
      updatedAt: date,
    } as Record<string, SchemaObject>;
    for (const key of ['price', 'depositAmount']) if (properties[key]) properties[key] = money;
    return {
      ...base,
      properties,
      required: ['id', 'businessId', 'version'],
      additionalProperties: true,
    };
  }),
};
export const apiReport = object({
  from: date,
  to: date,
  currency: text,
  totalBookings: integer,
  revenue: { type: 'number' },
  grossRevenue: { type: 'number' },
  refundedRevenue: { type: 'number' },
  cancellationRate: { type: 'number' },
  noShowRate: { type: 'number' },
  byStatus: array(object({ status: text, _count: object({ _all: integer }) })),
  byStaff: array(
    object({
      staffId: id,
      staffName: text,
      bookings: integer,
      occupiedMinutes: { type: 'number' },
      availableMinutes: { type: 'number' },
      scheduledOccupiedMinutes: { type: 'number' },
      occupancyRate: { type: 'number', nullable: true },
    }),
  ),
  byService: array(
    object({
      serviceName: text,
      _count: object({ _all: integer }),
      _sum: object({
        price: { ...money, nullable: true },
        durationMinutes: { ...integer, nullable: true },
      }),
    }),
  ),
  peakHours: { type: 'object', additionalProperties: integer },
});
export const apiNotification = object({
  id,
  event: text,
  subject: text,
  body: text,
  payload: { nullable: true },
  readAt: { ...date, nullable: true },
  createdAt: date,
});
export const apiOutbox = object({
  id,
  event: text,
  channel: text,
  status: text,
  attempts: integer,
  maxAttempts: integer,
  scheduledAt: date,
  sentAt: { ...date, nullable: true },
  lastError: { ...text, nullable: true },
  createdAt: date,
});
export const apiAudit = object({
  id,
  businessId: id,
  userId: { ...id, nullable: true },
  action: text,
  entityType: text,
  entityId: { ...id, nullable: true },
  ip: { ...text, nullable: true },
  requestId: { ...text, nullable: true },
  metadata: { nullable: true },
  createdAt: date,
});
export const apiWaitlist = object({
  id,
  businessId: id,
  customerId: id,
  serviceId: id,
  locationId: id,
  staffId: { ...id, nullable: true },
  from: date,
  to: date,
  status: text,
  notifiedAt: { ...date, nullable: true },
  createdAt: date,
  version: integer,
});
export const apiReview = object({
  id,
  businessId: id,
  bookingId: id,
  customerId: id,
  rating: integer,
  comment: { ...text, nullable: true },
  visible: bool,
  createdAt: date,
});
export const ApiPagination = () =>
  applyDecorators(
    ApiQuery({ name: 'cursor', required: false, schema: { type: 'string', format: 'uuid' } }),
    ApiQuery({
      name: 'limit',
      required: false,
      schema: { type: 'integer', minimum: 1, maximum: 100 },
    }),
  );

export const apiBusiness: SchemaObject = {
  type: 'object',
  additionalProperties: true,
  required: ['id', 'name', 'version'],
  properties: {
    ...(apiCatalog.properties!.business as SchemaObject).properties,
    version: integer,
    holdMinutes: integer,
    paymentExpiryHours: integer,
    maxPendingBookings: integer,
    maxNoShows: integer,
    autoConfirm: bool,
    assignmentRule: text,
    featureFlags: { nullable: true },
    createdAt: date,
    updatedAt: date,
  },
};

export const apiRefundLedger = apiPage(
  object({ id, amount: money, reason: text, createdAt: date }),
);
