'use client';
import { useEffect, useState } from 'react';
import { useAuth } from './providers';
import { LoginForm } from './account';
import { Notifications } from './notifications';
import { Agenda } from './agenda';
import { ResourceManager } from './resource-manager';
import { Reports, Settings, Audit, Users, Payments } from './panel-tools';
import { api } from '@/lib/api';
import { type Catalog, errorMessage } from '@/lib/types';
const sections = [
  ['agenda', 'Agenda'],
  ['services', 'Servicios'],
  ['staff', 'Equipo'],
  ['locations', 'Sedes'],
  ['categories', 'Categorías'],
  ['working-hours', 'Horarios'],
  ['time-off', 'Bloqueos'],
  ['staff-services', 'Servicios por profesional'],
  ['customers', 'Clientes'],
  ['payments', 'Pagos'],
  ['reports', 'Reportes'],
  ['settings', 'Políticas'],
  ['users', 'Usuarios'],
  ['audit', 'Auditoría'],
  ['outbox', 'Notificaciones'],
];
export function AdminPanel() {
  const { user, loading } = useAuth();
  const [section, setSection] = useState('agenda');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const refresh = () =>
    api
      .request<Catalog>('/catalog')
      .then(setCatalog)
      .catch((e) => setError(errorMessage(e)));
  useEffect(() => {
    if (user) void refresh();
  }, [user]);
  if (loading) return <p role="status">Cargando tu agenda…</p>;
  if (!user) return <LoginForm />;
  if (user.role === 'CLIENT')
    return (
      <section>
        <h1>Este espacio es del equipo.</h1>
        <a className="button" href="/cuenta">
          Ver mis citas
        </a>
      </section>
    );
  const admin = ['ADMIN', 'OWNER', 'SUPERADMIN'].includes(user.role);
  return (
    <>
      <div className="panel-head">
        <div>
          <p className="eyebrow">{catalog?.business.name || 'Agenda abierta'} · Equipo</p>
          <h1 style={{ fontSize: '2.6rem' }}>
            {admin ? 'Cada día, bien organizado.' : 'Tu agenda de hoy.'}
          </h1>
        </div>
        <a className="button secondary" href="/cuenta">
          Mi cuenta
        </a>
      </div>
      {admin && (
        <nav className="panel-nav" aria-label="Administración">
          {sections.map(([key, label]) => (
            <button
              className={`button small ${section === key ? '' : 'secondary'}`}
              key={key}
              aria-pressed={section === key}
              onClick={() => setSection(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {section === 'agenda' && <Agenda catalog={catalog} admin={admin} />}{' '}
      {admin &&
        catalog &&
        [
          'services',
          'staff',
          'locations',
          'categories',
          'working-hours',
          'time-off',
          'staff-services',
          'customers',
        ].includes(section) && (
          <ResourceManager resource={section} catalog={catalog} onChange={refresh} />
        )}{' '}
      {section === 'reports' && admin && <Reports catalog={catalog} />}{' '}
      {section === 'settings' && admin && <Settings />}
      {section === 'audit' && admin && <Audit />}
      {section === 'users' && admin && <Users />}
      {section === 'payments' && admin && <Payments />}
      {section === 'outbox' && admin && <Notifications outbox />}
    </>
  );
}
