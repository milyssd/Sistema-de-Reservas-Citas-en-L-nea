'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setAccessToken } from '@/lib/api';
import type { User } from '@/lib/types';
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authenticate: (data: { accessToken: string; user: User }) => void;
  logout: () => Promise<void>;
};
let refreshPromise: Promise<{ accessToken: string; user: User }> | undefined;
function restoreSession() {
  if (!refreshPromise) {
    const request = () =>
      api.request<{ accessToken: string; user: User }>('/auth/refresh', {
        method: 'POST',
        body: {},
      });
    refreshPromise = (async () =>
      navigator.locks
        ? await navigator.locks.request('reservas-refresh', request)
        : await request())().finally(() => {
      refreshPromise = undefined;
    });
  }
  return refreshPromise!;
}
const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  authenticate: () => {},
  logout: async () => {},
});
export const useAuth = () => useContext(AuthContext);
export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authenticate = useCallback((data: { accessToken: string; user: User }) => {
    setAccessToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem('reservas-session', 'active');
  }, []);
  useEffect(() => {
    let live = true;
    const renew = async () => {
      try {
        if (!localStorage.getItem('reservas-session')) return;
        const result = await restoreSession();
        if (live) authenticate(result);
      } catch {
        if (live) {
          setAccessToken();
          setUser(null);
          localStorage.removeItem('reservas-session');
        }
      } finally {
        if (live) setLoading(false);
      }
    };
    void renew();
    const timer = setInterval(
      () => {
        void renew();
      },
      12 * 60 * 1000,
    );
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [authenticate]);
  async function logout() {
    try {
      await api.request('/auth/logout', { method: 'POST', body: {} });
    } finally {
      setAccessToken();
      setUser(null);
      localStorage.removeItem('reservas-session');
      localStorage.removeItem('reservas-offline');
      const device = localStorage.getItem('reservas-push-device');
      if (device) {
        localStorage.removeItem('reservas-push-device');
        const registration = await navigator.serviceWorker?.getRegistration();
        await (await registration?.pushManager.getSubscription())?.unsubscribe();
      }
    }
  }
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
      void navigator.serviceWorker.register('/sw.js');
  }, []);
  return (
    <AuthContext.Provider value={{ user, loading, authenticate, logout }}>
      {children}
      <CookieNotice />
    </AuthContext.Provider>
  );
}
function CookieNotice() {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(!localStorage.getItem('reservas-cookie-choice')), []);
  if (!open) return null;
  return (
    <aside className="cookie-notice" aria-label="Preferencias de cookies">
      <p>
        Usamos cookies esenciales para mantener tu sesión. No usamos publicidad ni analítica.{' '}
        <a href="/cookies">Ver política</a>
      </p>
      <button
        className="button small"
        onClick={() => {
          localStorage.setItem('reservas-cookie-choice', 'essential');
          setOpen(false);
        }}
      >
        Entendido
      </button>
    </aside>
  );
}
