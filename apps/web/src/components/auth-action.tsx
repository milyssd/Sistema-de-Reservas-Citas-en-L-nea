'use client';
import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/types';
export function AuthAction({ kind }: { kind: 'reset' | 'verify' }) {
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => setToken(new URLSearchParams(window.location.search).get('token') || ''), []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const data = new FormData(event.currentTarget);
      await api.request(`/auth/${kind === 'reset' ? 'reset-password' : 'verify-email'}`, {
        method: 'POST',
        body: { token, ...(kind === 'reset' ? { password: data.get('password') } : {}) },
      });
      setMessage(
        kind === 'reset'
          ? 'Contraseña actualizada. Ya puedes ingresar.'
          : 'Correo verificado. Gracias.',
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <section className="auth-card">
      <h1>{kind === 'reset' ? 'Recuperar contraseña' : 'Verificar correo'}</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message ? (
        <p className="notice">
          {message} <a href="/cuenta">Ingresar</a>
        </p>
      ) : (
        <form onSubmit={submit}>
          <label>
            Código de verificación
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              autoComplete="off"
            />
          </label>
          {kind === 'reset' && (
            <label>
              Nueva contraseña
              <input
                name="password"
                type="password"
                minLength={12}
                required
                autoComplete="new-password"
              />
              <small>12 caracteres mínimo; mayúscula, minúscula y número.</small>
            </label>
          )}
          <button className="button">
            {kind === 'reset' ? 'Guardar contraseña' : 'Verificar correo'}
          </button>
        </form>
      )}
    </section>
  );
}
