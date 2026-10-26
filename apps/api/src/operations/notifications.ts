import { Prisma } from '@prisma/client';

const templates: Record<string, { subject: string; body: string }> = {
  BOOKING_CREATED: {
    subject: 'Tu cita {codigo}',
    body: 'Hola {cliente}. Registramos {servicio} para el {fecha} a las {hora} en {sede}. Código: {codigo}.',
  },
  BOOKING_CONFIRMED: {
    subject: 'Cita confirmada · {codigo}',
    body: 'Hola {cliente}. Tu cita de {servicio} está confirmada para el {fecha} a las {hora} en {sede}.',
  },
  BOOKING_RESCHEDULED: {
    subject: 'Nuevo horario · {codigo}',
    body: 'Hola {cliente}. Tu cita de {servicio} ahora es el {fecha} a las {hora} en {sede}.',
  },
  BOOKING_CANCELLED: {
    subject: 'Cita cancelada · {codigo}',
    body: 'Hola {cliente}. Tu cita de {servicio} del {fecha} a las {hora} fue cancelada.',
  },
  BOOKING_EXPIRED: {
    subject: 'Reserva vencida · {codigo}',
    body: 'Hola {cliente}. Venció el plazo de tu reserva {codigo}. Puedes elegir un nuevo horario.',
  },
  BOOKING_REMINDER: {
    subject: 'Recuerda tu cita · {codigo}',
    body: 'Hola {cliente}. Te esperamos para {servicio} el {fecha} a las {hora} en {sede}.',
  },
  PAYMENT_DUE: {
    subject: 'Tu anticipo está por vencer · {codigo}',
    body: 'Hola {cliente}. Recuerda completar el anticipo de tu cita {codigo} antes de que venza la reserva.',
  },
};

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([a-z]+)\}/g, (whole, key: string) => vars[key] ?? whole);
}

export async function enqueueBookingNotifications(
  tx: Prisma.TransactionClient,
  bookingId: string,
  event: string,
  reminderId?: string,
) {
  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      customer: { include: { user: { select: { notificationPreferences: true } } } },
      items: true,
      location: true,
    },
  });
  const businessId = booking.businessId;
  const configured = await tx.setting.findUnique({
    where: { businessId_key: { businessId, key: `notification.${event}` } },
  });
  const override = configured?.value as { subject?: string; body?: string } | undefined;
  const fallback = templates[event] ?? templates.BOOKING_CREATED;
  const vars = {
    cliente: booking.customer.name,
    servicio: booking.items.map((i) => i.serviceName).join(', '),
    fecha: new Intl.DateTimeFormat('es-BO', {
      timeZone: booking.location.timezone,
      dateStyle: 'long',
    }).format(booking.startAt),
    hora: new Intl.DateTimeFormat('es-BO', {
      timeZone: booking.location.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(booking.startAt),
    sede: booking.location.name,
    codigo: booking.code,
  };
  const subject = renderTemplate(
    typeof override?.subject === 'string' ? override.subject.slice(0, 200) : fallback.subject,
    vars,
  ).slice(0, 200);
  const body = renderTemplate(
    typeof override?.body === 'string' ? override.body.slice(0, 10000) : fallback.body,
    vars,
  );
  const userId = booking.customer.userId;
  const prefs = booking.customer.user?.notificationPreferences as
    { email?: boolean; push?: boolean } | undefined;
  const payload = { bookingId, ...(reminderId ? { reminderId } : {}) };
  const data = { businessId, userId, event, subject, body, payload };
  if (prefs?.email !== false)
    await tx.notification.create({
      data: { ...data, recipient: booking.customer.email, channel: 'EMAIL' },
    });
  if (userId) {
    await tx.notification.create({ data: { ...data, recipient: userId, channel: 'IN_APP' } });
    if (prefs?.push !== false) {
      const devices = await tx.deviceToken.findMany({
        where: { businessId, userId },
        select: { channel: true },
        distinct: ['channel'],
      });
      for (const device of devices)
        await tx.notification.create({
          data: { ...data, recipient: userId, channel: device.channel },
        });
    }
  }
  if (['BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_RESCHEDULED'].includes(event)) {
    await tx.reminder.deleteMany({ where: { businessId, bookingId, status: 'PENDING' } });
    if (booking.status === 'CONFIRMED') {
      const setting = await tx.setting.findUnique({
        where: { businessId_key: { businessId, key: 'reminders.hours' } },
      });
      const raw = setting?.value;
      const hours =
        Array.isArray(raw) && raw.every((h) => typeof h === 'number' && h > 0 && h <= 168)
          ? (raw as number[])
          : [24, 2];
      for (const h of hours) {
        const scheduledAt = new Date(booking.startAt.getTime() - h * 3600000);
        if (scheduledAt > new Date())
          await tx.reminder.upsert({
            where: {
              businessId_bookingId_channel_scheduledAt: {
                businessId,
                bookingId,
                channel: 'EMAIL',
                scheduledAt,
              },
            },
            create: { businessId, bookingId, channel: 'EMAIL', scheduledAt },
            update: {},
          });
      }
    }
  }
}

export async function notifyWaitlist(
  tx: Prisma.TransactionClient,
  bookingId: string,
  previousInterval?: {
    startAt: Date;
    endAt: Date;
    staffId: string;
    locationId: string;
    items?: { serviceId: string; staffId: string; startAt: Date; endAt: Date }[];
  },
) {
  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { items: true },
  });
  const interval = previousInterval ?? booking;
  const segments = previousInterval?.items ?? booking.items;
  const entries = await tx.waitlistEntry.findMany({
    where: {
      businessId: booking.businessId,
      locationId: interval.locationId,
      status: 'WAITING',
      OR: segments.map((segment) => ({
        serviceId: segment.serviceId,
        from: { lte: segment.startAt },
        to: { gte: segment.endAt },
        OR: [{ staffId: null }, { staffId: segment.staffId }],
      })),
    },
    include: { customer: true },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });
  for (const entry of entries) {
    const claimed = await tx.waitlistEntry.updateMany({
      where: { id: entry.id, status: 'WAITING' },
      data: { status: 'NOTIFIED', notifiedAt: new Date(), version: { increment: 1 } },
    });
    if (!claimed.count) continue;
    await tx.notification.create({
      data: {
        businessId: booking.businessId,
        userId: entry.customer.userId,
        recipient: entry.customer.email,
        event: 'WAITLIST_AVAILABLE',
        channel: 'EMAIL',
        subject: 'Hay un horario disponible',
        body: `Hola ${entry.customer.name}. Se liberó un horario para el servicio que esperabas. Revisa la disponibilidad para reservar; el cupo no se guarda automáticamente.`,
      },
    });
  }
}
