'use client';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/types';
import { useAuth } from './providers';
export function DeleteAccount({ onClose }: { onClose: () => void }) {
  const { logout } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      await api.request('/users/me', {
        method: 'DELETE',
        body: { password: data.get('password'), confirm: 'ELIMINAR' },
      });
      await logout();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="dialog-backdrop">
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        <h2 id="delete-account-title">Eliminar mi cuenta</h2>
        <p>
          Se cerrarán tus sesiones y se anonimizarán tus datos. Los registros contables necesarios
          se conservarán sin tu información personal.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={submit}>
          <label>
            Contraseña actual
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" required />
            Confirmo que quiero eliminar mi cuenta.
          </label>
          <div className="button-row">
            <button className="button danger" disabled={busy}>
              Eliminar definitivamente
            </button>
            <button className="button secondary" type="button" onClick={onClose}>
              Conservar mi cuenta
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
