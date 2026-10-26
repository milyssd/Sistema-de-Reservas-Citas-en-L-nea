import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { ApiError, type Booking, type User } from '@reservas/api-client';
import {
  api,
  forgetSession,
  login,
  logout,
  refreshSession,
  register,
  restoreSession,
} from './src/session';
import { BookingFlow } from './src/BookingFlow';
import { BookingList } from './src/BookingList';
import { AccountScreen } from './src/AccountScreen';
import { disablePush, observeNotifications } from './src/native-actions';
import { Button, colors, errorMessage, Notice, styles } from './src/ui';

const roleLabels: Record<User['role'], string> = {
  CLIENT: 'Cliente',
  STAFF: 'Personal',
  ADMIN: 'Administración',
  OWNER: 'Propietario',
  SUPERADMIN: 'Administración de plataforma',
};
export default function App() {
  return (
    <SafeAreaProvider>
      <Agenda />
    </SafeAreaProvider>
  );
}

function Agenda() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'bookings' | 'reserve' | 'profile'>('bookings');
  const [editing, setEditing] = useState<Booking | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
    setTab('bookings');
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    restoreSession()
      .then((value) => {
        if (active) setUser(value);
      })
      .catch(async (reason) => {
        if (reason instanceof ApiError && reason.status === 401) await forgetSession();
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const receive = (url: string) => {
      const parsed = Linking.parse(url);
      const match = `${parsed.hostname || ''}/${parsed.path || ''}`.match(
        /(?:^|\/)booking\/([a-f0-9-]{36})$/i,
      );
      if (match) onSelect(match[1]);
    };
    void Linking.getInitialURL().then((url) => {
      if (url) receive(url);
    });
    const subscription = Linking.addEventListener('url', (event) => receive(event.url));
    return () => subscription.remove();
  }, [onSelect]);
  useEffect(() => {
    if (!user) return;
    return observeNotifications(onSelect, () => setRevision((value) => value + 1));
  }, [user?.id, onSelect]);
  useEffect(() => {
    if (!user) return;
    const renew = () =>
      refreshSession()
        .then((result) => setUser(result.user))
        .catch(async (reason) => {
          if (reason instanceof ApiError && reason.status === 401) {
            await forgetSession();
            setUser(null);
          }
          setError(errorMessage(reason));
        });
    const timer = setInterval(renew, 13 * 60_000);
    const state = AppState.addEventListener('change', (next) => {
      if (next === 'active') void renew();
    });
    return () => {
      clearInterval(timer);
      state.remove();
    };
  }, [user?.id]);
  const signOut = async () => {
    let failed = false;
    try {
      await disablePush();
    } catch {
      failed = true;
    }
    try {
      await logout();
    } catch {
      failed = true;
    }
    setUser(null);
    setSelectedId(null);
    setEditing(undefined);
    setError('');
    setTab('bookings');
    if (failed)
      Alert.alert(
        'Sesión local cerrada',
        'No se pudo completar la revocación remota. Cuando recuperes conexión, revisa las sesiones y dispositivos en tu cuenta.',
      );
  };
  const done = (booking: Booking) => {
    setEditing(undefined);
    onSelect(booking.id);
    Alert.alert(
      'Cita guardada',
      `Código ${booking.code}. ${booking.status === 'PENDING' ? 'Revisa el anticipo o la aprobación pendiente en tu agenda.' : 'Tu horario está confirmado.'}`,
    );
  };
  if (!ready)
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.blue} accessibilityLabel="Cargando sesión" />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>AGENDA ABIERTA · BOLIVIA</Text>
        <Text style={styles.title}>
          {user ? `Hola, ${user.name.split(' ')[0]}` : 'Tu tiempo, en orden.'}
        </Text>
        <Text style={styles.text}>
          {user ? roleLabels[user.role] : 'Reserva, organiza y recuerda tus citas.'}
        </Text>
      </View>
      {error ? <Notice error>{error}</Notice> : null}
      {!user ? (
        <LoginScreen
          onLogin={(value) => {
            setUser(value);
            setError('');
          }}
        />
      ) : (
        <>
          <View accessibilityRole="tablist" style={styles.tabs}>
            {(
              [
                { key: 'bookings', label: user.role === 'CLIENT' ? 'Mis citas' : 'Mi agenda' },
                { key: 'reserve', label: 'Reservar' },
                { key: 'profile', label: 'Mi cuenta' },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === item.key }}
                onPress={() => {
                  if (item.key === 'reserve') setEditing(undefined);
                  setTab(item.key);
                }}
                style={[styles.tab, tab === item.key && styles.tabActive]}
              >
                <Text style={styles.tabText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          {tab === 'reserve' ? (
            <BookingFlow
              key={editing?.id || 'new'}
              user={user}
              booking={editing}
              onDone={done}
              onBack={() => setTab('bookings')}
            />
          ) : tab === 'profile' ? (
            <AccountScreen
              user={user}
              onLogout={signOut}
              onName={(name) => setUser((value) => value && { ...value, name })}
              onBooking={onSelect}
            />
          ) : (
            <BookingList
              user={user}
              revision={revision}
              selectedId={selectedId}
              onSelect={onSelect}
              onReserve={() => {
                setEditing(undefined);
                setTab('reserve');
              }}
              onReschedule={(booking) => {
                setEditing(booking);
                setTab('reserve');
              }}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+591');
  const [totpCode, setTotpCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const user =
        mode === 'register'
          ? await register({
              name,
              email: email.trim().toLowerCase(),
              phone,
              password,
              platform: 'mobile',
            })
          : await login(email, password, totpCode || undefined);
      setPassword('');
      onLogin(user);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Ingresar a mi cuenta' : 'Crear mi cuenta'}
        </Text>
        {error ? <Notice error>{error}</Notice> : null}
        {notice ? <Notice>{notice}</Notice> : null}
        {mode === 'register' ? (
          <>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              accessibilityLabel="Nombre"
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
            <Text style={styles.label}>Celular WhatsApp (+591)</Text>
            <TextInput
              accessibilityLabel="Celular"
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </>
        ) : null}
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          accessibilityLabel="Correo electrónico"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Text style={styles.label}>
          Contraseña{mode === 'register' ? ' (12 caracteres, mayúscula, minúscula y número)' : ''}
        </Text>
        <TextInput
          accessibilityLabel="Contraseña"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onSubmitEditing={() => void submit()}
        />
        {mode === 'login' ? (
          <>
            <Text style={styles.label}>Código 2FA, si lo activaste</Text>
            <TextInput
              accessibilityLabel="Código de autenticación"
              style={styles.input}
              value={totpCode}
              onChangeText={setTotpCode}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
            />
          </>
        ) : null}
        <Button disabled={busy || !email || !password} onPress={() => void submit()}>
          {busy ? 'Guardando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
        </Button>
        <Button
          secondary
          disabled={busy}
          onPress={() => {
            setMode((value) => (value === 'login' ? 'register' : 'login'));
            setError('');
          }}
        >
          {mode === 'login' ? 'Crear una cuenta' : 'Ya tengo una cuenta'}
        </Button>
        {mode === 'login' ? (
          <Button
            secondary
            disabled={busy || !email}
            onPress={() => {
              setBusy(true);
              setError('');
              void api
                .request<{ message: string }>('/auth/forgot-password', {
                  method: 'POST',
                  body: { email: email.trim().toLowerCase() },
                })
                .then((result) => setNotice(result.message))
                .catch((reason) => setError(errorMessage(reason)))
                .finally(() => setBusy(false));
            }}
          >
            Recuperar contraseña por correo
          </Button>
        ) : (
          <Text style={styles.caption}>
            Recibirás un correo para verificar tu dirección. La cuenta sirve también para la web del
            negocio.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
