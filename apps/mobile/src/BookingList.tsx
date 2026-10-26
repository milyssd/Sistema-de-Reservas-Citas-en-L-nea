import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, FlatList, Text, View } from 'react-native';
import { DateTime } from 'luxon';
import type { Booking, User } from '@reservas/api-client';
import { api } from './session';
import { addToCalendar, cancelLocalReminders, scheduleLocalReminders } from './native-actions';
import { Button, errorMessage, Notice, styles } from './ui';

const statusLabels: Record<Booking['status'], string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
  EXPIRED: 'Vencida',
};
export function BookingList({
  user,
  revision,
  selectedId,
  onReserve,
  onReschedule,
}: {
  user: User;
  revision: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReserve: () => void;
  onReschedule: (booking: Booking) => void;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isStaff = user.role !== 'CLIENT';
  const [timezone, setTimezone] = useState('America/La_Paz');
  useEffect(() => {
    void api
      .catalog<{
        business: { timezone: string };
        locations: Array<{ id: string; timezone: string }>;
        staff: Array<{ id: string; locationId: string }>;
      }>()
      .then((catalog) => {
        const staff = catalog.staff.find((person) => person.id === user.staffId);
        const zone =
          catalog.locations.find((location) => location.id === staff?.locationId)?.timezone ||
          catalog.business.timezone;
        setTimezone(zone);
        setDay(DateTime.now().setZone(zone).toISODate()!);
      })
      .catch(() => undefined);
  }, [user.id]);
  const [day, setDay] = useState(DateTime.now().setZone('America/La_Paz').toISODate()!);

  const load = useCallback(
    async (nextCursor?: string, background = false) => {
      if (!background) {
        setBusy(true);
        setError('');
      }
      try {
        const query = new URLSearchParams({ limit: '25' });
        if (nextCursor) query.set('cursor', nextCursor);
        if (isStaff) {
          const start = DateTime.fromISO(day, { zone: timezone }).startOf('day');
          if (!start.isValid) throw new Error('Fecha inválida.');
          query.set('from', start.toUTC().toISO()!);
          query.set('to', start.plus({ days: 1 }).toUTC().toISO()!);
        }
        const result = await api.request<{ data: Booking[]; nextCursor: string | null }>(
          `/bookings?${query}`,
        );
        setBookings((previous) => (nextCursor ? [...previous, ...result.data] : result.data));
        setCursor(result.nextCursor);
      } catch (reason) {
        if (!background) setError(errorMessage(reason));
      } finally {
        if (!background) setBusy(false);
      }
    },
    [user.id, isStaff, day, timezone],
  );

  useEffect(() => {
    void load();
  }, [load, revision]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void load(undefined, true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [load]);
  useEffect(() => {
    if (!selectedId) return;
    api
      .request<Booking>(`/bookings/${encodeURIComponent(selectedId)}`)
      .then((booking) =>
        setBookings((previous) => [booking, ...previous.filter((item) => item.id !== booking.id)]),
      )
      .catch((reason) => setError(errorMessage(reason)));
  }, [selectedId, user.id, revision]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(success);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const changeStatus = (booking: Booking, status: 'CANCELLED' | 'COMPLETED' | 'NO_SHOW') => {
    const label =
      status === 'CANCELLED'
        ? 'Cancelar cita'
        : status === 'COMPLETED'
          ? 'Marcar como completada'
          : 'Marcar inasistencia';
    Alert.alert(
      label,
      status === 'CANCELLED'
        ? 'La API aplicará el plazo de cancelación y la política del anticipo del negocio.'
        : `Confirma la acción para la reserva ${booking.code}.`,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: label,
          style: status === 'CANCELLED' ? 'destructive' : 'default',
          onPress: () =>
            void run(async () => {
              await api.request(`/bookings/${booking.id}`, {
                method: 'PATCH',
                headers: { 'If-Match': String(booking.version) },
                body: {
                  status,
                  ...(status === 'CANCELLED'
                    ? { reason: 'Cancelada desde la aplicación móvil' }
                    : {}),
                },
              });
              await cancelLocalReminders(booking.id);
            }, 'La reserva se actualizó.'),
        },
      ],
    );
  };

  return (
    <FlatList
      data={bookings}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.screen}
      refreshing={busy}
      onRefresh={() => void load()}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Text style={styles.subtitle}>{isStaff ? 'Agenda del día' : 'Mis citas'}</Text>
          {isStaff ? (
            <View style={styles.row}>
              <Button
                secondary
                disabled={busy}
                onPress={() => setDay(DateTime.fromISO(day).minus({ days: 1 }).toISODate()!)}
              >
                Anterior
              </Button>
              <Text style={styles.text}>{day}</Text>
              <Button
                secondary
                disabled={busy}
                onPress={() => setDay(DateTime.fromISO(day).plus({ days: 1 }).toISODate()!)}
              >
                Siguiente
              </Button>
            </View>
          ) : null}
          <Button onPress={onReserve}>Reservar una cita</Button>
          {error ? <Notice error>{error}</Notice> : null}
          {notice ? <Notice>{notice}</Notice> : null}
          <Text style={styles.caption}>
            {isStaff
              ? `Agenda del día en ${timezone}; cada cita muestra la hora local de su sede.`
              : 'Desliza hacia abajo para actualizar. Los importes son en Bs.'}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Notice>{busy ? 'Cargando citas…' : 'No hay citas para mostrar.'}</Notice>
      }
      ListFooterComponent={
        cursor ? (
          <Button secondary disabled={busy} onPress={() => void load(cursor)}>
            Cargar más citas
          </Button>
        ) : undefined
      }
      renderItem={({ item }) => (
        <View style={[styles.divider, { marginTop: 18 }]}>
          <Text style={styles.subtitle}>
            {DateTime.fromISO(item.startAt)
              .setZone(item.location.timezone)
              .toFormat('dd/LL · HH:mm')}
          </Text>
          <Text style={styles.label}>{item.items.map((part) => part.serviceName).join(' → ')}</Text>
          <Text style={styles.text}>
            {item.staff.name} · {item.location.name}
          </Text>
          <Text style={styles.caption}>
            {item.code} · {statusLabels[item.status]} · Bs {Number(item.totalAmount).toFixed(2)}
          </Text>
          {item.status === 'PENDING' && Number(item.depositAmount) > 0 ? (
            <Notice>
              Anticipo pendiente: Bs {Number(item.depositAmount).toFixed(2)}. Coordina el pago
              manual con el negocio.
            </Notice>
          ) : null}
          {item.id === selectedId ? (
            <Notice>Cita seleccionada desde tu enlace o notificación.</Notice>
          ) : null}
          {(item as Booking & { canManage?: boolean }).canManage === false ? (
            <Text style={styles.caption}>
              Cita compartida: administración coordina los cambios de estado y horario.
            </Text>
          ) : null}
          <View style={styles.row}>
            {['PENDING', 'CONFIRMED'].includes(item.status) &&
            (item as Booking & { canManage?: boolean }).canManage !== false ? (
              <>
                <Button secondary disabled={busy} onPress={() => onReschedule(item)}>
                  Cambiar horario
                </Button>
                <Button secondary disabled={busy} onPress={() => changeStatus(item, 'CANCELLED')}>
                  Cancelar
                </Button>
                <Button
                  secondary
                  disabled={busy}
                  onPress={() =>
                    void run(
                      () => addToCalendar(item),
                      'Se abrió el calendario para guardar la cita.',
                    )
                  }
                >
                  Añadir al calendario
                </Button>
                <Button
                  secondary
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      const count = await scheduleLocalReminders(item);
                      if (!count)
                        throw new Error(
                          'La cita ocurre antes del próximo intervalo de recordatorio (2 horas).',
                        );
                    }, 'Recordatorios locales programados para 24 y 2 horas antes, cuando corresponde.')
                  }
                >
                  Recordarme
                </Button>
              </>
            ) : null}
            {isStaff &&
            item.status === 'CONFIRMED' &&
            (item as Booking & { canManage?: boolean }).canManage !== false ? (
              <>
                <Button disabled={busy} onPress={() => changeStatus(item, 'COMPLETED')}>
                  Marcar completada
                </Button>
                <Button secondary disabled={busy} onPress={() => changeStatus(item, 'NO_SHOW')}>
                  No asistió
                </Button>
              </>
            ) : null}
          </View>
        </View>
      )}
    />
  );
}
