'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, API_URL, authHeaders } from '@/lib/api';
import { money, errorMessage } from '@/lib/types';
export function PaymentForm({
  bookingId,
  amount,
  token,
}: {
  bookingId: string;
  amount: number;
  token?: string;
}) {
  const [instructions, setInstructions] = useState<{ details?: Record<string, string> } | null>(
    null,
  );
  const [method, setMethod] = useState('QR');
  const [payment, setPayment] = useState<{ id: string; version: number } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  const instructionLabels: Record<string, string> = {
    bank: 'Banco',
    banco: 'Banco',
    beneficiary: 'Titular',
    titular: 'Titular',
    accountNumber: 'Número de cuenta',
    cuenta: 'Número de cuenta',
    instructions: 'Indicaciones',
    indicaciones: 'Indicaciones',
  };
  const headers: Record<string, string> = token ? { 'X-Booking-Token': token } : {};
  useEffect(() => {
    api
      .request<{ details?: Record<string, string> }>('/payments/instructions')
      .then(setInstructions)
      .catch(() => {});
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const file = new FormData(event.currentTarget).get('file');
    try {
      const current =
        payment ||
        (await api.request<{ id: string; version: number }>('/payments', {
          method: 'POST',
          headers: { ...headers, 'Idempotency-Key': key.current },
          body: { bookingId, amount, method },
        }));
      setPayment(current);
      if (file instanceof File && file.size) {
        const body = new FormData();
        body.append('file', file);
        const response = await fetch(`${API_URL}/payments/${current.id}/receipt`, {
          method: 'POST',
          credentials: 'include',
          headers: { ...authHeaders(), ...headers, 'If-Match': String(current.version) },
          body,
        });
        if (!response.ok) {
          const problem = await response.json();
          throw new Error(problem.detail || problem.message || 'No se pudo cargar el comprobante.');
        }
        setPayment(await response.json());
      }
      setMessage('Pago registrado. El negocio revisará el comprobante y confirmará tu anticipo.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="resource-editor">
      <h3>Registra tu anticipo · {money(amount)}</h3>
      {instructions?.details && (
        <div>
          {Object.entries(instructions.details).map(
            ([key, value]) =>
              typeof value === 'string' &&
              value.trim() !== '' &&
              (key === 'qrUrl' || Boolean(instructionLabels[key])) &&
              (key === 'qrUrl' && /^https?:\/\//.test(value) ? (
                <figure key={key}>
                  <img src={value} width={220} height={220} alt="Código QR de pago del negocio" />
                  <figcaption>Escanea el QR desde tu aplicación bancaria.</figcaption>
                </figure>
              ) : (
                <p key={key}>
                  <strong>{instructionLabels[key]}: </strong>
                  {value}
                </p>
              )),
          )}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message ? (
        <p className="notice" role="status">
          {message}
        </p>
      ) : (
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              Método de pago
              <select
                value={method}
                disabled={Boolean(payment)}
                onChange={(event) => setMethod(event.target.value)}
              >
                <option value="QR">QR</option>
                <option value="TRANSFER">Transferencia bancaria</option>
                <option value="CASH">Pago en el local</option>
              </select>
            </label>
            <label>
              Comprobante (JPG, PNG o WebP, hasta 5 MB)
              <input
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required={method !== 'CASH'}
              />
            </label>
          </div>
          <button className="button" style={{ marginTop: 16 }} disabled={busy}>
            {busy
              ? 'Registrando…'
              : method === 'CASH'
                ? 'Registrar pago en el local'
                : 'Enviar comprobante'}
          </button>
          <p className="fine-print">
            Registrar un pago no lo confirma automáticamente. El negocio verifica su recepción.
          </p>
        </form>
      )}
    </section>
  );
}
