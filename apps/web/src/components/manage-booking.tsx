'use client';
import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { PaymentForm } from './payment';
import { api, API_URL } from '@/lib/api';
import {
  type Booking,
  type Slot,
  type Catalog,
  dateLabel,
  timeLabel,
  money,
  statusLabels,
  errorMessage,
} from '@/lib/types';
export function ManageBooking({ token }: { token: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reschedule, setReschedule] = useState(false);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const zone = booking?.location?.timezone || 'America/La_Paz';
  useEffect(() => {
    api
      .request<Booking>(`/bookings/manage/${token}`)
      .then((value) => {
        setBooking(value);
        setDate(
          DateTime.fromISO(value.startAt)
            .setZone(value.location?.timezone || 'America/La_Paz')
            .toISODate()!,
        );
      })
      .catch((e) => setError(errorMessage(e)));
    api
      .request<Catalog>('/catalog')
      .then(setCatalog)
      .catch(() => {});
  }, [token]);
  async function edit(body: unknown) {
    if (!booking) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.request<Booking>(`/bookings/manage/${token}`, {
        method: 'PATCH',
        headers: { 'If-Match': String(booking.version) },
        body,
      });
      setBooking(result);
      setReschedule(false);
      setMessage('Tu cita fue actualizada.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function findSlots() {
    if (!booking || !catalog) return;
    const services = booking.items
      ?.map(
        (item) =>
          item.serviceId ||
          catalog.services.find(
            (service) => service.name === (item.serviceName || item.name || item.service?.name),
          )?.id,
      )
      .filter(Boolean);
    if (!services?.length) {
      setError('No se puede consultar este servicio. Contacta al negocio para reprogramar.');
      return;
    }
    setBusy(true);
    try {
      const day = DateTime.fromISO(date, { zone });
      const params = new URLSearchParams({
        serviceIds: services.join(','),
        ...(booking.items && new Set(booking.items.map((item) => item.staffId)).size > 1
          ? { staffIds: booking.items.map((item) => item.staffId || booking.staffId).join(',') }
          : { staffId: booking.staffId }),
        locationId: booking.locationId,
        from: day.startOf('day').toUTC().toISO()!,
        to: day.endOf('day').toUTC().toISO()!,
      });
      setSlots((await api.request<{ data: Slot[] }>(`/availability?${params}`)).data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="eyebrow">Tu espacio en la agenda</p>
      <h1 style={{ fontSize: '2.8rem' }}>Gestiona tu cita</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {booking ? (
        <>
          <span className={`badge ${booking.status}`}>
            {statusLabels[booking.status] || booking.status}
          </span>
          <div className="ticket">
            <span>CÓDIGO DE RESERVA</span>
            <strong>{booking.code}</strong>
            <h2>
              {booking.items
                ?.map((item) => item.serviceName || item.name || item.service?.name)
                .filter(Boolean)
                .join(' + ') || 'Tu cita'}
            </h2>
            <p>
              {dateLabel(booking.startAt, zone)} · {timeLabel(booking.startAt, zone)}
            </p>
            <p>
              {booking.staff?.name} · {booking.location?.name}
            </p>
            <p>
              Total {money(booking.totalAmount)}
              {Number(booking.depositAmount) > 0
                ? ` · Anticipo ${money(booking.depositAmount)}`
                : ''}
            </p>
          </div>
          <div className="button-row">
            <a
              className="button secondary"
              href={`${API_URL}/bookings/manage/${token}/calendar.ics`}
            >
              Agregar al calendario
            </a>
            {['CONFIRMED', 'PENDING'].includes(booking.status) && (
              <>
                <button className="button" onClick={() => setReschedule(!reschedule)}>
                  Cambiar horario
                </button>
                <button
                  className="button danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        '¿Cancelar tu cita? Se aplicará la política de anticipos y cancelación.',
                      )
                    )
                      void edit({ status: 'CANCELLED' });
                  }}
                >
                  Cancelar cita
                </button>
              </>
            )}
          </div>
          {reschedule && (
            <section className="resource-editor">
              <h3>Elige tu nuevo horario</h3>
              <div className="toolbar">
                <label>
                  Fecha
                  <input
                    type="date"
                    required
                    value={date}
                    min={DateTime.now().setZone(zone).toISODate()!}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void findSlots()}
                >
                  Consultar horarios
                </button>
              </div>
              <div className="slots">
                {slots.map((slot) => (
                  <button
                    key={slot.startAt}
                    disabled={busy}
                    onClick={() =>
                      void edit({
                        startAt: slot.startAt,
                        ...(slot.staffIds && new Set(slot.staffIds).size > 1
                          ? { staffIds: slot.staffIds }
                          : { staffId: slot.staffId }),
                      })
                    }
                  >
                    {timeLabel(slot.startAt, zone)}
                  </button>
                ))}
              </div>
            </section>
          )}
          {booking.status === 'PENDING' && Number(booking.depositAmount) > 0 && (
            <PaymentForm
              bookingId={booking.id}
              amount={Number(booking.depositAmount)}
              token={token}
            />
          )}
          <p className="fine-print">
            Las modificaciones están sujetas al plazo de cancelación del negocio. Guarda este enlace
            de forma privada.
          </p>
        </>
      ) : (
        !error && <p role="status">Buscando tu cita…</p>
      )}
    </>
  );
}
