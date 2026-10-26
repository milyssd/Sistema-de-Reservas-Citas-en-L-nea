'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { type Booking, type Catalog, dateLabel, errorMessage } from '@/lib/types';
export function ReviewDialog({
  booking,
  onClose,
  onSaved,
}: {
  booking: Booking;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await api.request('/reviews', {
        method: 'POST',
        body: {
          bookingId: booking.id,
          rating: Number(form.get('rating')),
          comment: form.get('comment'),
        },
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="dialog-backdrop">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <h2 id="review-title">¿Cómo fue tu experiencia?</h2>
        <p>
          Cita {booking.code} · {dateLabel(booking.startAt, booking.location?.timezone)}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={submit}>
          <label>
            Tu puntuación
            <select name="rating" defaultValue="5">
              <option value="5">5 · Excelente</option>
              <option value="4">4 · Muy buena</option>
              <option value="3">3 · Buena</option>
              <option value="2">2 · Puede mejorar</option>
              <option value="1">1 · Mala</option>
            </select>
          </label>
          <label>
            Cuéntanos tu experiencia
            <textarea name="comment" minLength={2} maxLength={1000} required rows={4} />
          </label>
          <p className="fine-print">
            Solo se publicará tu nombre de pila junto a la reseña. No incluyas datos personales o
            sensibles.
          </p>
          <div className="button-row">
            <button className="button" disabled={busy}>
              Publicar reseña
            </button>
            <button className="button secondary" type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
type Entry = {
  id: string;
  version: number;
  serviceId: string;
  locationId: string;
  from: string;
  to: string;
  status: string;
};
export function Waitlist() {
  const [items, setItems] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  async function load(append = false) {
    try {
      const result = await api.request<{ items: Entry[]; nextCursor: string | null }>(
        `/waitlist${append && cursor ? `?cursor=${cursor}` : ''}`,
      );
      setItems((old) => (append ? [...old, ...result.items] : result.items));
      setCursor(result.nextCursor);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    void load();
    api
      .request<Catalog>('/catalog')
      .then(setCatalog)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  return (
    <section>
      <h2>Tu lista de espera</h2>
      <p className="muted">
        Te avisamos si se libera un espacio. El aviso no reserva el cupo automáticamente.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {items.map((item) => {
        const location = catalog?.locations.find((location) => location.id === item.locationId);
        return (
          <article className="appointment" key={item.id}>
            <div className="appointment-body">
              <span className="badge">
                {{
                  WAITING: 'En espera',
                  NOTIFIED: 'Aviso enviado',
                  CANCELLED: 'Cancelada',
                  EXPIRED: 'Vencida',
                }[item.status] || item.status}
              </span>
              <h3>
                {catalog?.services.find((service) => service.id === item.serviceId)?.name ||
                  'Servicio solicitado'}
              </h3>
              <p>
                {dateLabel(item.from, location?.timezone)} —{' '}
                {dateLabel(item.to, location?.timezone)} · {location?.name}
              </p>
              <a className="text-link" href={`/?services=${item.serviceId}#reservar`}>
                Consultar horarios
              </a>
            </div>
            {item.status === 'WAITING' && (
              <button
                className="button secondary small"
                onClick={async () => {
                  try {
                    await api.request(`/waitlist/${item.id}`, {
                      method: 'DELETE',
                      headers: { 'If-Match': String(item.version) },
                    });
                    await load();
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              >
                Salir de la lista
              </button>
            )}
          </article>
        );
      })}
      {!items.length && (
        <p className="empty-state">
          No tienes solicitudes en espera. Cuando una fecha esté completa, puedes pedir un aviso
          desde el formulario de reserva.
        </p>
      )}
      {cursor && (
        <button className="button secondary" onClick={() => void load(true)}>
          Ver más solicitudes
        </button>
      )}
    </section>
  );
}
