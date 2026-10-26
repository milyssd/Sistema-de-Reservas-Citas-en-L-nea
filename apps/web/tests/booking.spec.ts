import { test, expect } from '@playwright/test';
import { DateTime } from 'luxon';
function bookingDate(days: number) {
  let date = DateTime.now().setZone('America/La_Paz').plus({ days });
  while (date.weekday > 5) date = date.plus({ days: 1 });
  return date;
}
test('un invitado reserva, consulta y cancela su cita', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Reserva tu cita', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Corte y estilo/ }).click();
  const date = bookingDate(4);
  await page.getByLabel('Fecha', { exact: true }).fill(date.toISODate()!);
  const slots = page.locator('.slots button');
  await expect(slots.first()).toBeVisible({ timeout: 20000 });
  await slots.first().click();
  await expect(page.getByRole('button', { name: 'Confirmar cita', exact: true })).toBeEnabled({
    timeout: 15000,
  });
  await page.getByLabel('Nombre completo').fill('Prueba E2E');
  await page.getByLabel('WhatsApp', { exact: true }).fill('+59170123456');
  await page.getByLabel('Correo electrónico').fill(`e2e-${Date.now()}@example.test`);
  await page.getByRole('button', { name: 'Confirmar cita', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu cita está confirmada.' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('.ticket strong')).toHaveText(/[A-Z0-9]{8}/);
  await page.getByRole('link', { name: 'Gestionar mi cita' }).click();
  await expect(page.getByRole('heading', { name: 'Gestiona tu cita' })).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancelar cita', exact: true }).click();
  await expect(page.locator('.badge')).toHaveText('Cancelada');
});
test('el panel y las cuentas no publican datos sin iniciar sesión', async ({ page }) => {
  await page.goto('/panel');
  await expect(page.getByRole('heading', { name: 'Qué bueno verte.' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto('/privacidad');
  await expect(page.getByRole('heading', { name: 'Política de privacidad' })).toBeVisible();
});

test('administración abre agenda, catálogo, reportes y notificaciones', async ({ page }) => {
  test.skip(
    !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD,
    'Requiere el administrador del seed en variables de entorno.',
  );
  await page.goto('/cuenta');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel('Contraseña', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Mi agenda', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cada día, bien organizado.' })).toBeVisible();
  for (const section of [
    'Servicios',
    'Equipo',
    'Sedes',
    'Categorías',
    'Horarios',
    'Bloqueos',
    'Clientes',
    'Pagos',
    'Reportes',
    'Políticas',
    'Usuarios',
    'Auditoría',
    'Notificaciones',
  ]) {
    await page
      .getByRole('navigation', { name: 'Administración' })
      .getByRole('button', { name: section, exact: true })
      .click();
    await expect(page.locator('main .error[role="alert"]')).toHaveCount(0);
  }
  await page.getByRole('link', { name: 'Mi cuenta', exact: true }).first().click();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Qué bueno verte.' })).toBeVisible();
});

test('la PWA abre las citas guardadas al perder la conexión', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
    }
    localStorage.setItem(
      'reservas-offline',
      JSON.stringify({
        userId: 'offline-test',
        savedAt: new Date().toISOString(),
        bookings: [
          {
            id: 'offline-example',
            code: 'OFFLINE8',
            status: 'CONFIRMED',
            startAt: '2026-11-01T14:00:00.000Z',
            endAt: '2026-11-01T14:30:00.000Z',
            staff: { name: 'Profesional de prueba' },
          },
        ],
      }),
    );
  });
  await context.setOffline(true);
  await page.goto('/sin-conexion');
  await expect(page.getByRole('heading', { name: 'Estás sin conexión.' })).toBeVisible();
  await expect(page.getByText('Profesional de prueba · Código OFFLINE8')).toBeVisible();
  await page.getByRole('button', { name: 'Borrar citas de este dispositivo' }).click();
  await expect(page.getByText(/No guardaste citas en este dispositivo/)).toBeVisible();
  await context.setOffline(false);
});

test('encadena dos servicios con profesionales distintos en una reserva', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Corte y estilo/ }).click();
  await page.getByRole('button', { name: /Arreglo de barba/ }).click();
  await page.getByLabel('Elegir profesional para cada servicio').check();
  await page
    .getByLabel('Profesional para Corte y estilo', { exact: true })
    .selectOption({ label: 'Profesional A' });
  await page
    .getByLabel('Profesional para Arreglo de barba', { exact: true })
    .selectOption({ label: 'Profesional B' });
  const target = bookingDate(7);
  await page.getByLabel('Fecha', { exact: true }).fill(target.toISODate()!);
  await page.locator('.slots button').first().click();
  await expect(page.getByRole('button', { name: 'Confirmar cita', exact: true })).toBeEnabled({
    timeout: 15000,
  });
  await expect(page.locator('.segment-list li')).toHaveCount(2);
  await expect(page.locator('.segment-list')).toContainText('Profesional A');
  await expect(page.locator('.segment-list')).toContainText('Profesional B');
  await page.getByLabel('Nombre completo').fill('Prueba de servicios encadenados');
  await page.getByLabel('WhatsApp', { exact: true }).fill('+59170123456');
  await page.getByLabel('Correo electrónico').fill(`mixed-${Date.now()}@example.test`);
  await page.getByRole('button', { name: 'Confirmar cita', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu cita está confirmada.' })).toBeVisible();
  await page.getByRole('link', { name: 'Gestionar mi cita' }).click();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancelar cita', exact: true }).click();
  await expect(page.locator('.badge')).toHaveText('Cancelada');
});

