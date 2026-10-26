'use client';
import { useEffect, useState } from 'react';
import { type Booking, dateLabel, timeLabel, statusLabels } from '@/lib/types';
export function OfflineAppointments() {
  const [saved, setSaved] = useState<{ bookings: Booking[]; savedAt: string } | null>(null);
  useEffect(() => {
    try {
      const data = localStorage.getItem('reservas-offline');
      if (data) setSaved(JSON.parse(data));
    } catch {
      setSaved(null);
    }
  }, []);
  return (
    <>
      <p className="eyebrow">Hacemos una pausa</p>
      <h1>Estás sin conexión.</h1>
      <p>Vuelve a conectarte para reservar, comprobar cambios o gestionar tus citas.</p>
      <button className="button" onClick={() => window.location.reload()}>
        Volver a intentar
      </button>
      {saved ? (
        <section>
          <h2 style={{ marginTop: 35 }}>Tus citas guardadas</h2>
          <p className="muted">
            Copia del {dateLabel(saved.savedAt)}. Los horarios y estados pueden haber cambiado.
          </p>
          {saved.bookings.map((booking) => (
            <article className="appointment" key={booking.id}>
              <div>
                <span className={`badge ${booking.status}`}>{statusLabels[booking.status]}</span>
                <h3>
                  {dateLabel(booking.startAt)} · {timeLabel(booking.startAt)}
                </h3>
                <p>
                  {booking.staff?.name} · Código {booking.code}
                </p>
              </div>
            </article>
          ))}
          <button
            className="button danger"
            onClick={() => {
              localStorage.removeItem('reservas-offline');
              setSaved(null);
            }}
          >
            Borrar citas de este dispositivo
          </button>
        </section>
      ) : (
        <p className="empty-state">
          No guardaste citas en este dispositivo. Puedes hacerlo desde Mi cuenta cuando tengas
          conexión.
        </p>
      )}
    </>
  );
}
