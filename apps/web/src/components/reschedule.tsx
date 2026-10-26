'use client';
import { useState } from 'react';
import { DateTime } from 'luxon';
import { api } from '@/lib/api';
import { type Booking, type Slot, timeLabel, errorMessage } from '@/lib/types';
export function Reschedule({
  booking,
  onClose,
  onSaved,
}: {
  booking: Booking;
  onClose: () => void;
  onSaved: () => void;
}) {
  const zone = booking.location?.timezone || 'America/La_Paz';
  const [date, setDate] = useState(DateTime.fromISO(booking.startAt).setZone(zone).toISODate()!);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function search() {
    setBusy(true);
    try {
      const day = DateTime.fromISO(date, { zone });
      const serviceIds = booking.items
        ?.map((item) => item.serviceId)
        .filter(Boolean)
        .join(',');
      if (!serviceIds) throw new Error('Contacta al negocio para cambiar esta cita.');
      const query = new URLSearchParams({
        serviceIds,
        ...(booking.items && new Set(booking.items.map((item) => item.staffId)).size > 1
          ? { staffIds: booking.items.map((item) => item.staffId || booking.staffId).join(',') }
          : { staffId: booking.staffId }),
        locationId: booking.locationId,
        from: day.startOf('day').toUTC().toISO()!,
        to: day.endOf('day').toUTC().toISO()!,
      });
      setSlots((await api.request<{ data: Slot[] }>(`/availability?${query}`)).data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="dialog-backdrop">
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
      >
        <h2 id="reschedule-title">Cambia tu horario</h2>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <label>
          Fecha de tu nueva cita
          <input
            type="date"
            value={date}
            min={DateTime.now().setZone(zone).toISODate()!}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button
          className="button secondary"
          style={{ marginTop: 16 }}
          disabled={busy}
          onClick={() => void search()}
        >
          Consultar horarios
        </button>
        <div className="slots">
          {slots.map((slot) => (
            <button
              key={slot.startAt}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.request(`/bookings/${booking.id}`, {
                    method: 'PATCH',
                    headers: { 'If-Match': String(booking.version) },
                    body: {
                      startAt: slot.startAt,
                      ...(slot.staffIds && new Set(slot.staffIds).size > 1
                        ? { staffIds: slot.staffIds }
                        : { staffId: slot.staffId }),
                    },
                  });
                  onSaved();
                  onClose();
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {timeLabel(slot.startAt, zone)}
            </button>
          ))}
        </div>
        <button className="button secondary" style={{ marginTop: 20 }} onClick={onClose}>
          Cerrar
        </button>
      </section>
    </div>
  );
}
