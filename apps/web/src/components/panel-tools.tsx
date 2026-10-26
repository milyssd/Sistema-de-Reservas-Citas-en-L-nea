'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { DateTime } from 'luxon';
import { api, API_URL, authHeaders } from '@/lib/api';
import { type Catalog, money, dateLabel, errorMessage } from '@/lib/types';
import { useAuth } from './providers';
type Row = { id: string; version: number; [key: string]: unknown };
async function download(path: string, filename: string) {
  const result = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!result.ok) throw new Error('No se pudo descargar el archivo.');
  const url = URL.createObjectURL(await result.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
type Report = {
  totalBookings: number;
  revenue: number;
  cancellationRate: number;
  noShowRate: number;
  byStaff: {
    staffId: string;
    bookings: number;
    occupiedMinutes: number;
    occupancyRate: number | null;
  }[];
  byService: {
    serviceName: string;
    _count: { _all: number };
    _sum: { price: string; durationMinutes: number };
  }[];
  peakHours: Record<string, number>;
};
export function Reports({ catalog }: { catalog: Catalog | null }) {
  const [from, setFrom] = useState(
    DateTime.now().setZone('America/La_Paz').startOf('month').toISODate()!,
  );
  const [to, setTo] = useState(DateTime.now().setZone('America/La_Paz').toISODate()!);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const query = () =>
    new URLSearchParams({
      from: DateTime.fromISO(from, { zone: 'America/La_Paz' }).startOf('day').toUTC().toISO()!,
      to: DateTime.fromISO(to, { zone: 'America/La_Paz' }).endOf('day').toUTC().toISO()!,
    });
  async function load() {
    try {
      setReport(await api.request(`/reports?${query()}`));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section>
      <h2>Una mirada a tu negocio</h2>
      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label>
          Desde
          <input type="date" value={from} required onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={to} required onChange={(e) => setTo(e.target.value)} />
        </label>
        <button className="button">Consultar</button>
        <button
          className="button secondary"
          type="button"
          onClick={() =>
            download(`/reports.csv?${query()}`, 'reporte.csv').catch((e) =>
              setError(errorMessage(e)),
            )
          }
        >
          Exportar CSV
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {report && (
        <>
          <div className="metrics">
            <div className="metric">
              <strong>{report.totalBookings}</strong>
              <span>Reservas</span>
            </div>
            <div className="metric">
              <strong>{money(report.revenue)}</strong>
              <span>Ingresos netos registrados</span>
            </div>
            <div className="metric">
              <strong>{(report.cancellationRate * 100).toFixed(1)}%</strong>
              <span>Cancelaciones</span>
            </div>
            <div className="metric">
              <strong>{(report.noShowRate * 100).toFixed(1)}%</strong>
              <span>No asistencias</span>
            </div>
          </div>
          <h3>Actividad del equipo</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Profesional</th>
                  <th>Citas</th>
                  <th>Horas ocupadas</th>
                  <th>Ocupación</th>
                </tr>
              </thead>
              <tbody>
                {report.byStaff.map((item) => (
                  <tr key={item.staffId}>
                    <td>
                      {catalog?.staff.find((staff) => staff.id === item.staffId)?.name ||
                        item.staffId}
                    </td>
                    <td>{item.bookings}</td>
                    <td>{(item.occupiedMinutes / 60).toFixed(1)}</td>
                    <td>
                      {item.occupancyRate == null
                        ? 'Sin horario'
                        : `${(item.occupancyRate * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 style={{ marginTop: 30 }}>Servicios más reservados</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Reservas</th>
                <th>Valor de servicios</th>
              </tr>
            </thead>
            <tbody>
              {report.byService.map((item) => (
                <tr key={item.serviceName}>
                  <td>{item.serviceName}</td>
                  <td>{item._count._all}</td>
                  <td>{money(item._sum.price || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 style={{ marginTop: 30 }}>Horas de mayor demanda</h3>
          <div className="button-row">
            {Object.entries(report.peakHours)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([hour, count]) => (
                <span className="badge" key={hour}>
                  {hour}:00 UTC · {count} citas
                </span>
              ))}
          </div>
        </>
      )}
    </section>
  );
}
export function Settings() {
  const [business, setBusiness] = useState<Row | null>(null);
  const [settings, setSettings] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function load() {
    try {
      setBusiness(await api.request('/admin/business'));
      setSettings((await api.request<{ items: Row[] }>('/admin/settings')).items);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const numbers = [
    ['minimumNoticeMinutes', 'Antelación mínima (minutos)'],
    ['maximumAdvanceDays', 'Anticipación máxima (días)'],
    ['slotIntervalMinutes', 'Intervalo de turnos (minutos)'],
    ['cancellationHours', 'Plazo de cancelación (horas)'],
    ['maxPendingBookings', 'Reservas pendientes por cliente'],
    ['maxNoShows', 'No asistencias antes del bloqueo'],
  ];
  async function setting(key: string, value: unknown) {
    const existing = settings.find((item) => item.key === key);
    await api.request(`/admin/settings${existing ? `/${existing.id}` : ''}`, {
      method: existing ? 'PATCH' : 'POST',
      headers: existing ? { 'If-Match': String(existing.version) } : undefined,
      body: { key, value },
    });
    await load();
    setMessage('Configuración guardada.');
  }
  return (
    <section>
      <h2>Políticas e identidad</h2>
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
      {business && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const body: Record<string, unknown> = {
              name: data.get('name'),
              description: data.get('description'),
              brandColor: data.get('brandColor'),
              logoUrl: data.get('logoUrl') || null,
              autoConfirm: data.get('autoConfirm') === 'on',
              maintenanceMode: data.get('maintenanceMode') === 'on',
              featureFlags: { multiStaffBookings: data.get('multiStaffBookings') === 'on' },
            };
            numbers.forEach(([key]) => {
              body[key] = Number(data.get(key));
            });
            try {
              setBusiness(
                await api.request('/admin/business', {
                  method: 'PATCH',
                  headers: { 'If-Match': String(business.version) },
                  body,
                }),
              );
              setMessage('Políticas guardadas.');
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          <div className="form-grid">
            <label>
              Nombre del negocio
              <input name="name" defaultValue={String(business.name)} required />
            </label>
            <label>
              Color de marca
              <input
                name="brandColor"
                type="color"
                defaultValue={String(business.brandColor || '#146c94')}
              />
            </label>
            <label className="full">
              Descripción
              <textarea name="description" defaultValue={String(business.description || '')} />
            </label>
            <label className="full">
              URL del logo
              <input name="logoUrl" type="url" defaultValue={String(business.logoUrl || '')} />
            </label>
            {numbers.map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min="0"
                  name={key}
                  defaultValue={Number(business[key])}
                  required
                />
              </label>
            ))}
            <label className="checkbox-label">
              <input
                name="autoConfirm"
                type="checkbox"
                defaultChecked={Boolean(business.autoConfirm)}
              />{' '}
              Confirmar automáticamente sin anticipo
            </label>
            <label className="checkbox-label">
              <input
                name="multiStaffBookings"
                type="checkbox"
                defaultChecked={Boolean(
                  (business.featureFlags as { multiStaffBookings?: boolean } | undefined)
                    ?.multiStaffBookings,
                )}
              />
              Permitir profesionales distintos en una cita
            </label>
            <label className="checkbox-label">
              <input
                name="maintenanceMode"
                type="checkbox"
                defaultChecked={Boolean(business.maintenanceMode)}
              />{' '}
              Modo mantenimiento
            </label>
          </div>
          <button className="button" style={{ marginTop: 20 }}>
            Guardar políticas
          </button>
        </form>
      )}
      <section className="resource-editor">
        <h3>Instrucciones de pago</h3>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            try {
              await setting('payment.instructions', {
                bank: data.get('bank'),
                accountNumber: data.get('accountNumber'),
                beneficiary: data.get('beneficiary'),
                qrUrl: data.get('qrUrl'),
                instructions: data.get('instructions'),
              });
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          <div className="form-grid">
            {['bank', 'accountNumber', 'beneficiary', 'qrUrl', 'instructions'].map((key) => (
              <label key={key}>
                {
                  {
                    bank: 'Banco',
                    accountNumber: 'Número de cuenta',
                    beneficiary: 'Titular',
                    qrUrl: 'URL de la imagen QR',
                    instructions: 'Indicaciones',
                  }[key]
                }
                <input
                  name={key}
                  defaultValue={String(
                    (
                      settings.find((item) => item.key === 'payment.instructions')?.value as
                        Record<string, string> | undefined
                    )?.[key] || '',
                  )}
                />
              </label>
            ))}
          </div>
          <button className="button" style={{ marginTop: 18 }}>
            Guardar instrucciones
          </button>
        </form>
      </section>
      <section className="resource-editor">
        <h3>Plantillas de notificación</h3>
        <p className="muted">Variables: {'{cliente}, {servicio}, {fecha}, {hora}, {sede}'}</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            try {
              await setting(`notification.${data.get('event')}`, {
                subject: data.get('subject'),
                body: data.get('body'),
              });
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          <div className="form-grid">
            <label>
              Evento
              <select name="event">
                <option value="BOOKING_CREATED">Reserva creada</option>
                <option value="BOOKING_CONFIRMED">Reserva confirmada</option>
                <option value="BOOKING_RESCHEDULED">Reserva reprogramada</option>
                <option value="BOOKING_CANCELLED">Reserva cancelada</option>
                <option value="BOOKING_REMINDER">Recordatorio</option>
              </select>
            </label>
            <label>
              Asunto
              <input name="subject" required />
            </label>
            <label className="full">
              Mensaje
              <textarea name="body" rows={4} required />
            </label>
          </div>
          <button className="button" style={{ marginTop: 18 }}>
            Guardar plantilla
          </button>
        </form>
      </section>
    </section>
  );
}
export function Audit() {
  const [items, setItems] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function load(append = false) {
    try {
      const result = await api.request<{ items: Row[]; nextCursor: string | null }>(
        `/audit${append && cursor ? `?cursor=${cursor}` : ''}`,
      );
      setItems((old) => (append ? [...old, ...result.items] : result.items));
      setCursor(result.nextCursor);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section>
      <h2>Registro de acciones</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Usuario</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{dateLabel(String(item.createdAt))}</td>
                <td>{String(item.action)}</td>
                <td>{String(item.entityType)}</td>
                <td>{String(item.userId || 'Sistema')}</td>
                <td>{String(item.ip || '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cursor && (
        <button className="button secondary" onClick={() => void load(true)}>
          Cargar más acciones
        </button>
      )}
    </section>
  );
}
export function Users() {
  const { user } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function load(append = false) {
    try {
      const result = await api.request<{ items: Row[]; nextCursor: string | null }>(
        `/users${append && cursor ? `?cursor=${cursor}` : ''}`,
      );
      setItems((old) => (append ? [...old, ...result.items] : result.items));
      setCursor(result.nextCursor);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section>
      <h2>Usuarios y permisos</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <table className="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{String(item.name)}</td>
              <td>{String(item.email)}</td>
              <td>
                {user?.role === 'OWNER' && !['OWNER', 'SUPERADMIN'].includes(String(item.role)) ? (
                  <select
                    aria-label={`Rol de ${item.name}`}
                    value={String(item.role)}
                    onChange={async (event) => {
                      try {
                        await api.request(`/users/${item.id}/role`, {
                          method: 'PATCH',
                          headers: { 'If-Match': String(item.version) },
                          body: { role: event.target.value },
                        });
                        await load();
                      } catch (e) {
                        setError(errorMessage(e));
                      }
                    }}
                  >
                    <option value="CLIENT">Cliente</option>
                    <option value="STAFF">Personal</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                ) : (
                  String(item.role)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {cursor && (
        <button className="button secondary" onClick={() => void load(true)}>
          Cargar más usuarios
        </button>
      )}
    </section>
  );
}
export function Payments() {
  const [items, setItems] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function load(append = false) {
    try {
      const result = await api.request<{ items: Row[]; nextCursor: string | null }>(
        `/payments${append && cursor ? `?cursor=${cursor}` : ''}`,
      );
      setItems((old) => (append ? [...old, ...result.items] : result.items));
      setCursor(result.nextCursor);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const [review, setReview] = useState<{ item: Row; operation: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refunds, setRefunds] = useState<
    { id: string; amount: string; reason: string; createdAt: string }[] | null
  >(null);
  function action(item: Row, operation: string) {
    setError('');
    setReview({ item, operation, key: crypto.randomUUID() });
  }
  async function reviewPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review) return;
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const { item, operation, key } = review;
    try {
      await api.request(`/payments/${item.id}/${operation}`, {
        method: 'PATCH',
        headers: {
          'If-Match': String(item.version),
          ...(operation === 'refund' ? { 'Idempotency-Key': key } : {}),
        },
        body:
          operation === 'confirm'
            ? {}
            : {
                reason: data.get('reason'),
                ...(operation === 'refund' ? { amount: Number(data.get('amount')) } : {}),
              },
      });
      setReview(null);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Pagos y anticipos</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Reserva</th>
              <th>Método</th>
              <th>Importe</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} data-testid={`payment-${item.id}`}>
                <td>
                  {String((item.booking as { code?: string } | undefined)?.code || item.bookingId)}
                </td>
                <td>{String(item.method)}</td>
                <td>
                  {money(String(item.amount))}
                  {Number(item.refundedAmount || 0) > 0 && (
                    <small style={{ display: 'block' }}>
                      Devuelto: {money(String(item.refundedAmount))}
                    </small>
                  )}
                </td>
                <td>{String(item.status)}</td>
                <td>
                  <div className="button-row">
                    {Boolean(item.receiptAvailable) && (
                      <button
                        className="text-link"
                        onClick={() =>
                          download(`/payments/${item.id}/receipt`, 'comprobante.webp').catch((e) =>
                            setError(errorMessage(e)),
                          )
                        }
                      >
                        Comprobante
                      </button>
                    )}
                    {['PENDING', 'SUBMITTED'].includes(String(item.status)) && (
                      <>
                        <button
                          className="button small"
                          onClick={() => void action(item, 'confirm')}
                        >
                          Confirmar pago
                        </button>
                        <button className="text-link" onClick={() => void action(item, 'reject')}>
                          Rechazar
                        </button>
                      </>
                    )}
                    {item.status === 'CONFIRMED' &&
                      Number(item.remainingRefundable ?? item.amount) > 0 && (
                        <>
                          <button className="text-link" onClick={() => void action(item, 'refund')}>
                            Reembolsar
                          </button>
                          <button className="text-link" onClick={() => void action(item, 'retain')}>
                            Retener anticipo
                          </button>
                        </>
                      )}
                    {Number(item.refundedAmount || 0) > 0 && (
                      <button
                        className="text-link"
                        onClick={async () => {
                          try {
                            const result = await api.request<{
                              items: {
                                id: string;
                                amount: string;
                                reason: string;
                                createdAt: string;
                              }[];
                            }>(`/payments/${item.id}/refunds`);
                            setRefunds(result.items);
                          } catch (e) {
                            setError(errorMessage(e));
                          }
                        }}
                      >
                        Ver devoluciones
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {review && (
        <div className="dialog-backdrop">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-review-title"
          >
            <h3 id="payment-review-title">
              {
                {
                  confirm: 'Confirmar pago',
                  reject: 'Rechazar comprobante',
                  refund: 'Registrar devolución',
                  retain: 'Retener anticipo',
                }[review.operation]
              }
            </h3>
            <p>
              Pago original: {money(String(review.item.amount))}. Disponible para devolver:{' '}
              {money(Number(review.item.remainingRefundable ?? review.item.amount))}.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <form onSubmit={reviewPayment}>
              {review.operation === 'refund' && (
                <label>
                  Monto de la devolución (Bs)
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={Number(review.item.remainingRefundable ?? review.item.amount)}
                    defaultValue={Number(review.item.remainingRefundable ?? review.item.amount)}
                    required
                  />
                </label>
              )}
              {review.operation !== 'confirm' && (
                <label>
                  Motivo
                  <textarea name="reason" minLength={5} maxLength={500} rows={3} required />
                </label>
              )}
              <div className="button-row">
                <button className="button" disabled={busy}>
                  Guardar operación
                </button>
                <button className="button secondary" type="button" onClick={() => setReview(null)}>
                  Cerrar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {refunds && (
        <div className="dialog-backdrop">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Historial de devoluciones"
          >
            <h3>Devoluciones registradas</h3>
            {refunds.map((item) => (
              <article key={item.id}>
                <strong>
                  {money(item.amount)} · {dateLabel(item.createdAt)}
                </strong>
                <p>{item.reason}</p>
              </article>
            ))}
            <button className="button secondary" onClick={() => setRefunds(null)}>
              Cerrar
            </button>
          </section>
        </div>
      )}
      {cursor && (
        <button className="button secondary" onClick={() => void load(true)}>
          Cargar más pagos
        </button>
      )}
    </section>
  );
}
