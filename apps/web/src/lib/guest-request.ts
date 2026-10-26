import { ApiError, type RequestOptions } from '@reservas/api-client';
import { api } from './api';
type Challenge = { token: string; difficulty: number; expiresAt: string };
async function solve(challenge: Challenge, signal?: AbortSignal): Promise<string> {
  if (!window.isSecureContext || !crypto.subtle)
    throw new Error('Abre el sitio con una conexión segura para verificar tu solicitud.');
  return new Promise((resolve, reject) => {
    const worker = new Worker('/proof-worker.js');
    const abort = () => {
      worker.terminate();
      reject(new DOMException('Solicitud cancelada', 'AbortError'));
    };
    const cleanup = () => {
      worker.terminate();
      signal?.removeEventListener('abort', abort);
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }: { data: { nonce?: string; error?: string } }) => {
      cleanup();
      if (data.nonce !== undefined) resolve(data.nonce);
      else reject(new Error(data.error || 'No pudimos verificar la solicitud.'));
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error('No pudimos verificar la solicitud. Vuelve a intentar.'));
    };
    worker.postMessage(challenge);
  });
}
export async function guestRequest<T>(
  path: string,
  options: RequestOptions,
  onVerification: (running: boolean) => void,
): Promise<T> {
  try {
    return await api.request<T>(path, options);
  } catch (error) {
    if (!(error instanceof ApiError) || error.problem.code !== 'GUEST_CHALLENGE_REQUIRED')
      throw error;
    const challenge = (error.problem as typeof error.problem & { challenge?: Challenge }).challenge;
    if (!challenge) throw error;
    onVerification(true);
    try {
      const nonce = await solve(challenge, options.signal || undefined);
      const headers = new Headers(options.headers);
      headers.set('X-Guest-Challenge', challenge.token);
      headers.set('X-Guest-Nonce', nonce);
      return await api.request<T>(path, { ...options, headers });
    } finally {
      onVerification(false);
    }
  }
}
