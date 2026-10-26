'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { DateTime } from 'luxon';
import { api, API_URL } from '@/lib/api';
import {
  type Catalog,
  type Booking,
  dateLabel,
  money,
  statusLabels,
  errorMessage,
} from '@/lib/types';
type Row = { id: string; version: number; [key: string]: unknown };
type Field = {
  name: string;
  label: string;
  type?: 'number' | 'checkbox' | 'textarea' | 'datetime-local' | 'time' | 'tags';
  required?: boolean;
  value?: string | number | boolean;
  options?: { value: string; label: string }[];
};
const titles: Record<string, string> = {
  services: 'Servicios',
  staff: 'Equipo',
  locations: 'Sedes',
  categories: 'Categorías',
  'working-hours': 'Horarios de atención',
  'time-off': 'Bloqueos y feriados',
  'staff-services': 'Servicios por profesional',
  customers: 'Clientes',
};
export function ResourceManager({
  resource,
  catalog,
  onChange,
}: {
  resource: string;
  catalog: Catalog;
  onChange: () => unknown;
}) {
  const [items, setItems] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null | false>(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{
    customer: Row;
    items: Booking[];
    nextCursor: string | null;
  } | null>(null);
  const [feed, setFeed] = useState('');
  const zone = catalog.locations[0]?.timezone || 'America/La_Paz';
  const staffOptions = catalog.staff.map((item) => ({ value: item.id, label: item.name }));
  const locationOptions = catalog.locations.map((item) => ({ value: item.id, label: item.name }));
  const serviceOptions = catalog.services.map((item) => ({ value: item.id, label: item.name }));
  const fields: Record<string, Field[]> = {
    services: [
      { name: 'name', label: 'Nombre', required: true },
      { name: 'description', label: 'Descripción', type: 'textarea' },
      {
        name: 'categoryId',
        label: 'Categoría',
        options: [
          { value: '', label: 'Sin categoría' },
          ...categories.map((item) => ({ value: item.id, label: String(item.name) })),
        ],
      },
      {
        name: 'durationMinutes',
        label: 'Duración (minutos)',
        type: 'number',
        value: 30,
        required: true,
      },
      { name: 'price', label: 'Precio (Bs)', type: 'number', value: 0, required: true },
      { name: 'depositAmount', label: 'Anticipo fijo (Bs)', type: 'number', value: 0 },
      { name: 'depositPercent', label: 'Anticipo porcentual (opcional)', type: 'number' },
      {
        name: 'bufferBeforeMinutes',
        label: 'Preparación previa (minutos)',
        type: 'number',
        value: 0,
      },
      { name: 'bufferAfterMinutes', label: 'Tiempo posterior (minutos)', type: 'number', value: 0 },
      { name: 'capacity', label: 'Capacidad por turno', type: 'number', value: 1 },
      { name: 'active', label: 'Servicio activo', type: 'checkbox', value: true },
      { name: 'onlineBookable', label: 'Permitir reserva en línea', type: 'checkbox', value: true },
    ],
    staff: [
      { name: 'name', label: 'Nombre', required: true },
      { name: 'locationId', label: 'Sede', options: locationOptions, required: true },
      { name: 'bio', label: 'Biografía', type: 'textarea' },
      { name: 'photoUrl', label: 'URL de la fotografía' },
      { name: 'userId', label: 'ID de usuario vinculado (opcional)' },
      {
        name: 'isResource',
        label: 'Es un recurso: sala, cancha o equipo',
        type: 'checkbox',
        value: false,
      },
      { name: 'active', label: 'Profesional activo', type: 'checkbox', value: true },
    ],
    locations: [
      { name: 'name', label: 'Nombre', required: true },
      { name: 'address', label: 'Dirección', required: true },
      { name: 'timezone', label: 'Zona horaria', value: 'America/La_Paz', required: true },
      { name: 'phone', label: 'Celular de contacto' },
      { name: 'mapUrl', label: 'Enlace del mapa' },
      { name: 'active', label: 'Sede activa', type: 'checkbox', value: true },
    ],
    categories: [
      { name: 'name', label: 'Nombre', required: true },
      { name: 'sortOrder', label: 'Orden', type: 'number', value: 0 },
      { name: 'active', label: 'Categoría activa', type: 'checkbox', value: true },
    ],
    'staff-services': [
      { name: 'staffId', label: 'Profesional', options: staffOptions, required: true },
      { name: 'serviceId', label: 'Servicio', options: serviceOptions, required: true },
      { name: 'durationMinutes', label: 'Duración particular (opcional)', type: 'number' },
      { name: 'price', label: 'Precio particular (Bs, opcional)', type: 'number' },
    ],
    'working-hours': [
      { name: 'staffId', label: 'Profesional', options: staffOptions, required: true },
      { name: 'locationId', label: 'Sede', options: locationOptions, required: true },
      {
        name: 'dayOfWeek',
        label: 'Día de la semana',
        options: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(
          (label, index) => ({ value: String(index), label }),
        ),
      },
      {
        name: 'startMinute',
        label: 'Hora de apertura',
        type: 'time',
        value: '09:00',
        required: true,
      },
      { name: 'endMinute', label: 'Hora de cierre', type: 'time', value: '18:00', required: true },
    ],
    'time-off': [
      { name: 'locationId', label: 'Sede', options: locationOptions, required: true },
      {
        name: 'staffId',
        label: 'Profesional',
        options: [{ value: '', label: 'Todo el equipo' }, ...staffOptions],
      },
      {
        name: 'startAt',
        label: 'Inicio (hora de la sede)',
        type: 'datetime-local',
        required: true,
      },
      { name: 'endAt', label: 'Fin (hora de la sede)', type: 'datetime-local', required: true },
      { name: 'reason', label: 'Motivo', required: true },
      { name: 'isHoliday', label: 'Es un feriado', type: 'checkbox' },
    ],
    customers: [
      { name: 'name', label: 'Nombre', required: true },
      { name: 'email', label: 'Correo electrónico', required: true },
      { name: 'phone', label: 'Celular', required: true, value: '+591' },
      { name: 'internalNotes', label: 'Notas internas', type: 'textarea' },
      { name: 'tags', label: 'Etiquetas separadas por coma', type: 'tags' },
      { name: 'blocked', label: 'Bloquear nuevas reservas', type: 'checkbox' },
    ],
  };
  async function load(append = false) {
    setError('');
    try {
      const result = await api.request<{ items: Row[]; nextCursor: string | null }>(
        `/admin/${resource}${append && cursor ? `?cursor=${cursor}` : ''}`,
      );
      setItems((old) => (append ? [...old, ...result.items] : result.items));
      setCursor(result.nextCursor);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    setEditing(false);
    void load();
    if (resource === 'services')
      api
        .request<{ items: Row[] }>('/admin/categories')
        .then((value) => setCategories(value.items))
        .catch(() => {});
  }, [resource]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {};
    for (const field of fields[resource]) {
      const value = data.get(field.name);
      if (field.type === 'checkbox') body[field.name] = value === 'on';
      else if (field.type === 'number') {
        if (value !== '' && value !== null) body[field.name] = Number(value);
        else if (
          ['depositPercent', 'price', 'durationMinutes'].includes(field.name) &&
          resource === 'staff-services'
        )
          body[field.name] = null;
      } else if (field.type === 'datetime-local')
        body[field.name] = DateTime.fromISO(String(value), { zone }).toUTC().toISO();
      else if (field.type === 'time') {
        const [hours, minutes] = String(value).split(':').map(Number);
        body[field.name] = hours * 60 + minutes;
      } else if (field.type === 'tags')
        body[field.name] = String(value)
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
      else if (field.name === 'dayOfWeek') body[field.name] = Number(value);
      else if (value !== '' && value !== null) body[field.name] = value;
      else if (['categoryId', 'staffId', 'userId', 'photoUrl'].includes(field.name))
        body[field.name] = null;
    }
    if (resource === 'working-hours' && Number(body.endMinute) <= Number(body.startMinute))
      body.endMinute = Number(body.endMinute) + 1440;
    try {
      await api.request(`/admin/${resource}${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        headers: editing ? { 'If-Match': String(editing.version) } : undefined,
        body,
      });
      setEditing(false);
      await load();
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function valueFor(field: Field) {
    const value = editing ? editing[field.name] : field.value;
    if (field.type === 'datetime-local' && value)
      return DateTime.fromISO(String(value)).setZone(zone).toFormat("yyyy-MM-dd'T'HH:mm");
    if (field.type === 'time' && typeof value === 'number')
      return `${String(Math.floor(value / 60) % 24).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    if (field.type === 'tags' && Array.isArray(value)) return value.join(', ');
    return value === null || value === undefined ? '' : String(value);
  }
  function display(item: Row, field: Field) {
    const value = item[field.name];
    if (field.options)
      return field.options.find((option) => option.value === String(value))?.label || '—';
    if (field.type === 'checkbox') return value ? 'Sí' : 'No';
    if (field.type === 'time' && typeof value === 'number')
      return `${String(Math.floor(value / 60) % 24).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}${value >= 1440 ? ' (+1 día)' : ''}`;
    if (field.type === 'datetime-local' && value)
      return DateTime.fromISO(String(value)).setZone(zone).toFormat('dd/MM HH:mm');
    return typeof value === 'object'
      ? Array.isArray(value)
        ? value.join(', ')
        : '—'
      : String(value ?? '—');
  }
  return (
    <section>
      <div className="panel-head">
        <h2>{titles[resource]}</h2>
        <button className="button" onClick={() => setEditing(null)}>
          Agregar {resource === 'services' ? 'servicio' : 'registro'}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {feed && (
        <p className="notice">
          Enlace privado de suscripción iCal. No lo compartas públicamente.
          <br />
          <input aria-label="Enlace iCal privado" readOnly value={feed} />
        </p>
      )}
      {history && (
        <section className="resource-editor">
          <div className="panel-head">
            <h3>Historial de {String(history.customer.name)}</h3>
            <button className="button secondary small" onClick={() => setHistory(null)}>
              Cerrar historial
            </button>
          </div>
          {history.items.map((item) => (
            <article key={item.id} className="appointment">
              <div>
                <span className={`badge ${item.status}`}>{statusLabels[item.status]}</span>
                <h3>
                  {dateLabel(item.startAt)} · {item.code}
                </h3>
                <p>
                  {item.items?.map((service) => service.serviceName).join(' + ')} ·{' '}
                  {money(item.totalAmount)}
                </p>
              </div>
            </article>
          ))}
          {history.nextCursor && (
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  const result = await api.request<typeof history>(
                    `/admin/customers/${history.customer.id}/history?cursor=${history.nextCursor}`,
                  );
                  if (result) setHistory({ ...result, items: [...history.items, ...result.items] });
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              Ver más historial
            </button>
          )}
        </section>
      )}
      {editing !== false && (
        <section className="resource-editor">
          <h3>{editing ? 'Editar registro' : 'Nuevo registro'}</h3>
          <form onSubmit={submit}>
            <div className="form-grid">
              {fields[resource].map((field) => (
                <label
                  key={field.name}
                  className={
                    field.type === 'checkbox'
                      ? 'checkbox-label'
                      : field.type === 'textarea'
                        ? 'full'
                        : ''
                  }
                >
                  {field.type === 'checkbox' ? (
                    <>
                      <input
                        name={field.name}
                        type="checkbox"
                        defaultChecked={Boolean(editing ? editing[field.name] : field.value)}
                      />
                      {field.label}
                    </>
                  ) : (
                    <>
                      {field.label}
                      {field.options ? (
                        <select
                          name={field.name}
                          required={field.required}
                          defaultValue={valueFor(field) || field.options[0]?.value}
                        >
                          {field.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea rows={3} name={field.name} defaultValue={valueFor(field)} />
                      ) : (
                        <input
                          name={field.name}
                          type={field.type === 'tags' ? 'text' : field.type || 'text'}
                          required={field.required}
                          defaultValue={valueFor(field)}
                          step={field.type === 'number' ? '0.01' : undefined}
                          min={field.type === 'number' ? 0 : undefined}
                        />
                      )}
                    </>
                  )}
                </label>
              ))}
            </div>
            {resource === 'working-hours' && (
              <p className="fine-print">
                Un cierre anterior a la apertura indica un turno que termina al día siguiente.
                Puedes agregar varios tramos por día.
              </p>
            )}
            <div className="button-row" style={{ marginTop: 22 }}>
              <button className="button" disabled={busy}>
                Guardar
              </button>
              <button className="button secondary" type="button" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {fields[resource].slice(0, resource === 'working-hours' ? 5 : 4).map((field) => (
                <th key={field.name}>{field.label}</th>
              ))}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                {fields[resource].slice(0, resource === 'working-hours' ? 5 : 4).map((field) => (
                  <td key={field.name}>{display(item, field)}</td>
                ))}
                <td>
                  <div className="button-row">
                    <button className="text-link" onClick={() => setEditing(item)}>
                      Editar
                    </button>
                    <button
                      className="text-link"
                      onClick={async () => {
                        if (
                          !confirm(
                            '¿Eliminar este registro? Si tiene historial asociado, el sistema puede impedirlo.',
                          )
                        )
                          return;
                        try {
                          await api.request(`/admin/${resource}/${item.id}`, {
                            method: 'DELETE',
                            headers: { 'If-Match': String(item.version) },
                          });
                          await load();
                          onChange();
                        } catch (e) {
                          setError(errorMessage(e));
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                  {resource === 'customers' && (
                    <>
                      <small>No asistencias: {String(item.noShowCount || 0)}</small>
                      <button
                        className="text-link"
                        onClick={async () => {
                          try {
                            setHistory(await api.request(`/admin/customers/${item.id}/history`));
                          } catch (e) {
                            setError(errorMessage(e));
                          }
                        }}
                      >
                        Ver historial
                      </button>
                    </>
                  )}
                  {resource === 'staff' && (
                    <button
                      className="text-link"
                      onClick={async () => {
                        try {
                          const result = await api.request<{ path: string }>(
                            `/staff/${item.id}/calendar-token`,
                            {
                              method: 'POST',
                              headers: { 'If-Match': String(item.version) },
                              body: {},
                            },
                          );
                          setFeed(`${new URL(API_URL).origin}${result.path}`);
                          await load();
                        } catch (e) {
                          setError(errorMessage(e));
                        }
                      }}
                    >
                      Crear enlace iCal
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!items.length && <p className="empty-state">No hay registros todavía.</p>}
      {cursor && (
        <button className="button secondary" onClick={() => void load(true)}>
          Cargar más
        </button>
      )}
    </section>
  );
}