test('resuelve una prueba de trabajo real en segundo plano y rechaza su reutilización', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('/');
  const from = bookingDate(9).startOf('day');
  const result = await page.evaluate(
    async ({ apiUrl, from, to }) => {
      const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'reservas-client' };
      const catalog = await fetch(`${apiUrl}/catalog`).then((response) => response.json());
      const query = new URLSearchParams({
        serviceId: catalog.services[0].id,
        locationId: catalog.locations[0].id,
        from,
        to,
      });
      const availability = await fetch(`${apiUrl}/availability?${query}`).then((response) =>
        response.json(),
      );
      const slot = availability.data[0];
      if (!slot) throw new Error('No hay turnos disponibles para verificar el desafío.');
      const payload = {
        serviceIds: [catalog.services[0].id],
        locationId: catalog.locations[0].id,
        staffId: slot.staffId,
        startAt: slot.startAt,
      };
      const response = await fetch(`${apiUrl}/anti-abuse/challenge`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'HOLD', payload }),
      });
      if (!response.ok) throw new Error(`No se pudo solicitar el desafío: ${response.status}`);
      const challenge = await response.json();
      const nonce = await new Promise<string>((resolve, reject) => {
        const worker = new Worker('/proof-worker.js');
        worker.onmessage = ({ data }) => {
          worker.terminate();
          if (data.error) reject(new Error(data.error));
          else resolve(data.nonce);
        };
        worker.onerror = () => {
          worker.terminate();
          reject(new Error('Error del verificador'));
        };
        worker.postMessage(challenge);
      });
      const proofHeaders = {
        ...headers,
        'X-Guest-Challenge': challenge.token,
        'X-Guest-Nonce': nonce,
      };
      const accepted = await fetch(`${apiUrl}/bookings/holds`, {
        method: 'POST',
        headers: proofHeaders,
        body: JSON.stringify(payload),
      });
      const replay = await fetch(`${apiUrl}/bookings/holds`, {
        method: 'POST',
        headers: proofHeaders,
        body: JSON.stringify(payload),
      });
      return { accepted: accepted.status, replay: replay.status };
    },
    {
      apiUrl: process.env.E2E_API_URL || 'http://localhost:3001/api/v1',
      from: from.toUTC().toISO()!,
      to: from.endOf('day').toUTC().toISO()!,
    },
  );
  expect(result.accepted).toBe(201);
  expect(result.replay).toBe(403);
});

test('el administrador confirma un anticipo y registra una devolución parcial', async ({
  page,
}) => {
  test.skip(
    !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD,
    'Requiere el administrador del seed.',
  );
  test.setTimeout(90000);
  await page.goto('/');
  await page.getByRole('button', { name: /Corte \+ barba/ }).click();
  await page.getByLabel('Fecha', { exact: true }).fill(bookingDate(11).toISODate()!);
  await page.locator('.slots button').first().click();
  await expect(page.getByRole('button', { name: 'Confirmar cita', exact: true })).toBeEnabled({
    timeout: 15000,
  });
  await page.getByLabel('Nombre completo').fill('Prueba devolución parcial');
  await page.getByLabel('WhatsApp', { exact: true }).fill('+59170123456');
  await page.getByLabel('Correo electrónico').fill(`refund-${Date.now()}@example.test`);
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/bookings') &&
      response.request().method() === 'POST' &&
      response.ok(),
  );
  await page.getByRole('button', { name: 'Confirmar cita', exact: true }).click();
  await (await created).json();
  await expect(page.getByRole('heading', { name: 'Recibimos tu reserva.' })).toBeVisible();
  await page.getByRole('link', { name: 'Gestionar mi cita' }).click();
  const manageUrl = page.url();
  await page.getByRole('combobox', { name: 'Método de pago', exact: true }).selectOption('CASH');
  const paymentResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/payments') &&
      response.request().method() === 'POST' &&
      response.ok(),
  );
  await page.getByRole('button', { name: 'Registrar pago en el local', exact: true }).click();
  const payment = await (await paymentResponse).json();
  await expect(page.getByRole('status')).toContainText('Pago registrado');
  await page.goto('/cuenta');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel('Contraseña', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.getByRole('link', { name: 'Mi agenda', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('button', { name: 'Pagos', exact: true })
    .click();
  const row = page.getByTestId(`payment-${payment.id}`);
  await row.getByRole('button', { name: 'Confirmar pago', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar operación', exact: true }).click();
  await row.getByRole('button', { name: 'Reembolsar', exact: true }).click();
  await page.getByLabel('Monto de la devolución (Bs)', { exact: true }).fill('5');
  await page.getByLabel('Motivo', { exact: true }).fill('Ajuste parcial de prueba E2E');
  await page.getByRole('button', { name: 'Guardar operación', exact: true }).click();
  await expect(row).toContainText('Devuelto: Bs 5,00');
  await row.getByRole('button', { name: 'Ver devoluciones', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Historial de devoluciones' })).toContainText(
    'Ajuste parcial de prueba E2E',
  );
  await page
    .getByRole('dialog', { name: 'Historial de devoluciones' })
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click();
  await page.goto(manageUrl);
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancelar cita', exact: true }).click();
  await expect(page.locator('.badge')).toHaveText('Cancelada');
});
