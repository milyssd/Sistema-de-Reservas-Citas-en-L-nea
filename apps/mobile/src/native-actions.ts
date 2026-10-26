import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar/legacy';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import type { Booking } from '@reservas/api-client';
import { api } from './session';

const pushKey = 'agenda.push-device';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function addToCalendar(booking: Booking) {
  if (!(await Calendar.isAvailableAsync()))
    throw new Error('Este dispositivo no tiene una aplicación de calendario disponible.');
  // El formulario del sistema permite revisar y guardar la cita sin leer los calendarios personales.
  return Calendar.createEventInCalendarAsync({
    title: booking.items.map((item) => item.serviceName).join(' + '),
    startDate: new Date(booking.startAt),
    endDate: new Date(booking.endAt),
    timeZone: booking.location.timezone,
    location: `${booking.location.name} · ${booking.location.address}`,
    notes: `Reserva ${booking.code}. Cambios de horario y cancelaciones se gestionan en Agenda abierta.`,
    url: `agendaabierta://booking/${booking.id}`,
    alarms: [{ relativeOffset: -120 }],
  });
}

async function notificationPermission() {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('reservas', {
      name: 'Reservas y recordatorios',
      importance: Notifications.AndroidImportance.HIGH,
    });
  const current = await Notifications.getPermissionsAsync();
  const result = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!result.granted)
    throw new Error('Activa las notificaciones de Agenda abierta en los ajustes del dispositivo.');
}

export async function enablePush() {
  if (!Device.isDevice)
    throw new Error(
      'Los avisos push se activan en un dispositivo físico con una compilación nativa.',
    );
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId)
    throw new Error(
      'La compilación necesita EXPO_PUBLIC_EAS_PROJECT_ID y las credenciales APNs/FCM del operador para recibir push. Los recordatorios locales siguen disponibles.',
    );
  await notificationPermission();
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const result = await api.request<{ id: string }>('/devices', {
    method: 'POST',
    body: { platform: 'EXPO', token },
  });
  await SecureStore.setItemAsync(pushKey, result.id);
}

export async function disablePush() {
  const id = await SecureStore.getItemAsync(pushKey);
  try {
    if (id) {
      await api.request(`/devices/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await SecureStore.deleteItemAsync(pushKey);
    }
  } finally {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export async function cancelLocalReminders(bookingId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.bookingId === bookingId)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function scheduleLocalReminders(booking: Booking) {
  await notificationPermission();
  await cancelLocalReminders(booking.id);
  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) return 0;
  let scheduled = 0;
  for (const hours of [24, 2]) {
    const date = new Date(Date.parse(booking.startAt) - hours * 3600_000);
    if (date.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Tienes una cita próxima',
        body: `Revisa el horario y los detalles en Agenda abierta. Código ${booking.code}.`,
        data: { bookingId: booking.id },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: 'reservas',
      },
    });
    scheduled++;
  }
  return scheduled;
}

export function observeNotifications(onBooking: (id: string) => void, onUpdate: () => void) {
  const receive = (response: Notifications.NotificationResponse) => {
    const id = response.notification.request.content.data?.bookingId;
    if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) onBooking(id);
    onUpdate();
  };
  const foreground = Notifications.addNotificationReceivedListener(() => onUpdate());
  const interaction = Notifications.addNotificationResponseReceivedListener(receive);
  void Notifications.getLastNotificationResponseAsync().then((value) => {
    if (value) receive(value);
  });
  return () => {
    foreground.remove();
    interaction.remove();
  };
}

export async function refreshExistingLocalReminders(booking: Booking) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (scheduled.some((item) => item.content.data?.bookingId === booking.id))
    await scheduleLocalReminders(booking);
}
