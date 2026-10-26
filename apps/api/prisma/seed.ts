import 'dotenv/config';
import { PrismaClient, BookingSource, BookingStatus, Role } from '@prisma/client';
import { hash } from 'argon2';
import { DateTime } from 'luxon';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL es obligatoria para ejecutar db:seed.');
const connection = new URL(databaseUrl);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: connection.hostname,
    port: Number(connection.port || 3306),
    user: decodeURIComponent(connection.username),
    password: decodeURIComponent(connection.password),
    database: decodeURIComponent(connection.pathname.slice(1)),
    connectionLimit: 5,
    timezone: 'Z',
  }),
});
const businessId = process.env.BUSINESS_ID ?? '11111111-1111-4111-8111-111111111111';
const locationId = '20000000-0000-4000-8000-000000000001';
const categoryId = '90000000-0000-4000-8000-000000000001';
const staffIds = [1, 2, 3].map((n) => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
const id = (prefix: number, n: number) =>
  `${prefix}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Configura ADMIN_EMAIL en el entorno antes de ejecutar db:seed.');
  }
  if (
    !password ||
    password.length < 12 ||
    password.length > 128 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new Error(
      'ADMIN_PASSWORD debe tener 12 a 128 caracteres, mayúsculas, minúsculas y números. Nunca se guarda en el repositorio.',
    );
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(businessId)
  ) {
    throw new Error('BUSINESS_ID debe ser un UUID válido.');
  }
  await prisma.business.upsert({
    where: { id: businessId },
    update: {},
    create: {
      id: businessId,
      slug: 'agenda-abierta',
      name: 'Agenda abierta',
      description: 'Tu tiempo, bien cuidado. Atención cercana y citas que se adaptan a tu día.',
      currency: 'BOB',
      locale: 'es-BO',
      timezone: 'America/La_Paz',
      brandColor: '#146C94',
      autoConfirm: true,
      slotIntervalMinutes: 15,
      featureFlags: {
        reviews: true,
        waitlist: true,
        manualPayments: true,
        multiStaffBookings: true,
      },
    },
  });
  await prisma.location.upsert({
    where: { id: locationId },
    update: {},
    create: {
      id: locationId,
      businessId,
      name: 'Sede central · La Paz',
      address: 'Dirección de ejemplo: configura la dirección de tu negocio',
      timezone: 'America/La_Paz',
      latitude: -16.5,
      longitude: -68.15,
    },
  });
  const existingAdmin = await prisma.user.findUnique({
    where: { businessId_email: { businessId, email } },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        businessId,
        email,
        name: 'Administración',
        passwordHash: await hash(password),
        role: Role.OWNER,
        emailVerifiedAt: new Date(),
        notificationPreferences: { email: true, push: false },
      },
    });
  }
  await prisma.serviceCategory.upsert({
    where: { id: categoryId },
    update: {},
    create: { id: categoryId, businessId, name: 'Cuidado personal', sortOrder: 0 },
  });
  const staffNames = ['Profesional A', 'Profesional B', 'Profesional C'];
  for (let i = 0; i < staffIds.length; i++) {
    const staffId = staffIds[i]!;
    await prisma.staff.upsert({
      where: { id: staffId },
      update: {},
      create: {
        id: staffId,
        businessId,
        locationId,
        name: staffNames[i]!,
        bio: 'Perfil de demostración. Personaliza la especialidad, la fotografía y la presentación.',
        sortOrder: i,
      },
    });
    for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek++) {
      for (const [startMinute, endMinute] of [
        [540, 780],
        [840, 1080],
      ]) {
        await prisma.workingHours.upsert({
          where: {
            businessId_staffId_dayOfWeek_startMinute: {
              businessId,
              staffId,
              dayOfWeek,
              startMinute: startMinute!,
            },
          },
          update: {},
          create: {
            businessId,
            staffId,
            locationId,
            dayOfWeek,
            startMinute: startMinute!,
            endMinute: endMinute!,
          },
        });
      }
    }
  }
  const services = [
    {
      name: 'Corte y estilo',
      description: 'Una nueva forma de verte, a tu ritmo.',
      durationMinutes: 30,
      price: 70,
      depositAmount: 0,
      capacity: 1,
      bufferAfterMinutes: 5,
    },
    {
      name: 'Arreglo de barba',
      description: 'Detalle y precisión para todos los días.',
      durationMinutes: 20,
      price: 40,
      depositAmount: 0,
      capacity: 1,
      bufferAfterMinutes: 5,
    },
    {
      name: 'Corte + barba',
      description: 'Tu cuidado completo en una sola visita.',
      durationMinutes: 50,
      price: 100,
      depositAmount: 20,
      capacity: 1,
      bufferAfterMinutes: 10,
    },
    {
      name: 'Tratamiento capilar',
      description: 'Cuidado dedicado para tu cabello.',
      durationMinutes: 45,
      price: 120,
      depositAmount: 30,
      capacity: 1,
      bufferAfterMinutes: 10,
    },
    {
      name: 'Consulta de imagen',
      description: 'Un espacio para encontrar tu estilo.',
      durationMinutes: 30,
      price: 80,
      depositAmount: 0,
      capacity: 1,
      bufferAfterMinutes: 0,
    },
    {
      name: 'Taller de autocuidado',
      description: 'Aprende en un grupo pequeño, con cuatro cupos por turno.',
      durationMinutes: 60,
      price: 60,
      depositAmount: 0,
      capacity: 4,
      bufferAfterMinutes: 15,
    },
  ];
  for (let i = 0; i < services.length; i++) {
    const serviceId = id(3, i + 1);
    await prisma.service.upsert({
      where: { id: serviceId },
      update: {},
      create: {
        id: serviceId,
        businessId,
        categoryId,
        ...services[i]!,
        sortOrder: i,
      },
    });
    for (const staffId of staffIds) {
      await prisma.staffService.upsert({
        where: { businessId_staffId_serviceId: { businessId, staffId, serviceId } },
        update: {},
        create: { businessId, staffId, serviceId },
      });
    }
  }
  // Synthetic fixtures use the reserved .test domain and no real contact details.
  for (let i = 0; i < 3; i++) {
    const customerId = id(5, i + 1);
    await prisma.customer.upsert({
      where: { id: customerId },
      update: {},
      create: {
        id: customerId,
        businessId,
        name: `Cliente de ejemplo ${i + 1}`,
        email: `demo-${i + 1}@example.test`,
        phone: '+59170000000',
      },
    });
    const bookingId = id(6, i + 1);
    if (await prisma.booking.findUnique({ where: { id: bookingId } })) continue;
    let localStart = DateTime.now()
      .setZone('America/La_Paz')
      .plus({ days: 2 })
      .startOf('day')
      .set({ hour: 10 + i });
    if (localStart.weekday === 7) localStart = localStart.plus({ days: 1 });
    const startAt = localStart.toUTC().toJSDate();
    const endAt = localStart.plus({ minutes: 30 }).toUTC().toJSDate();
    const staffId = staffIds[i]!;
    const service = services[0]!;
    await prisma.$transaction(async (tx) => {
      await tx.booking.create({
        data: {
          id: bookingId,
          code: `DEMO000${i + 1}`,
          businessId,
          locationId,
          staffId,
          customerId,
          startAt,
          endAt,
          status: BookingStatus.CONFIRMED,
          source: BookingSource.ADMIN,
          totalAmount: service.price,
          depositAmount: 0,
          currency: 'BOB',
          notes: 'Reserva de demostración. Puedes cancelarla desde el panel.',
        },
      });
      await tx.bookingItem.create({
        data: {
          businessId,
          bookingId,
          serviceId: id(3, 1),
          staffId,
          serviceName: service.name,
          durationMinutes: 30,
          price: service.price,
          depositAmount: 0,
          capacity: 1,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 5,
          startAt,
          endAt,
          position: 0,
        },
      });
      await tx.slotClaim.createMany({
        data: Array.from({ length: 35 }, (_, n) => ({
          businessId,
          bookingId,
          staffId,
          minute: new Date(startAt.getTime() + n * 60_000),
          seat: 0,
        })),
      });
    });
  }
  const notificationTemplates = {
    BOOKING_CREATED: {
      subject: 'Tu cita {codigo}',
      body: 'Hola {cliente}, tu cita de {servicio} está registrada para el {fecha} a las {hora} en {sede}.',
    },
    BOOKING_CONFIRMED: {
      subject: 'Cita confirmada · {codigo}',
      body: 'Tu cita de {servicio} está confirmada: {fecha}, {hora}, {sede}.',
    },
    BOOKING_CANCELLED: {
      subject: 'Cita cancelada · {codigo}',
      body: 'Tu cita de {servicio} para el {fecha} fue cancelada.',
    },
    BOOKING_REMINDER: {
      subject: 'Recuerda tu cita · {codigo}',
      body: 'Te esperamos en {sede} para {servicio} el {fecha} a las {hora}.',
    },
  };
  for (const [event, value] of Object.entries(notificationTemplates)) {
    await prisma.setting.upsert({
      where: { businessId_key: { businessId, key: `notification.${event}` } },
      update: {},
      create: { businessId, key: `notification.${event}`, value },
    });
  }
  await prisma.setting.upsert({
    where: { businessId_key: { businessId, key: 'payment.instructions' } },
    update: {},
    create: {
      businessId,
      key: 'payment.instructions',
      value: {
        qrImageUrl: null,
        bank: '',
        accountNumber: '',
        beneficiary: '',
        instructions: 'Configura los datos de pago del negocio antes de aceptar anticipos.',
      },
    },
  });
  console.log(
    'Seed completado: 1 negocio, 1 sede, 3 profesionales, 6 servicios y 3 reservas de ejemplo. Las credenciales existentes no se sobrescriben.',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Error al cargar datos iniciales.');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
