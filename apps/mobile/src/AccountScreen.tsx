import { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, TextInput, View } from 'react-native';
import type { User } from '@reservas/api-client';
import { api } from './session';
import { disablePush, enablePush } from './native-actions';
import { Button, errorMessage, Notice, styles } from './ui';

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  version: number;
  notificationPreferences: { email?: boolean; push?: boolean } | null;
};
type Notification = {
  id: string;
  subject: string;
  body: string;
  readAt: string | null;
  payload?: { bookingId?: string };
};
type Session = { id: string; userAgent: string | null; ip: string | null; createdAt: string };
export function AccountScreen({
  user,
  onLogout,
  onName,
  onBooking,
}: {
  user: User;
  onLogout: () => Promise<void>;
  onName: (name: string) => void;
  onBooking: (id: string) => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionCursor, setSessionCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    Promise.all([
      api.request<Profile>('/users/me'),
      api.request<{ items: Notification[]; nextCursor: string | null }>('/notifications'),
      api.request<{ items: Session[]; nextCursor: string | null }>('/auth/sessions'),
    ])
      .then(([p, n, s]) => {
        setProfile(p);
        setNotifications(n.items);
        setCursor(n.nextCursor);
        setSessions(s.items);
        setSessionCursor(s.nextCursor);
      })
      .catch((reason) => setError(errorMessage(reason)));
  }, [user.id]);
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(success);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.subtitle}>Mi cuenta</Text>
      <Text style={styles.text}>{user.email}</Text>
      {error ? <Notice error>{error}</Notice> : null}
      {notice ? <Notice>{notice}</Notice> : null}
      {profile ? (
        <>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            accessibilityLabel="Nombre del perfil"
            style={styles.input}
            value={profile.name}
            onChangeText={(name) => setProfile((value) => value && { ...value, name })}
          />
          <Text style={styles.label}>Celular</Text>
          <TextInput
            accessibilityLabel="Celular del perfil"
            style={styles.input}
            value={profile.phone || ''}
            keyboardType="phone-pad"
            onChangeText={(phone) => setProfile((value) => value && { ...value, phone })}
          />
          <View style={styles.row}>
            <Text style={styles.text}>Avisos por correo</Text>
            <Switch
              accessibilityLabel="Recibir avisos por correo"
              value={profile.notificationPreferences?.email !== false}
              onValueChange={(email) =>
                setProfile(
                  (value) =>
                    value && {
                      ...value,
                      notificationPreferences: { ...value.notificationPreferences, email },
                    },
                )
              }
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.text}>Avisos push</Text>
            <Switch
              accessibilityLabel="Recibir avisos push"
              value={profile.notificationPreferences?.push !== false}
              onValueChange={(push) =>
                setProfile(
                  (value) =>
                    value && {
                      ...value,
                      notificationPreferences: { ...value.notificationPreferences, push },
                    },
                )
              }
            />
          </View>
          <Button
            disabled={busy}
            onPress={() =>
              void run(async () => {
                const updated = await api.request<Profile>('/users/me', {
                  method: 'PATCH',
                  headers: { 'If-Match': String(profile.version) },
                  body: {
                    name: profile.name,
                    ...(profile.phone ? { phone: profile.phone } : {}),
                    notificationPreferences: {
                      email: profile.notificationPreferences?.email !== false,
                      push: profile.notificationPreferences?.push !== false,
                    },
                  },
                });
                setProfile(updated);
                onName(updated.name);
              }, 'Perfil actualizado.')
            }
          >
            Guardar perfil
          </Button>
        </>
      ) : null}
      <View style={styles.divider}>
        <Text style={styles.subtitle}>Este dispositivo</Text>
        <Button
          disabled={busy}
          onPress={() => void run(enablePush, 'Dispositivo registrado para recibir avisos push.')}
        >
          Activar notificaciones push
        </Button>
        <Button
          secondary
          disabled={busy}
          onPress={() => void run(disablePush, 'Avisos de este dispositivo desactivados.')}
        >
          Desactivar avisos del dispositivo
        </Button>
        <Text style={styles.caption}>
          Los permisos se solicitan al activar avisos. Los recordatorios locales se programan desde
          cada cita.
        </Text>
      </View>
      <View style={styles.divider}>
        <Text style={styles.subtitle}>Notificaciones</Text>
        {!notifications.length ? <Text style={styles.text}>No tienes notificaciones.</Text> : null}
        {notifications.map((item) => (
          <View key={item.id} style={styles.divider}>
            <Text style={styles.label}>
              {item.subject}
              {!item.readAt ? ' · Nueva' : ''}
            </Text>
            <Text style={styles.text}>{item.body}</Text>
            {item.payload?.bookingId ? (
              <Button secondary onPress={() => onBooking(item.payload!.bookingId!)}>
                Ver cita
              </Button>
            ) : null}
            {!item.readAt ? (
              <Button
                secondary
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    await api.request(`/notifications/${item.id}/read`, {
                      method: 'PATCH',
                      body: {},
                    });
                    setNotifications((values) =>
                      values.map((value) =>
                        value.id === item.id
                          ? { ...value, readAt: new Date().toISOString() }
                          : value,
                      ),
                    );
                  }, 'Notificación leída.')
                }
              >
                Marcar leída
              </Button>
            ) : null}
          </View>
        ))}
        {cursor ? (
          <Button
            secondary
            disabled={busy}
            onPress={() =>
              void run(async () => {
                const page = await api.request<{
                  items: Notification[];
                  nextCursor: string | null;
                }>(`/notifications?cursor=${cursor}`);
                setNotifications((values) => [...values, ...page.items]);
                setCursor(page.nextCursor);
              }, 'Notificaciones actualizadas.')
            }
          >
            Cargar más avisos
          </Button>
        ) : null}
      </View>
      <View style={styles.divider}>
        <Text style={styles.subtitle}>Sesiones activas</Text>
        {sessions.map((session) => (
          <View key={session.id} style={styles.divider}>
            <Text style={styles.text}>{session.userAgent || 'Dispositivo sin nombre'}</Text>
            <Text style={styles.caption}>
              {new Date(session.createdAt).toLocaleDateString('es-BO')} ·{' '}
              {session.ip || 'IP no disponible'}
            </Text>
            <Button
              secondary
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await api.request(`/auth/sessions/${session.id}`, { method: 'DELETE' });
                  setSessions((values) => values.filter((item) => item.id !== session.id));
                }, 'Sesión revocada. Si era esta sesión, vuelve a ingresar.')
              }
            >
              Cerrar esta sesión
            </Button>
          </View>
        ))}
        {sessionCursor ? (
          <Button
            secondary
            disabled={busy}
            onPress={() =>
              void run(async () => {
                const page = await api.request<{ items: Session[]; nextCursor: string | null }>(
                  `/auth/sessions?cursor=${sessionCursor}`,
                );
                setSessions((values) => [...values, ...page.items]);
                setSessionCursor(page.nextCursor);
              }, 'Sesiones actualizadas.')
            }
          >
            Cargar más sesiones
          </Button>
        ) : null}
        <Button
          secondary
          disabled={busy}
          onPress={() =>
            void run(async () => {
              await api.request('/auth/sessions', { method: 'DELETE' });
              await onLogout();
            }, 'Sesiones cerradas.')
          }
        >
          Cerrar todas las sesiones
        </Button>
      </View>
      <Button secondary disabled={busy} onPress={() => void onLogout()}>
        Cerrar sesión en este dispositivo
      </Button>
    </ScrollView>
  );
}
