import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
const base = process.env.API_URL || 'http://127.0.0.1:3001';
async function request(path, init = {}, proofAttempt = false) {
  const response = await fetch(`${base}${path}`, init);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!proofAttempt && response.status === 403 && body?.code === 'GUEST_CHALLENGE_REQUIRED') {
    const challenge = body.challenge;
    assert.ok(challenge?.algorithm === 'SHA-256' && Number.isInteger(challenge.difficulty));
    assert.ok(challenge.difficulty >= 12 && challenge.difficulty <= 22);
    const deadline = Math.min(Date.now() + 20000, Date.parse(challenge.expiresAt));
    for (let nonce = 0; nonce < 2 ** 24 && Date.now() < deadline; nonce++) {
      const hash = createHash('sha256').update(`${challenge.token}:${nonce}`).digest();
      const whole = Math.floor(challenge.difficulty / 8),
        remainder = challenge.difficulty % 8;
      if (hash.subarray(0, whole).some((byte) => byte !== 0)) continue;
      if (remainder && (hash[whole] & (0xff << (8 - remainder))) !== 0) continue;
      return request(
        path,
        {
          ...init,
          headers: {
            ...init.headers,
            'X-Guest-Challenge': challenge.token,
            'X-Guest-Nonce': String(nonce),
          },
        },
        true,
      );
    }
    throw new Error('No se resolvió el desafío dentro del tiempo de validación.');
  }
  return { response, body };
}
for (const path of ['/health', '/ready']) {
  const { response } = await request(path);
  assert.equal(response.status, 200, path);
}
const { response: catalogResponse, body: catalog } = await request('/api/v1/catalog');
assert.equal(catalogResponse.status, 200);
assert.ok(catalog.services.length >= 1, 'El catálogo contiene servicios');
const { response: privateResponse } = await request('/api/v1/bookings');
assert.equal(privateResponse.status, 401, 'Las reservas requieren autenticación');
const service =
  catalog.services.find((item) => Number(item.depositAmount) === 0) || catalog.services[0];
const from = new Date(Date.now() + 86400000);
const to = new Date(Date.now() + 5 * 86400000);
const { response: availabilityResponse, body: availability } = await request(
  `/api/v1/availability?serviceId=${service.id}&from=${from.toISOString()}&to=${to.toISOString()}`,
);
assert.equal(availabilityResponse.status, 200, 'Disponibilidad');
assert.ok(availability.data.length, 'Hay turnos disponibles en los próximos días');
const slot = availability.data[0];
const staff = catalog.staff.find((item) => item.id === slot.staffId);
const input = {
  serviceIds: [service.id],
  staffId: slot.staffId,
  locationId: staff?.locationId || catalog.locations[0].id,
  startAt: slot.startAt,
  customer: {
    name: 'Validación del entorno',
    email: `smoke-${randomUUID()}@example.test`,
    phone: '+59170000001',
  },
  source: 'WEB',
};
const jsonHeaders = { 'Content-Type': 'application/json' };
const { response: missingKey } = await request('/api/v1/bookings', {
  method: 'POST',
  headers: jsonHeaders,
  body: JSON.stringify(input),
});
assert.equal(missingKey.status, 400, 'Idempotency-Key es obligatorio');
const key = randomUUID();
const init = {
  method: 'POST',
  headers: { ...jsonHeaders, 'Idempotency-Key': key },
  body: JSON.stringify(input),
};
const first = await request('/api/v1/bookings', init);
assert.ok(
  [200, 201].includes(first.response.status),
  `Crear reserva: ${JSON.stringify(first.body)}`,
);
const second = await request('/api/v1/bookings', init);
assert.ok([200, 201].includes(second.response.status), 'Reintento idempotente');
assert.equal(first.body.id, second.body.id, 'El reintento conserva la reserva');
assert.ok(first.body.manageToken, 'Token privado de gestión del invitado');
const guest = await request(`/api/v1/bookings/manage/${first.body.manageToken}`);
assert.equal(guest.response.status, 200, 'Gestión de invitado');
const cancelled = await request(`/api/v1/bookings/manage/${first.body.manageToken}`, {
  method: 'PATCH',
  headers: { ...jsonHeaders, 'If-Match': String(first.body.version) },
  body: JSON.stringify({ status: 'CANCELLED' }),
});
assert.equal(cancelled.response.status, 200, 'Cancelar la cita creada por la comprobación');
console.log(
  'HTTP: health, ready, catálogo, privacidad, disponibilidad, idempotencia y gestión de invitado verificados.',
);
