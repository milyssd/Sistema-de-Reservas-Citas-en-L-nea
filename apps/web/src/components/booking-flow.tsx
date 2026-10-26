'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { DateTime } from 'luxon';
import {
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  ShieldCheck,
  CalendarDays,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import {
  type Catalog,
  type Slot,
  type Booking,
  money,
  timeLabel,
  dateLabel,
  errorMessage,
} from '@/lib/types';
import { useAuth } from './providers';
import { useEvents } from '@/lib/use-events';
import { guestRequest } from '@/lib/guest-request';
export function BookingFlow({ initialCatalog }: { initialCatalog: Catalog | null }) {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState(initialCatalog);
  const [selected, setSelected] = useState<string[]>([]);
  const [locationId, setLocation] = useState(initialCatalog?.locations[0]?.id || '');
  const [staffId, setStaff] = useState('');
  const [mixedStaff, setMixedStaff] = useState(false);
  const [staffByService, setStaffByService] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState(false);
  const [date, setDate] = useState(
    DateTime.now().setZone('America/La_Paz').plus({ days: 1 }).toISODate()!,
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [hold, setHold] = useState<{ holdToken: string; expiresAt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [reload, setReload] = useState(0);
  const key = useRef(crypto.randomUUID());
  const [guest, setGuest] = useState({ name: '', email: '', phone: '+591', notes: '' });
  const location = catalog?.locations.find((item) => item.id === locationId);
  const zone = location?.timezone || 'America/La_Paz';
  const services = useMemo(
    () =>
      selected.flatMap((id) => {
        const service = catalog?.services.find((item) => item.id === id);
        return service ? [service] : [];
      }),
    [catalog, selected],
  );
  const total = services.reduce((sum, item) => sum + Number(item.price), 0);
  const duration = services.reduce((sum, item) => sum + item.durationMinutes, 0);
  const multiStaff = Boolean(
    mixedStaff && selected.length > 1 && catalog?.business.featureFlags?.multiStaffBookings,
  );
  const selectedStaffIds = useMemo(
    () => selected.map((id) => staffByService[id] || null),
    [selected, staffByService],
  );
  useEffect(() => {
    const services = new URLSearchParams(window.location.search).get('services');
    if (services)
      setSelected(services.split(',').filter((value) => /^[0-9a-f-]{36}$/i.test(value)));
  }, []);
  useEffect(() => {
    if (user) setGuest((old) => ({ ...old, name: user.name, email: user.email }));
  }, [user]);
  useEffect(() => {
    if (!catalog) {
      setLoading(true);
      api
        .request<Catalog>('/catalog')
        .then((value) => {
          setCatalog(value);
          setLocation(value.locations[0]?.id || '');
          setError('');
        })
        .catch((e) => setError(errorMessage(e)))
        .finally(() => setLoading(false));
    }
  }, [catalog, reload]);
  useEffect(() => {
    setSlot(null);
    setHold(null);
    key.current = crypto.randomUUID();
    setSlots([]);
    if (!selected.length || !locationId) return;
    const controller = new AbortController();
    setLoading(true);
    const day = DateTime.fromISO(date, { zone });
    const query = new URLSearchParams({
      serviceIds: selected.join(','),
      locationId,
      from: day.startOf('day').toUTC().toISO()!,
      to: day.endOf('day').toUTC().toISO()!,
    });
    if (multiStaff) query.set('staffIds', selectedStaffIds.map((id) => id || 'any').join(','));
    else if (staffId) query.set('staffId', staffId);
    api
      .request<{ data: Slot[]; timezone: string }>(`/availability?${query}`, {
        signal: controller.signal,
      })
      .then((result) => setSlots(result.data))
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selected, locationId, staffId, date, zone, reload, multiStaff, selectedStaffIds]);
  async function chooseSlot(value: Slot) {
    setBusy(true);
    setError('');
    try {
      const result = await guestRequest<{ holdToken: string; expiresAt: string }>(
        '/bookings/holds',
        {
          method: 'POST',
          body: {
            serviceIds: selected,
            locationId,
            ...(multiStaff
              ? { staffIds: value.staffIds || selectedStaffIds }
              : { staffId: value.staffId }),
            startAt: value.startAt,
          },
        },
        setVerifying,
      );
      setSlot(value);
      setHold(result);
      key.current = crypto.randomUUID();
    } catch (e) {
      setError(errorMessage(e));
      setReload((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }
  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!slot || !hold) return;
    setBusy(true);
    setError('');
    try {
      const result = await guestRequest<Booking>(
        '/bookings',
        {
          method: 'POST',
          headers: { 'Idempotency-Key': key.current },
          body: {
            serviceIds: selected,
            ...(multiStaff
              ? { staffIds: slot.staffIds || selectedStaffIds }
              : { staffId: slot.staffId }),
            locationId,
            startAt: slot.startAt,
            customer: { name: guest.name, email: guest.email, phone: guest.phone },
            ...(guest.notes ? { notes: guest.notes } : {}),
            source: 'WEB',
            holdToken: hold.holdToken,
          },
        },
        setVerifying,
      );
      setBooking(result);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  useEvents(
    '/availability/events',
    () => {
      if (!hold) setReload((value) => value + 1);
    },
    Boolean(catalog && selected.length),
  );
  const uniqueSlots = slots.filter(
    (item, index, all) =>
      staffId || all.findIndex((other) => other.startAt === item.startAt) === index,
  );
  const brandStyle =
    catalog?.business.brandColor && /^#[\da-f]{6}$/i.test(catalog.business.brandColor)
      ? ({ '--lake': catalog.business.brandColor } as CSSProperties)
      : undefined;
  if (booking)
    return (
      <section className="confirmation page-wrap">
        <span className="confirmation-icon">
          <Check size={36} />
        </span>
        <p className="eyebrow">Tu próximo momento</p>
        <h1>
          {booking.status === 'CONFIRMED' ? 'Tu cita está confirmada.' : 'Recibimos tu reserva.'}
        </h1>
        <p>
          {booking.status === 'PENDING'
            ? 'La reserva está pendiente de anticipo o aprobación del negocio.'
            : 'Ya hay un espacio en la agenda para ti.'}
        </p>
        <div className="ticket">
          <span>CÓDIGO DE RESERVA</span>
          <strong>{booking.code}</strong>
          <p>{services.map((item) => item.name).join(' + ')}</p>
          <p>
            {dateLabel(booking.startAt, zone)} · {timeLabel(booking.startAt, zone)}
          </p>
          <p>
            {location?.name} · {money(booking.totalAmount)}
          </p>
        </div>
        {Number(booking.depositAmount) > 0 && (
          <p className="notice">
            Anticipo requerido: {money(booking.depositAmount)}. Contacta al negocio o ingresa a tu
            cuenta para registrar el pago.
          </p>
        )}
        <div className="button-row">
          {booking.manageToken && (
            <>
              <a className="button" href={`/reserva/${booking.manageToken}`}>
                Gestionar mi cita <ArrowRight size={16} />
              </a>
              <a
                className="button secondary"
                href={`${API_URL}/bookings/manage/${booking.manageToken}/calendar.ics`}
              >
                Agregar al calendario
              </a>
            </>
          )}
          <button
            className="button secondary"
            onClick={() => {
              setBooking(null);
              setSlot(null);
              setHold(null);
              setReload((n) => n + 1);
            }}
          >
            Reservar otra cita
          </button>
        </div>
        <p className="muted">
          Guarda el enlace de gestión: es personal y permite cambiar o cancelar esta cita.
        </p>
      </section>
    );
  return (
    <div style={brandStyle}>
      <section className="hero page-wrap">
        <div className="hero-copy">
          <p className="eyebrow">
            {catalog?.business.logoUrl ? (
              <img src={catalog.business.logoUrl} alt="Logo del negocio" width={36} height={36} />
            ) : (
              <span className="tiny-line" />
            )}{' '}
            {catalog?.business.name || 'Agenda abierta'} · Bolivia
          </p>
          <h1>
            Un espacio para ti.
            <br />
            <span>En el momento justo.</span>
          </h1>
          <p className="hero-description">
            {catalog?.business.description ||
              'Elige cómo quieres cuidarte. Encuentra tu horario y deja el resto en nuestras manos.'}
          </p>
          <a href="#reservar" className="text-link">
            Encuentra tu próximo horario <ArrowRight size={18} />
          </a>
        </div>
        <div className="hero-ledger" aria-hidden="true">
          <div className="ledger-top">
            <span>TU DÍA, CON CALMA</span>
            <CalendarDays size={20} />
          </div>
          <div className="ledger-line">
            <span>09:00</span>
            <i />
          </div>
          <div className="ledger-highlight">
            <span>10:30</span>
            <div>
              Este momento es tuyo.<small>Reserva. Llega. Disfruta.</small>
            </div>
            <Check size={20} />
          </div>
          <div className="ledger-line">
            <span>12:00</span>
            <i />
          </div>
          <div className="ledger-bottom">
            Menos vueltas. Más tiempo para ti. <ArrowUpRight size={18} />
          </div>
        </div>
      </section>
      <div className="trust-bar">
        <div className="page-wrap">
          <span>
            <ShieldCheck size={17} /> Confirmación segura
          </span>
          <span>
            <Clock3 size={17} /> Horarios en tiempo real
          </span>
          <span>
            <MapPin size={17} /> Precios en bolivianos
          </span>
        </div>
      </div>
      <section id="reservar" className="page-wrap booking-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Hagamos espacio en tu día</p>
            <h2>Reserva tu cita</h2>
          </div>
          <span className="section-number">01 — 03</span>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
            <button
              className="text-link"
              onClick={() => {
                setError('');
                setReload((n) => n + 1);
              }}
            >
              Volver a intentar <RefreshCw size={15} />
            </button>
          </div>
        )}
        {!catalog ? (
          <p role="status">
            {loading ? 'Cargando servicios…' : 'El catálogo no está disponible en este momento.'}
          </p>
        ) : (
          <div className="booking-grid">
            <div className="booking-main">
              <section className="booking-step">
                <div className="step-heading">
                  <span>01</span>
                  <h3>¿Qué necesitas hoy?</h3>
                </div>
                <p className="muted">Puedes combinar varios servicios en una misma cita.</p>
                <div className="service-list">
                  {catalog.services
                    .filter((item) => item.active && item.onlineBookable)
                    .map((service, index) => (
                      <button
                        type="button"
                        key={service.id}
                        aria-pressed={selected.includes(service.id)}
                        className={`service-option ${selected.includes(service.id) ? 'selected' : ''}`}
                        onClick={() =>
                          setSelected((old) =>
                            old.includes(service.id)
                              ? old.filter((id) => id !== service.id)
                              : [...old, service.id],
                          )
                        }
                      >
                        <span className="service-index">{String(index + 1).padStart(2, '0')}</span>
                        <span className="service-info">
                          <strong>{service.name}</strong>
                          <small>{service.description}</small>
                          <span>
                            <Clock3 size={13} />
                            {service.durationMinutes} min
                            {service.capacity > 1 ? ` · ${service.capacity} cupos` : ''}
                          </span>
                        </span>
                        <span className="service-price">
                          {money(service.price)}
                          <span className="selection-mark">
                            {selected.includes(service.id) ? <Check size={16} /> : '+'}
                          </span>
                        </span>
                      </button>
                    ))}
                </div>
              </section>
              <section className="booking-step">
                <div className="step-heading">
                  <span>02</span>
                  <h3>Encuentra tu momento</h3>
                </div>
                <div className="form-grid">
                  <label>
                    Sede
                    <select
                      value={locationId}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setStaff('');
                        setStaffByService({});
                      }}
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
                    <select
                      value={staffId}
                      disabled={multiStaff}
                      onChange={(e) => setStaff(e.target.value)}
                    >
                      <option value="">Cualquier profesional disponible</option>
                      {catalog.staff
                        .filter((item) => item.locationId === locationId)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  {selected.length > 1 && catalog.business.featureFlags?.multiStaffBookings && (
                    <div className="full">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={mixedStaff}
                          onChange={(event) => setMixedStaff(event.target.checked)}
                        />
                        Elegir profesional para cada servicio
                      </label>
                      {multiStaff && (
                        <div className="form-grid">
                          {selected.map((serviceId) => {
                            const service = catalog.services.find((item) => item.id === serviceId);
                            return (
                              <label key={serviceId}>
                                {service?.name}
                                <select
                                  aria-label={`Profesional para ${service?.name}`}
                                  value={staffByService[serviceId] || ''}
                                  onChange={(event) =>
                                    setStaffByService((old) => ({
                                      ...old,
                                      [serviceId]: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Cualquier profesional disponible</option>
                                  {catalog.staff
                                    .filter(
                                      (item) =>
                                        item.locationId === locationId &&
                                        (!item.staffServices ||
                                          item.staffServices.some(
                                            (link) => link.serviceId === serviceId,
                                          )),
                                    )
                                    .map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.name}
                                      </option>
                                    ))}
                                </select>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  <label>
                    Fecha
                    <input
                      type="date"
                      value={date}
                      min={DateTime.now().setZone(zone).toISODate()!}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  <div className="location-note">
                    <MapPin size={18} />
                    <span>
                      {location?.address}
                      <small>Hora local: {zone}</small>
                    </span>
                  </div>
                </div>
                {selected.length === 0 ? (
                  <p className="empty-state">
                    Elige un servicio para consultar los horarios disponibles.
                  </p>
                ) : loading ? (
                  <p role="status" className="empty-state">
                    Buscando tu espacio en la agenda…
                  </p>
                ) : uniqueSlots.length === 0 ? (
                  <div className="empty-state">
                    <p>
                      No quedan horarios para esta combinación. Prueba otra fecha o profesional.
                    </p>
                    {user && (
                      <button
                        className="button secondary"
                        onClick={async () => {
                          try {
                            await api.request('/waitlist', {
                              method: 'POST',
                              body: {
                                serviceId: selected[0],
                                locationId,
                                from: DateTime.fromISO(date, { zone })
                                  .startOf('day')
                                  .toUTC()
                                  .toISO(),
                                to: DateTime.fromISO(date, { zone }).endOf('day').toUTC().toISO(),
                              },
                            });
                            setError('Te agregamos a la lista de espera.');
                          } catch (e) {
                            setError(errorMessage(e));
                          }
                        }}
                      >
                        Avisarme si se libera un espacio
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="slots" aria-label="Horarios disponibles">
                    {uniqueSlots.map((item) => (
                      <button
                        disabled={busy}
                        aria-pressed={slot?.startAt === item.startAt}
                        className={slot?.startAt === item.startAt ? 'active' : ''}
                        key={`${item.staffId}-${item.startAt}`}
                        onClick={() => void chooseSlot(item)}
                      >
                        {timeLabel(item.startAt, zone)}
                        {item.remainingCapacity > 1 && (
                          <small>{item.remainingCapacity} cupos</small>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>
              <section className="booking-step">
                <div className="step-heading">
                  <span>03</span>
                  <h3>Nos vemos pronto</h3>
                </div>
                <form id="booking-form" onSubmit={confirm}>
                  <div className="form-grid">
                    <label>
                      Nombre completo
                      <input
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={100}
                        value={guest.name}
                        onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                      />
                    </label>
                    <label>
                      WhatsApp
                      <input
                        type="tel"
                        autoComplete="tel"
                        required
                        pattern="\+591[67][0-9]{7}"
                        title="Número boliviano: +591 seguido de 8 dígitos, empezando en 6 o 7"
                        value={guest.phone}
                        onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                      />
                    </label>
                    <label className="full">
                      Correo electrónico
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={guest.email}
                        onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                      />
                    </label>
                    <label className="full">
                      ¿Algo que debamos saber? <span className="muted">(opcional)</span>
                      <textarea
                        maxLength={1000}
                        rows={2}
                        value={guest.notes}
                        onChange={(e) => setGuest({ ...guest, notes: e.target.value })}
                      />
                    </label>
                  </div>
                  <p className="fine-print">
                    Al reservar aceptas la <a href="/privacidad">política de privacidad</a> y las
                    condiciones de cancelación del negocio. No necesitas crear una cuenta.
                  </p>
                </form>
              </section>
            </div>
            <aside className="booking-summary">
              <div className="summary-head">
                <span>TU PRÓXIMA CITA</span>
                <CalendarDays size={22} />
              </div>
              <h3>{services.length ? 'Todo empieza aquí.' : 'Un momento para ti.'}</h3>
              {services.length ? (
                <ul>
                  {services.map((service) => (
                    <li key={service.id}>
                      <span>{service.name}</span>
                      <strong>{money(service.price)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Elige tus servicios y armamos tu reserva.</p>
              )}
              <div className="summary-details">
                <p>
                  <Clock3 size={17} />
                  {slot
                    ? `${Math.round((Date.parse(slot.endAt) - Date.parse(slot.startAt)) / 60000)} minutos`
                    : duration
                      ? `${duration} minutos estimados`
                      : 'Sin prisas, a tu ritmo'}
                </p>
                <p>
                  <MapPin size={17} />
                  {location?.name || 'Elige una sede'}
                </p>
                {slot?.segments && slot.segments.length > 1 && (
                  <ol className="segment-list">
                    {slot.segments.map((segment, index) => (
                      <li key={`${segment.serviceId}-${index}`}>
                        {timeLabel(segment.startAt, zone)} ·{' '}
                        {catalog.services.find((item) => item.id === segment.serviceId)?.name} —{' '}
                        {catalog.staff.find((item) => item.id === segment.staffId)?.name}
                      </li>
                    ))}
                  </ol>
                )}
                {slot && (
                  <p>
                    <CalendarDays size={17} />
                    {dateLabel(slot.startAt, zone)} · {timeLabel(slot.startAt, zone)}
                  </p>
                )}
              </div>
              <div className="summary-total">
                <span>{slot?.totalAmount !== undefined ? 'Total' : 'Total estimado'}</span>
                <strong>{money(slot?.totalAmount ?? total)}</strong>
              </div>
              <button
                className="button"
                form="booking-form"
                disabled={!slot || busy || loading}
                type="submit"
              >
                {verifying ? 'Verificando solicitud…' : busy ? 'Reservando…' : 'Confirmar cita'}{' '}
                <ArrowRight size={17} />
              </button>
              {hold && (
                <p className="fine-print">
                  Horario protegido hasta las {timeLabel(hold.expiresAt, zone)}. Completa tus datos
                  para confirmar.
                </p>
              )}
              <p className="summary-security">
                <ShieldCheck size={15} /> Tus datos están protegidos.
              </p>
            </aside>
          </div>
        )}
      </section>
      {catalog && (
        <section className="about-section page-wrap">
          <div>
            <p className="eyebrow">Personas que te acompañan</p>
            <h2>
              Un buen equipo.
              <br />
              Una mejor experiencia.
            </h2>
          </div>
          <div className="team-list">
            {catalog.staff.map((staff, index) => (
              <article key={staff.id}>
                <span className="staff-avatar">
                  {staff.photoUrl ? (
                    <img
                      src={staff.photoUrl}
                      alt={staff.name}
                      width={52}
                      height={52}
                      style={{ borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    staff.name
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')
                  )}
                </span>
                <div>
                  <h3>{staff.name}</h3>
                  <p>{staff.bio || 'Atención dedicada, a tu medida.'}</p>
                </div>
                <span className="muted">0{index + 1}</span>
              </article>
            ))}
          </div>
        </section>
      )}
      {catalog && (
        <section className="page-wrap locations-section">
          <p className="eyebrow">Cerca de ti</p>
          <h2>Encuéntranos</h2>
          <div className="form-grid">
            {catalog.locations.map((location) => (
              <article key={location.id}>
                <h3>{location.name}</h3>
                <p>
                  <MapPin size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
                  {location.address}
                </p>
                {location.mapUrl && (
                  <a className="text-link" href={location.mapUrl} target="_blank" rel="noreferrer">
                    Ver en el mapa <ArrowUpRight size={16} />
                  </a>
                )}
                <p className="fine-print">Hora local: {location.timezone}</p>
                {catalog.staff
                  .filter((staff) => staff.locationId === location.id)
                  .map((staff) => (
                    <details key={staff.id}>
                      <summary>Horarios de {staff.name}</summary>
                      <ul>
                        {staff.workingHours?.map((hours, index) => (
                          <li key={index}>
                            {
                              [
                                'Domingo',
                                'Lunes',
                                'Martes',
                                'Miércoles',
                                'Jueves',
                                'Viernes',
                                'Sábado',
                              ][hours.dayOfWeek]
                            }{' '}
                            · {String(Math.floor(hours.startMinute / 60)).padStart(2, '0')}:
                            {String(hours.startMinute % 60).padStart(2, '0')} —{' '}
                            {String(Math.floor(hours.endMinute / 60) % 24).padStart(2, '0')}:
                            {String(hours.endMinute % 60).padStart(2, '0')}
                            {hours.endMinute >= 1440 ? ' (+1 día)' : ''}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
              </article>
            ))}
          </div>
        </section>
      )}
      {catalog && catalog.reviews.length > 0 && (
        <section className="page-wrap reviews">
          <p className="eyebrow">Experiencias reales</p>
          <h2>Lo que dicen nuestros clientes</h2>
          {catalog.reviews.slice(0, 3).map((review) => (
            <blockquote key={review.id}>
              <p aria-label={`${review.rating} de 5 estrellas`}>{'★'.repeat(review.rating)}</p>
              <p>{review.comment}</p>
              <cite>{review.customer?.name || 'Cliente verificado'}</cite>
            </blockquote>
          ))}
        </section>
      )}
    </div>
  );
}
