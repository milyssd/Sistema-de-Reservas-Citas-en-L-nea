'use client';
import { useEffect, useState, type DragEvent, type CSSProperties } from 'react';
import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { useEvents } from '@/lib/use-events';
import { useAuth } from './providers';
import {
  type Booking,
  type Catalog,
  dateLabel,
  timeLabel,
  statusLabels,
  errorMessage,
} from '@/lib/types';
export function Agenda({ catalog, admin }: { catalog: Catalog | null; admin: boolean }) {
  const [date, setDate] = useState(DateTime.now().setZone('America/La_Paz').toISODate()!);
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [staff, setStaff] = useState('');
  const [locationId, setLocationId] = useState('');
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<Booking | null>(null);
  const [newBooking, setNew] = useState(false);
  const [feed, setFeed] = useState('');
  const [newKey, setNewKey] = useState(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const effectiveLocation =
    locationId ||
    (!admin ? catalog?.staff.find((item) => item.id === user?.staffId)?.locationId : undefined) ||
    catalog?.locations[0]?.id;
  const zone =
    catalog?.locations.find((item) => item.id === effectiveLocation)?.timezone || 'America/La_Paz';
  const day = DateTime.fromISO(date, { zone });
  const start = day.startOf(view === 'day' ? 'day' : view === 'week' ? 'week' : 'month');
  const end = day.endOf(view === 'day' ? 'day' : view === 'week' ? 'week' : 'month');
  const days = Array.from(
    { length: Math.round(end.startOf('day').diff(start, 'days').days) + 1 },
    (_, index) => start.plus({ days: index }),
  );
  async function load() {
    try {
      const query = new URLSearchParams({
        from: start.toUTC().toISO()!,
        to: end.toUTC().toISO()!,
        limit: '100',
      });
      if (staff) query.set('staffId', staff);
      if (effectiveLocation) query.set('locationId', effectiveLocation);
      let result = await api.request<{ data: Booking[]; nextCursor: string | null }>(
        `/bookings?${query}`,
      );
      const all = [...result.data];
      while (result.nextCursor) {
        query.set('cursor', result.nextCursor);
        result = await api.request(`/bookings?${query}`);
        all.push(...result.data);
      }
      setBookings(all);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    void load();
  }, [date, view, staff, effectiveLocation, zone]);
  useEvents('/bookings/events', () => void load());
  async function patch(booking: Booking, body: unknown) {
    setBusy(true);
    setError('');
    try {
      await api.request(`/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'If-Match': String(booking.version) },
        body,
      });
      setEdit(null);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function dropped(event: DragEvent, date: DateTime) {
    event.preventDefault();
    if (!admin) return;
    const found = bookings.find((item) => item.id === event.dataTransfer.getData('text/plain'));
    if (!found) return;
    const original = DateTime.fromISO(found.startAt).setZone(zone);
    const moved = date.set({ hour: original.hour, minute: original.minute });
    if (confirm(`¿Mover la cita ${found.code} al ${moved.toFormat('dd/MM/yyyy HH:mm')}?`))
      await patch(found, { startAt: moved.toUTC().toISO() });
  }
  return (
    <section>
      <div className="toolbar">
        {admin && (
          <label>
            Sede
            <select
              value={effectiveLocation || ''}
              onChange={(event) => {
                setLocationId(event.target.value);
                setStaff('');
              }}
            >
              {catalog?.locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className="button secondary"
          aria-label="Período anterior"
          onClick={() =>
            setDate(
              day
                .minus({ [view === 'day' ? 'days' : view === 'week' ? 'weeks' : 'months']: 1 })
                .toISODate()!,
            )
          }
        >
          <ChevronLeft size={17} />
        </button>
        <label>
          Fecha
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button
          className="button secondary"
          aria-label="Período siguiente"
          onClick={() =>
            setDate(
              day
                .plus({ [view === 'day' ? 'days' : view === 'week' ? 'weeks' : 'months']: 1 })
                .toISODate()!,
            )
          }
        >
          <ChevronRight size={17} />
        </button>
        <label>
          Vista
          <select value={view} onChange={(e) => setView(e.target.value as typeof view)}>
            <option value="day">Día</option>
            <option value="week">Semana</option>
            <option value="month">Mes</option>
          </select>
        </label>
        {admin && (
          <label>
            Profesional
            <select value={staff} onChange={(e) => setStaff(e.target.value)}>
              <option value="">Todo el equipo</option>
              {catalog?.staff
                .filter((item) => item.locationId === effectiveLocation)
                .map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <button
          className="button secondary"
          onClick={() => void load()}
          aria-label="Actualizar agenda"
        >
          <RefreshCw size={17} />
        </button>
        {admin && (
          <button
            className="button"
            onClick={() => {
              setNewKey(crypto.randomUUID());
              setNew(true);
            }}
          >
            <Plus size={17} /> Nueva cita
          </button>
        )}
      </div>
      {!admin && (
        <button
          className="button secondary"
          onClick={async () => {
            try {
              const own = await api.request<{ id: string; version: number }>('/staff/me');
              const result = await api.request<{ path: string }>(
                `/staff/${own.id}/calendar-token`,
                { method: 'POST', headers: { 'If-Match': String(own.version) }, body: {} },
              );
              setFeed(`${new URL(API_URL).origin}${result.path}`);
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          Crear enlace de mi agenda iCal
        </button>
      )}
      {feed && (
        <p className="notice">
          Enlace privado para suscribir tu calendario. Un nuevo enlace invalida el anterior.
          <input aria-label="Enlace privado de mi calendario" readOnly value={feed} />
        </p>
      )}
      <p className="muted">
        Horarios de {zone}.{' '}
        {admin
          ? 'Arrastra una cita a otro día o selecciónala para cambiar hora y estado.'
          : 'Selecciona una cita para registrar la atención.'}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="calendar">
        <div
          className={view === 'month' ? 'calendar-month' : 'calendar-days'}
          style={
            {
              '--days': days.length,
              minWidth: view === 'day' ? 'auto' : undefined,
            } as CSSProperties
          }
        >
          {days.map((date) => (
            <div
              className="calendar-day"
              key={date.toISODate()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => void dropped(event, date)}
            >
              <h3>{date.setLocale('es').toFormat('ccc dd MMM')}</h3>
              {bookings
                .filter(
                  (item) =>
                    DateTime.fromISO(item.startAt).setZone(zone).toISODate() === date.toISODate(),
                )
                .map((item) => (
                  <button
                    draggable={admin}
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', item.id)}
                    onClick={() => setEdit(item)}
                    className={`calendar-entry ${item.status}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      borderTop: 0,
                      borderRight: 0,
                      borderBottom: 0,
                      color: 'inherit',
                    }}
                    key={item.id}
                  >
                    <strong>
                      {timeLabel(item.startAt, zone)} — {timeLabel(item.endAt, zone)}
                    </strong>
                    {item.customer?.name || item.code}
                    <br />
                    {catalog?.staff.find((s) => s.id === item.staffId)?.name}
                    <br />
                    <span className={`badge ${item.status}`}>{statusLabels[item.status]}</span>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>
      {edit && (
        <div className="dialog-backdrop" onClick={() => setEdit(null)}>
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-title">Cita {edit.code}</h2>
            <p>
              {edit.customer?.name} · {dateLabel(edit.startAt, zone)}
            </p>
            {edit.canManage === false && (
              <p className="notice">
                Esta cita incluye a otros profesionales. Administración gestiona los cambios de la
                cita completa.
              </p>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                void patch(edit, {
                  status: data.get('status'),
                  ...(admin
                    ? {
                        ...(edit.items && new Set(edit.items.map((item) => item.staffId)).size > 1
                          ? { staffIds: edit.items.map((_, index) => data.get(`staff-${index}`)) }
                          : { staffId: data.get('staffId') }),
                        startAt: DateTime.fromISO(String(data.get('startAt')), { zone })
                          .toUTC()
                          .toISO(),
                      }
                    : {}),
                });
              }}
            >
              {admin && (
                <>
                  <label>
                    Inicio (hora local)
                    <input
                      name="startAt"
                      type="datetime-local"
                      defaultValue={DateTime.fromISO(edit.startAt)
                        .setZone(zone)
                        .toFormat("yyyy-MM-dd'T'HH:mm")}
                      required
                    />
                  </label>
                  {edit.items && new Set(edit.items.map((item) => item.staffId)).size > 1 ? (
                    <>
                      {edit.items.map((item, index) => (
                        <label key={`${item.serviceId}-${index}`}>
                          Profesional para {item.serviceName}
                          <select name={`staff-${index}`} defaultValue={item.staffId}>
                            {catalog?.staff
                              .filter(
                                (staff) =>
                                  staff.locationId === effectiveLocation &&
                                  (!staff.staffServices ||
                                    staff.staffServices.some(
                                      (link) => link.serviceId === item.serviceId,
                                    )),
                              )
                              .map((staff) => (
                                <option key={staff.id} value={staff.id}>
                                  {staff.name}
                                </option>
                              ))}
                          </select>
                        </label>
                      ))}
                    </>
                  ) : (
                    <label>
                      Profesional
                      <select name="staffId" defaultValue={edit.staffId}>
                        {catalog?.staff
                          .filter((item) => item.locationId === effectiveLocation)
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                </>
              )}
              <label>
                Estado
                <select
                  name="status"
                  defaultValue={edit.status}
                  disabled={edit.canManage === false}
                >
                  {Object.entries(statusLabels)
                    .filter(([key]) => admin || ['CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(key))
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
              {edit.customer?.phone && (
                <a
                  href={`https://wa.me/${edit.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${edit.customer.name}, te escribimos por tu cita ${edit.code}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  Contactar por WhatsApp
                </a>
              )}
              <div className="button-row">
                <button disabled={busy || edit.canManage === false} className="button">
                  Guardar cambios
                </button>
                <button type="button" className="button secondary" onClick={() => setEdit(null)}>
                  Cerrar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {newBooking && catalog && (
        <div className="dialog-backdrop">
          <section role="dialog" aria-modal="true" aria-labelledby="new-title" className="dialog">
            <h2 id="new-title">Crear cita manual</h2>
            <p className="muted">
              Se comprueba la misma disponibilidad que en las reservas en línea.
            </p>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                const data = new FormData(event.currentTarget);
                try {
                  await api.request('/bookings', {
                    method: 'POST',
                    headers: { 'Idempotency-Key': newKey },
                    body: {
                      serviceIds: [data.get('serviceId')],
                      locationId: data.get('locationId'),
                      staffId: data.get('staffId'),
                      startAt: DateTime.fromISO(String(data.get('startAt')), { zone })
                        .toUTC()
                        .toISO(),
                      customer: {
                        name: data.get('name'),
                        email: data.get('email'),
                        phone: data.get('phone'),
                      },
                      source: data.get('source'),
                    },
                  });
                  setNew(false);
                  await load();
                } catch (e) {
                  setError(errorMessage(e));
                  setNew(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Servicio
                <select name="serviceId">
                  {catalog.services.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sede
                <select
                  name="locationId"
                  value={effectiveLocation || ''}
                  onChange={(event) => setLocationId(event.target.value)}
                >
                  {catalog.locations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Profesional
                <select name="staffId">
                  {catalog.staff
                    .filter((item) => item.locationId === effectiveLocation)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Inicio (hora local)
                <input
                  name="startAt"
                  type="datetime-local"
                  defaultValue={`${date}T10:00`}
                  required
                />
              </label>
              <label>
                Nombre del cliente
                <input name="name" required minLength={2} />
              </label>
              <label>
                Correo
                <input name="email" type="email" required />
              </label>
              <label>
                Celular
                <input
                  name="phone"
                  type="tel"
                  defaultValue="+591"
                  pattern="\+591[67][0-9]{7}"
                  required
                />
              </label>
              <label>
                Origen
                <select name="source">
                  <option value="ADMIN">Por teléfono</option>
                  <option value="WALK_IN">Presencial</option>
                </select>
              </label>
              <div className="button-row">
                <button disabled={busy} className="button">
                  Crear cita
                </button>
                <button className="button secondary" type="button" onClick={() => setNew(false)}>
                  Cerrar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
