import { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { DateTime } from 'luxon';
import type { Booking, Hold, User, operations } from '@reservas/api-client';
import { api } from './session';
import { refreshExistingLocalReminders } from './native-actions';
import { bookingAttempts } from './booking-store';
import type { BookingAttempt } from './booking-attempt';
import { Button, colors, errorMessage, Notice, styles } from './ui';

type Catalog =
  operations['CatalogController_catalog']['responses'][200]['content']['application/json'];
type Slot = {
  startAt: string;
  endAt: string;
  locationId: string;
  staffId: string;
  staffIds?: string[];
  remainingCapacity: number;
};
type Choice = { slot: Slot; hold?: Hold };

export function BookingFlow({
  user,
  booking,
  onDone,
  onBack,
}: {
  user: User;
  booking?: Booking;
  onDone: (booking: Booking) => void;
  onBack: () => void;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [locationId, setLocationId] = useState(booking?.locationId || '');
  const [serviceIds, setServiceIds] = useState<string[]>(
    booking?.items.map((item) => item.serviceId) || [],
  );
  const [staffChoices, setStaffChoices] = useState<Record<string, string>>(
    Object.fromEntries(booking?.items.map((item) => [item.serviceId, item.staffId]) || []),
  );
  const [commonStaff, setCommonStaff] = useState(booking?.staffId || '');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [contact, setContact] = useState({ name: user.name, email: user.email, phone: '' });
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<BookingAttempt | null>(null);
  const attempts = useMemo(() => bookingAttempts(user.id), [user.id]);
  const location = catalog?.locations.find((item) => item.id === locationId);
  const timezone = location?.timezone || 'America/La_Paz';
  const multiStaff = Boolean(
    (
      catalog?.business as
        (Catalog['business'] & { featureFlags?: { multiStaffBookings?: boolean } }) | undefined
    )?.featureFlags?.multiStaffBookings,
  );
  const selectedServices = serviceIds
    .map((id) => catalog?.services.find((item) => item.id === id))
    .filter((item): item is Catalog['services'][number] => Boolean(item));
  const staff = catalog?.staff.filter((item) => item.locationId === locationId) || [];
  const commonProfessionals = staff.filter((item) =>
    serviceIds.every((id) => item.staffServices.some((link) => link.serviceId === id)),
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      api.catalog<Catalog>(),
      api.request<{ phone?: string }>('/users/me'),
      attempts.load(),
    ])
      .then(([data, profile, attempt]) => {
        if (!active) return;
        setCatalog(data);
        const selectedLocation =
          data.locations.find((item) => item.id === booking?.locationId) || data.locations[0];
        setLocationId(selectedLocation?.id || '');
        setDate(
          DateTime.now()
            .setZone(selectedLocation?.timezone || 'America/La_Paz')
            .plus({ days: 1 })
            .toISODate()!,
        );
        setContact((value) => ({ ...value, phone: profile.phone || '' }));
        setPending(booking ? null : attempt);
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, [user.id, booking?.id, attempts]);

  const staffSelection = JSON.stringify(serviceIds.map((id) => staffChoices[id] || null));
  useEffect(() => {
    if (!catalog || !locationId || !serviceIds.length || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setSlots([]);
      return;
    }
    const day = DateTime.fromISO(date, { zone: timezone }).startOf('day');
    if (!day.isValid) {
      setError('Escribe una fecha válida: AAAA-MM-DD.');
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    setChoice(null);
    setError('');
    const params = new URLSearchParams({
      locationId,
      serviceIds: serviceIds.join(','),
      from: day.toUTC().toISO()!,
      to: day.plus({ days: 1 }).toUTC().toISO()!,
    });
    if (multiStaff)
      params.set('staffIds', serviceIds.map((id) => staffChoices[id] || 'any').join(','));
    else if (commonStaff) params.set('staffId', commonStaff);
    api
      .request<{ data: Slot[] }>(`/availability?${params}`, { signal: controller.signal })
      .then((result) => setSlots(result.data))
      .catch((reason) => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [
    catalog,
    locationId,
    serviceIds.join(','),
    date,
    timezone,
    multiStaff,
    commonStaff,
    staffSelection,
  ]);

  const choose = async (slot: Slot) => {
    setBusy(true);
    setError('');
    try {
      if (booking) setChoice({ slot });
      else {
        const assignments = multiStaff
          ? { staffIds: slot.staffIds || serviceIds.map(() => slot.staffId) }
          : { staffId: slot.staffId };
        const hold = await api.createHold({
          locationId,
          serviceIds,
          startAt: slot.startAt,
          ...assignments,
        });
        setChoice({ slot, hold });
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!choice) return;
    setBusy(true);
    setError('');
    try {
      const assignments = multiStaff
        ? { staffIds: choice.slot.staffIds || serviceIds.map(() => choice.slot.staffId) }
        : { staffId: choice.slot.staffId };
      if (booking) {
        const updated = await api.rescheduleBooking(booking.id, booking.version, {
          startAt: choice.slot.startAt,
          ...assignments,
        });
        onDone(updated);
        void refreshExistingLocalReminders(updated).catch(() =>
          Alert.alert(
            'Horario actualizado',
            'Revisa los recordatorios locales en este dispositivo.',
          ),
        );
      } else {
        if (
          !contact.name.trim() ||
          !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email) ||
          !/^\+591[67]\d{7}$/.test(contact.phone)
        )
          throw new Error(
            'Completa nombre, correo y celular boliviano (+591 seguido de 8 dígitos).',
          );
        onDone(
          await attempts.submit({
            locationId,
            serviceIds,
            ...assignments,
            startAt: choice.slot.startAt,
            source: 'MOBILE',
            customer: contact,
            ...(notes.trim() ? { notes: notes.trim() } : {}),
            ...(choice.hold ? { holdToken: choice.hold.holdToken } : {}),
          }),
        );
      }
    } catch (reason) {
      setError(errorMessage(reason));
      if (!booking) setPending(await attempts.load());
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    setBusy(true);
    setError('');
    try {
      onDone(await attempts.retry());
    } catch (reason) {
      setError(errorMessage(reason));
      if (!booking) setPending(await attempts.load());
    } finally {
      setBusy(false);
    }
  };

  if (!catalog)
    return (
      <View style={styles.screen}>
        {error ? (
          <Notice error>{error}</Notice>
        ) : (
          <ActivityIndicator color={colors.blue} accessibilityLabel="Cargando servicios" />
        )}
        <Button secondary onPress={onBack}>
          Volver a mi agenda
        </Button>
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.subtitle}>{booking ? 'Cambiar horario' : 'Reservar una cita'}</Text>
      {error ? <Notice error>{error}</Notice> : null}
      {pending && !booking ? (
        <View style={styles.divider}>
          <Notice>
            {pending.state === 'PENDING'
              ? 'Hay una reserva cuya respuesta no llegó. Consulta el resultado con la misma clave para evitar duplicados.'
              : 'La API rechazó el intento anterior. Puedes corregir la selección e iniciar otro.'}
          </Notice>
          <Button disabled={busy} onPress={() => void retry()}>
            Consultar resultado pendiente
          </Button>
          {pending.state === 'REJECTED' ? (
            <Button
              secondary
              onPress={() =>
                void attempts.discardRejected().then(() => {
                  setPending(null);
                  setChoice(null);
                })
              }
            >
              Corregir selección
            </Button>
          ) : null}
        </View>
      ) : null}
      <Text style={styles.label}>Sede</Text>
      <View style={styles.row}>
        {catalog.locations.map((item) => (
          <Button
            key={item.id}
            secondary
            selected={locationId === item.id}
            disabled={Boolean(booking) || busy || Boolean(pending)}
            onPress={() => {
              setLocationId(item.id);
              setCommonStaff('');
              setStaffChoices({});
            }}
          >
            {item.name}
          </Button>
        ))}
      </View>
      <Text style={styles.caption}>
        {location?.address} · {timezone}
      </Text>
      <Text style={styles.label}>Servicios, en orden de atención</Text>
      {catalog.services.map((service) => (
        <Button
          key={service.id}
          secondary
          selected={serviceIds.includes(service.id)}
          disabled={Boolean(booking) || busy || Boolean(pending)}
          onPress={() =>
            setServiceIds((ids) =>
              ids.includes(service.id)
                ? ids.filter((id) => id !== service.id)
                : ids.length < 8
                  ? [...ids, service.id]
                  : ids,
            )
          }
        >
          {serviceIds.includes(service.id) ? `${serviceIds.indexOf(service.id) + 1}. ` : ''}
          {service.name} · {service.durationMinutes} min · Bs {Number(service.price).toFixed(2)}
        </Button>
      ))}
      {multiStaff ? (
        selectedServices.map((service) => (
          <View key={service.id} style={styles.divider}>
            <Text style={styles.label}>Profesional para {service.name}</Text>
            <View style={styles.row}>
              <Button
                secondary
                selected={!staffChoices[service.id]}
                disabled={busy || Boolean(pending)}
                onPress={() => setStaffChoices((value) => ({ ...value, [service.id]: '' }))}
              >
                Cualquiera
              </Button>
              {staff
                .filter((item) => item.staffServices.some((link) => link.serviceId === service.id))
                .map((item) => (
                  <Button
                    key={item.id}
                    secondary
                    selected={staffChoices[service.id] === item.id}
                    disabled={busy || Boolean(pending)}
                    onPress={() =>
                      setStaffChoices((value) => ({ ...value, [service.id]: item.id }))
                    }
                  >
                    {item.name}
                  </Button>
                ))}
            </View>
          </View>
        ))
      ) : (
        <>
          <Text style={styles.label}>Profesional</Text>
          <View style={styles.row}>
            <Button
              secondary
              selected={!commonStaff}
              disabled={busy || Boolean(pending)}
              onPress={() => setCommonStaff('')}
            >
              Cualquiera
            </Button>
            {commonProfessionals.map((item) => (
              <Button
                key={item.id}
                secondary
                selected={commonStaff === item.id}
                disabled={busy || Boolean(pending)}
                onPress={() => setCommonStaff(item.id)}
              >
                {item.name}
              </Button>
            ))}
          </View>
        </>
      )}
      <Text style={styles.label}>Fecha en la sede (AAAA-MM-DD)</Text>
      <TextInput
        accessibilityLabel="Fecha de la cita"
        style={styles.input}
        value={date}
        onChangeText={setDate}
        maxLength={10}
        editable={!busy && !pending}
        keyboardType="numbers-and-punctuation"
      />
      <View style={styles.row}>
        <Button
          secondary
          disabled={busy || Boolean(pending)}
          onPress={() =>
            setDate(
              DateTime.fromISO(date, { zone: timezone }).minus({ days: 1 }).toISODate() || date,
            )
          }
        >
          Día anterior
        </Button>
        <Button
          secondary
          disabled={busy || Boolean(pending)}
          onPress={() =>
            setDate(
              DateTime.fromISO(date, { zone: timezone }).plus({ days: 1 }).toISODate() || date,
            )
          }
        >
          Día siguiente
        </Button>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.blue} accessibilityLabel="Consultando disponibilidad" />
      ) : null}
      <Text style={styles.label}>Horarios disponibles</Text>
      {!busy && !slots.length ? (
        <Text style={styles.text}>
          Elige servicios y fecha. Si no hay turnos, prueba otra fecha o profesional.
        </Text>
      ) : null}
      <View style={styles.row}>
        {slots.map((slot, index) => (
          <Button
            key={`${slot.startAt}-${slot.staffIds?.join('-') || slot.staffId}-${index}`}
            secondary
            selected={choice?.slot === slot}
            disabled={busy || Boolean(pending)}
            onPress={() => void choose(slot)}
          >
            {DateTime.fromISO(slot.startAt).setZone(timezone).toFormat('HH:mm')} ·{' '}
            {(slot.staffIds || [slot.staffId])
              .map((id) => staff.find((item) => item.id === id)?.name || 'Profesional')
              .join(' → ')}
            {slot.remainingCapacity > 1 ? ` · ${slot.remainingCapacity} cupos` : ''}
          </Button>
        ))}
      </View>
      {choice ? (
        <View style={styles.divider}>
          <Text style={styles.subtitle}>
            {DateTime.fromISO(choice.slot.startAt).setZone(timezone).toFormat('dd/LL/yyyy · HH:mm')}
          </Text>
          <Text style={styles.text}>{selectedServices.map((item) => item.name).join(' → ')}</Text>
          <Text style={styles.caption}>
            Total según servicios y profesionales: Bs{' '}
            {selectedServices
              .reduce((total, item, index) => {
                const personId = choice.slot.staffIds?.[index] || choice.slot.staffId;
                const override = staff
                  .find((person) => person.id === personId)
                  ?.staffServices.find((link) => link.serviceId === item.id)?.price;
                return total + Number(override ?? item.price);
              }, 0)
              .toFixed(2)}
            . La API valida el importe y lo guarda al confirmar.
          </Text>
          {choice.hold ? (
            <Text style={styles.caption}>
              Turno retenido hasta{' '}
              {DateTime.fromISO(choice.hold.expiresAt).setZone(timezone).toFormat('HH:mm')}.
            </Text>
          ) : null}
        </View>
      ) : null}
      {!booking ? (
        <>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            accessibilityLabel="Nombre para la reserva"
            style={styles.input}
            value={contact.name}
            onChangeText={(name) => setContact((value) => ({ ...value, name }))}
            editable={!pending && !busy}
          />
          <Text style={styles.label}>Celular WhatsApp</Text>
          <TextInput
            accessibilityLabel="Celular boliviano"
            style={styles.input}
            value={contact.phone}
            onChangeText={(phone) => setContact((value) => ({ ...value, phone }))}
            keyboardType="phone-pad"
            placeholder="+59170123456"
            editable={!pending && !busy}
          />
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            accessibilityLabel="Correo de la reserva"
            style={styles.input}
            value={contact.email}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={false}
          />
          <Text style={styles.label}>Notas opcionales</Text>
          <TextInput
            accessibilityLabel="Notas de la reserva"
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
            editable={!pending && !busy}
          />
        </>
      ) : null}
      <Button
        disabled={busy || !choice || Boolean(pending) || catalog.business.maintenanceMode}
        onPress={() => void confirm()}
      >
        {busy ? 'Guardando…' : booking ? 'Confirmar nuevo horario' : 'Confirmar cita'}
      </Button>
      <Button secondary disabled={busy} onPress={onBack}>
        Volver a mi agenda
      </Button>
    </ScrollView>
  );
}
