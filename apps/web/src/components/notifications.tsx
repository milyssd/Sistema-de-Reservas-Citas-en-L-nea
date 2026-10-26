'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { dateLabel, errorMessage } from '@/lib/types';
type Notice = {
  id: string;
  subject?: string;
  body?: string;
  readAt?: string;
  event: string;
  channel?: string;
  status?: string;
  attempts?: number;
  maxAttempts?: number;
  lastError?: string;
  createdAt: string;
};
export function Notifications({ outbox = false }: { outbox?: boolean }) {
  const [items, setItems] = useState<Notice[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [push, setPush] = useState<{ enabled: boolean; publicKey?: string } | null>(null);
  async function load(append = false) {
    try {
      const result = await api.request<{ items: Notice[]; nextCursor: string | null }>(
        `${outbox ? '/admin/outbox' : '/notifications'}${append && cursor ? `?cursor=${cursor}` : ''}`,
      );
      setItems((old) => (append ? [...old, ...result.items] : result.items));
      setCursor(result.nextCursor);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    void load();
    if (!outbox)
      api
        .request<{ pushEnabled: boolean; vapidPublicKey: string | null }>('/config')
        .then((value) =>
          setPush({ enabled: value.pushEnabled, publicKey: value.vapidPublicKey || undefined }),
        )
        .catch(() => setPush({ enabled: false }));
  }, [outbox]);
  async function subscribe() {
    setError('');
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window))
        throw new Error(
          'Este navegador no admite notificaciones push. Puedes seguir consultando tus avisos aquí.',
        );
      if (!push?.enabled || !push.publicKey)
        throw new Error('El negocio aún no ha activado las notificaciones push.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted')
        throw new Error(
          'No se otorgó permiso para notificaciones. Puedes cambiarlo en la configuración del navegador.',
        );
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const padded = push.publicKey + '='.repeat((4 - (push.publicKey.length % 4)) % 4);
      const key = Uint8Array.from(atob(padded.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
        c.charCodeAt(0),
      );
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        }));
      const saved = await api.request<{ id: string }>('/devices', {
        method: 'POST',
        body: { platform: 'WEB', token: JSON.stringify(subscription.toJSON()) },
      });
      localStorage.setItem('reservas-push-device', saved.id);
      setMessage('Notificaciones activadas para este dispositivo.');
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function unsubscribe() {
    try {
      const id = localStorage.getItem('reservas-push-device');
      if (id) await api.request(`/devices/${id}`, { method: 'DELETE' });
      const registration = await navigator.serviceWorker.getRegistration();
      await (await registration?.pushManager.getSubscription())?.unsubscribe();
      localStorage.removeItem('reservas-push-device');
      setMessage('Notificaciones desactivadas en este dispositivo.');
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <section>
      <h2>{outbox ? 'Entrega de notificaciones' : 'Tus notificaciones'}</h2>
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
      {!outbox && (
        <div className="button-row">
          <button
            className="button secondary"
            onClick={() => void subscribe()}
            disabled={!push?.enabled}
          >
            Activar notificaciones en este dispositivo
          </button>
          <button className="text-link" onClick={() => void unsubscribe()}>
            Desactivar
          </button>
          {push && !push.enabled && (
            <span className="muted">El negocio aún no activó los envíos push.</span>
          )}
        </div>
      )}
      {outbox ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Evento</th>
                <th>Canal</th>
                <th>Estado</th>
                <th>Intentos</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{dateLabel(item.createdAt)}</td>
                  <td>{item.event}</td>
                  <td>{item.channel}</td>
                  <td>{item.status}</td>
                  <td>
                    {item.attempts}/{item.maxAttempts}
                  </td>
                  <td>
                    {item.lastError || '—'}
                    {['FAILED', 'PENDING'].includes(item.status || '') && (
                      <button
                        className="text-link"
                        onClick={async () => {
                          try {
                            await api.request(`/admin/outbox/${item.id}/retry`, {
                              method: 'POST',
                              body: {},
                            });
                            await load();
                          } catch (e) {
                            setError(errorMessage(e));
                          }
                        }}
                      >
                        Reintentar envío
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        items.map((item) => (
          <article className="appointment" key={item.id}>
            <div className="appointment-body">
              <span className="eyebrow">
                {dateLabel(item.createdAt)}
                {!item.readAt ? ' · Nuevo' : ''}
              </span>
              <h3>{item.subject}</h3>
              <p>{item.body}</p>
            </div>
            {!item.readAt && (
              <button
                className="text-link"
                onClick={async () => {
                  try {
                    await api.request(`/notifications/${item.id}/read`, {
                      method: 'PATCH',
                      body: {},
                    });
                    await load();
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              >
                Marcar como leído
              </button>
            )}
          </article>
        ))
      )}
      {!items.length && <p className="empty-state">No hay notificaciones para mostrar.</p>}
      {cursor && (
        <button className="button secondary" onClick={() => void load(true)}>
          Cargar más
        </button>
      )}
    </section>
  );
}
