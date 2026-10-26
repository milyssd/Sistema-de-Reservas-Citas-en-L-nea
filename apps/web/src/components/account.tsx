'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { DateTime } from 'luxon';
import { LogOut, Download, CalendarDays, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from './providers';
import { PaymentForm } from './payment';
import { Reschedule } from './reschedule';
import { Notifications } from './notifications';
import { ReviewDialog, Waitlist } from './community';
import { DeleteAccount } from './delete-account';
import { useEvents } from '@/lib/use-events';
import {
  type User,
  type Booking,
  dateLabel,
  timeLabel,
  money,
  statusLabels,
  errorMessage,
} from '@/lib/types';
type Profile = {
  name: string;
  phone: string;
  version: number;
  notificationPreferences: { email: boolean; push: boolean } | null;
  emailVerifiedAt: string | null;
  totpEnabled: boolean;
};
type Session = { id: string; userAgent: string; ip: string; createdAt: string; expiresAt: string };
export function LoginForm() {
  const { authenticate } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const body =
      mode === 'forgot'
        ? { email: data.get('email') }
        : {
            email: data.get('email'),
            password: data.get('password'),
            platform: 'web',
            ...(mode === 'register'
              ? { name: data.get('name'), phone: data.get('phone') }
              : { ...(data.get('totpCode') ? { totpCode: data.get('totpCode') } : {}) }),
          };
    try {
      if (mode === 'forgot') {
        await api.request('/auth/forgot-password', { method: 'POST', body });
        setMessage(
          'Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.',
        );
      } else {
        const result = await api.request<{ accessToken: string; user: User }>(`/auth/${mode}`, {
          method: 'POST',
          body,
        });
        authenticate(result);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-card">
      <p className="eyebrow">Tu tiempo, en un lugar</p>
      <h1>
        {mode === 'register'
          ? 'Crea tu cuenta'
          : mode === 'forgot'
            ? 'Recupera el acceso'
            : 'Qué bueno verte.'}
      </h1>
      <p className="muted">Consulta tus citas y encuentra espacio para lo que viene.</p>
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
      <form onSubmit={submit}>
        {mode === 'register' && (
          <>
            <label>
              Nombre completo
              <input name="name" autoComplete="name" required minLength={2} />
            </label>
            <label>
              WhatsApp
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                pattern="\+591[67][0-9]{7}"
                defaultValue="+591"
                required
              />
            </label>
          </>
        )}
        <label>
          Correo electrónico
          <input name="email" type="email" autoComplete="email" required />
        </label>
        {mode !== 'forgot' && (
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={mode === 'register' ? 12 : 1}
              required
            />
            {mode === 'register' && (
              <small className="muted">
                Al menos 12 caracteres, mayúscula, minúscula y número.
              </small>
            )}
          </label>
        )}
        {mode === 'login' && (
          <details>
            <summary>Uso verificación en dos pasos</summary>
            <label>
              Código de autenticador
              <input
                name="totpCode"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
              />
            </label>
          </details>
        )}
        <button className="button" disabled={busy}>
          {busy
            ? 'Un momento…'
            : mode === 'login'
              ? 'Ingresar'
              : mode === 'register'
                ? 'Crear cuenta'
                : 'Enviar instrucciones'}
        </button>
      </form>
      <div className="button-row" style={{ marginTop: 22 }}>
        <button
          className="text-link"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
            setMessage('');
          }}
        >
          {mode === 'login' ? 'Crear una cuenta' : 'Ya tengo una cuenta'}
        </button>
        {mode === 'login' && (
          <button className="text-link" onClick={() => setMode('forgot')}>
            Olvidé mi contraseña
          </button>
        )}
      </div>
    </section>
  );
}
export function Account() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState('citas');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [totp, setTotp] = useState<{ secret?: string; otpauthUrl?: string } | null>(null);
  const [offline, setOffline] = useState(false);
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);
  const [paying, setPaying] = useState<Booking | null>(null);
  const [reviewing, setReviewing] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState(false);
  async function load(append = false) {
    try {
      if (tab === 'citas') {
        const result = await api.request<{ data: Booking[]; nextCursor: string | null }>(
          `/bookings${append && cursor ? `?cursor=${cursor}` : ''}`,
        );
        setBookings((old) => (append ? [...old, ...result.data] : result.data));
        setCursor(result.nextCursor);
        setOffline(false);
      }
      if (tab === 'perfil') setProfile(await api.request<Profile>('/users/me'));
      if (tab === 'sesiones') {
        const result = await api.request<{ items: Session[] }>('/auth/sessions');
        setSessions(result.items);
      }
    } catch (e) {
      if (tab === 'citas' && !navigator.onLine) {
        const saved = localStorage.getItem('reservas-offline');
        if (saved) {
          const parsed = JSON.parse(saved) as { userId: string; bookings: Booking[] };
          if (parsed.userId === user?.id) {
            setBookings(parsed.bookings);
            setOffline(true);
            return;
          }
        }
      }
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    if (user) void load();
  }, [user, tab]);
  useEvents(
    '/bookings/events',
    () => {
      if (tab === 'citas') void load();
    },
    Boolean(user),
  );
  async function cancel(booking: Booking) {
    if (!confirm('¿Cancelar esta cita? Se aplicará la política de cancelación del negocio.'))
      return;
    try {
      await api.request(`/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'If-Match': String(booking.version) },
        body: { status: 'CANCELLED' },
      });
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  if (loading) return <p role="status">Recuperando tu sesión…</p>;
  if (!user) return <LoginForm />;
  return (
    <>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Tu agenda personal</p>
          <h1 style={{ fontSize: '2.5rem' }}>Hola, {user.name.split(' ')[0]}.</h1>
        </div>
        <button className="button secondary" onClick={() => void logout()}>
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
      <div className="tabs" role="tablist" aria-label="Mi cuenta">
        {[
          ['citas', 'Mis citas'],
          ['avisos', 'Notificaciones'],
          ['espera', 'Lista de espera'],
          ['perfil', 'Perfil y preferencias'],
          ['sesiones', 'Sesiones y seguridad'],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'active' : ''}
            onClick={() => {
              setTab(id);
              setMessage('');
              setError('');
            }}
          >
            {label}
          </button>
        ))}
      </div>
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
      {tab === 'citas' && (
        <>
          <div className="button-row">
            <a className="button" href="/#reservar">
              <CalendarDays size={17} /> Reservar una cita
            </a>
            <button
              className="button secondary"
              onClick={() => {
                localStorage.setItem(
                  'reservas-offline',
                  JSON.stringify({
                    userId: user.id,
                    bookings: bookings.map(
                      ({
                        id,
                        code,
                        status,
                        startAt,
                        endAt,
                        version,
                        staffId,
                        locationId,
                        totalAmount,
                        depositAmount,
                        staff,
                        items,
                      }) => ({
                        id,
                        code,
                        status,
                        startAt,
                        endAt,
                        version,
                        staffId,
                        locationId,
                        totalAmount,
                        depositAmount,
                        staff,
                        items,
                      }),
                    ),
                    savedAt: new Date().toISOString(),
                  }),
                );
                setMessage(
                  'Citas guardadas en este dispositivo para consulta sin conexión. Se eliminan al cerrar sesión.',
                );
              }}
            >
              <Download size={16} /> Guardar para ver sin conexión
            </button>
          </div>
          {offline && (
            <p className="offline-banner">
              Estás viendo citas guardadas. Conéctate para comprobar cambios y gestionar una cita.
            </p>
          )}
          {!bookings.length && (
            <p className="empty-state">
              Todavía no tienes citas. Tu próximo momento empieza con una reserva.
            </p>
          )}
          {bookings.map((booking) => (
            <article className="appointment" key={booking.id}>
              <div className="appointment-date">
                <strong>
                  {
                    DateTime.fromISO(booking.startAt).setZone(
                      booking.location?.timezone || 'America/La_Paz',
                    ).day
                  }
                </strong>
                <span>
                  {DateTime.fromISO(booking.startAt)
                    .setZone(booking.location?.timezone || 'America/La_Paz')
                    .setLocale('es')
                    .toFormat('MMM yyyy')}
                </span>
              </div>
              <div className="appointment-body">
                <span className={`badge ${booking.status}`}>
                  {statusLabels[booking.status] || booking.status}
                </span>
                <h3>
                  {booking.items
                    ?.map((item) => item.serviceName || item.name || item.service?.name)
                    .filter(Boolean)
                    .join(' + ') || 'Tu cita'}
                </h3>
                <p>
                  {timeLabel(booking.startAt, booking.location?.timezone)} ·{' '}
                  {booking.staff?.name || 'Profesional asignado'} · {money(booking.totalAmount)}
                  <br />
                  Código: {booking.code}
                </p>
              </div>
              <div className="button-row">
                {!offline &&
                  booking.canManage !== false &&
                  ['CONFIRMED', 'PENDING'].includes(booking.status) && (
                    <>
                      <button
                        className="button secondary small"
                        onClick={() => setRescheduling(booking)}
                      >
                        Cambiar horario
                      </button>
                      <button className="button danger small" onClick={() => void cancel(booking)}>
                        Cancelar cita
                      </button>
                      {booking.status === 'PENDING' && Number(booking.depositAmount) > 0 && (
                        <button className="button small" onClick={() => setPaying(booking)}>
                          Registrar anticipo
                        </button>
                      )}
                    </>
                  )}
                {booking.status === 'COMPLETED' && (
                  <button className="button secondary small" onClick={() => setReviewing(booking)}>
                    Escribir reseña
                  </button>
                )}
                <a
                  className="text-link"
                  href={`/?services=${
                    booking.items
                      ?.map((item) => item.serviceId)
                      .filter(Boolean)
                      .join(',') || ''
                  }#reservar`}
                >
                  Reservar de nuevo
                </a>
              </div>
            </article>
          ))}
          {cursor && (
            <button className="button secondary" onClick={() => void load(true)}>
              Ver más citas
            </button>
          )}
        </>
      )}
      {rescheduling && (
        <Reschedule
          booking={rescheduling}
          onClose={() => setRescheduling(null)}
          onSaved={() => void load()}
        />
      )}{' '}
      {paying && (
        <div className="dialog-backdrop">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Registrar anticipo"
          >
            <PaymentForm bookingId={paying.id} amount={Number(paying.depositAmount)} />
            <button className="button secondary" onClick={() => setPaying(null)}>
              Cerrar
            </button>
          </section>
        </div>
      )}{' '}
      {reviewing && (
        <ReviewDialog
          booking={reviewing}
          onClose={() => setReviewing(null)}
          onSaved={() => setMessage('Gracias por compartir tu experiencia.')}
        />
      )}
      {tab === 'espera' && <Waitlist />}
      {tab === 'avisos' && <Notifications />}
      {tab === 'perfil' && profile && (
        <div className="narrow">
          <form
            className="form-grid"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              try {
                const value = await api.request<Profile>('/users/me', {
                  method: 'PATCH',
                  headers: { 'If-Match': String(profile.version) },
                  body: {
                    name: form.get('name'),
                    phone: form.get('phone'),
                    notificationPreferences: {
                      email: form.get('email') === 'on',
                      push: form.get('push') === 'on',
                    },
                  },
                });
                setProfile(value);
                setMessage('Perfil actualizado.');
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            <label>
              Nombre
              <input name="name" defaultValue={profile.name} required />
            </label>
            <label>
              WhatsApp
              <input
                name="phone"
                defaultValue={profile.phone || '+591'}
                pattern="\+591[67][0-9]{7}"
                required
              />
            </label>
            <label className="checkbox-label">
              <input
                name="email"
                type="checkbox"
                defaultChecked={profile.notificationPreferences?.email !== false}
              />{' '}
              Recibir correos de citas
            </label>
            <label className="checkbox-label">
              <input
                name="push"
                type="checkbox"
                defaultChecked={profile.notificationPreferences?.push !== false}
              />{' '}
              Preferir notificaciones push
            </label>
            <div>
              <button className="button">Guardar perfil</button>
            </div>
          </form>
          {!profile.emailVerifiedAt && (
            <p className="notice">
              Tu correo todavía no está verificado.{' '}
              <button
                className="text-link"
                onClick={async () => {
                  try {
                    await api.request('/auth/resend-verification', {
                      method: 'POST',
                      body: { email: user.email },
                    });
                    setMessage('Enviamos instrucciones de verificación.');
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              >
                Reenviar verificación
              </button>
            </p>
          )}
          <div className="button-row" style={{ marginTop: 35 }}>
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  const data = await api.request('/users/me/export');
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
                  );
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'mis-datos.json';
                  link.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              Exportar mis datos
            </button>
            <button className="button danger" onClick={() => setDeleting(true)}>
              Eliminar mi cuenta
            </button>
          </div>
        </div>
      )}
      {deleting && <DeleteAccount onClose={() => setDeleting(false)} />}
      {tab === 'sesiones' && (
        <>
          <h2>Dispositivos con acceso</h2>
          {sessions.map((session) => (
            <article className="appointment" key={session.id}>
              <ShieldCheck size={24} />
              <div className="appointment-body">
                <h3>{session.userAgent || 'Dispositivo'}</h3>
                <p>
                  Inicio: {dateLabel(session.createdAt)} · IP: {session.ip}
                </p>
              </div>
              <button
                className="button danger small"
                onClick={async () => {
                  await api.request(`/auth/sessions/${session.id}`, { method: 'DELETE' });
                  await load();
                }}
              >
                Cerrar sesión
              </button>
            </article>
          ))}
          <button
            className="button danger"
            style={{ marginTop: 20 }}
            onClick={async () => {
              try {
                await api.request('/auth/sessions', { method: 'DELETE' });
                await logout();
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            Cerrar todas las sesiones
          </button>
          {['ADMIN', 'OWNER'].includes(user.role) && (
            <section className="resource-editor">
              <h3>Autenticación en dos pasos</h3>
              <p>Protege el panel con un código de tu aplicación autenticadora.</p>
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    setTotp(await api.request('/auth/totp/setup', { method: 'POST', body: {} }));
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              >
                Configurar autenticador
              </button>
              {totp && (
                <>
                  <p>
                    Agrega esta clave a tu autenticador: <code>{totp.secret}</code>
                  </p>
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      try {
                        await api.request('/auth/totp/confirm', {
                          method: 'POST',
                          body: { code: new FormData(event.currentTarget).get('code') },
                        });
                        setTotp(null);
                        setMessage('Verificación en dos pasos activada.');
                      } catch (e) {
                        setError(errorMessage(e));
                      }
                    }}
                  >
                    <label>
                      Código de 6 dígitos
                      <input name="code" pattern="[0-9]{6}" inputMode="numeric" required />
                    </label>
                    <button className="button">Activar</button>
                  </form>
                </>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
