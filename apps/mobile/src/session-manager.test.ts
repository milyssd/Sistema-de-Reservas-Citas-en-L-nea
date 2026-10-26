import { describe, expect, it, vi } from 'vitest';
import type { AuthResult } from '@reservas/api-client';
import { createSessionManager } from './session-manager';

const result: AuthResult = {
  accessToken: 'access-new',
  refreshToken: 'refresh-new',
  expiresIn: 900,
  user: { id: 'u1', businessId: 'b1', role: 'CLIENT', name: 'Prueba', email: 'test@example.test' },
};
function setup() {
  let stored: string | null = 'refresh-old';
  const storage = {
    read: vi.fn(async () => stored),
    write: vi.fn(async (value: string) => {
      stored = value;
    }),
    remove: vi.fn(async () => {
      stored = null;
    }),
  };
  const transport = {
    login: vi.fn(async () => result),
    register: vi.fn(async () => result),
    refresh: vi.fn(async () => result),
    logout: vi.fn(async () => undefined),
  };
  return { storage, transport, session: createSessionManager(storage, transport) };
}
describe('Sesiones móviles con almacenamiento seguro', () => {
  it('serializa renovaciones concurrentes y conserva el token rotado antes de usar el acceso', async () => {
    const { session, transport, storage } = setup();
    const [a, b, c] = await Promise.all([session.refresh(), session.refresh(), session.refresh()]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(transport.refresh).toHaveBeenCalledTimes(1);
    expect(transport.refresh).toHaveBeenCalledWith('mobile', 'refresh-old');
    expect(storage.write).toHaveBeenCalledWith('refresh-new');
    expect(session.getAccessToken()).toBe('access-new');
    await session.refresh();
    expect(transport.refresh).toHaveBeenLastCalledWith('mobile', 'refresh-new');
  });
  it('no reintenta una rotación cuya respuesta se perdió', async () => {
    const { session, transport, storage } = setup();
    transport.refresh.mockRejectedValue(new TypeError('Red desconectada'));
    await expect(session.refresh()).rejects.toThrow('Red desconectada');
    expect(transport.refresh).toHaveBeenCalledTimes(1);
    expect(storage.write).not.toHaveBeenCalled();
  });
  it('no expone acceso si falla la persistencia segura del token nuevo', async () => {
    const { session, storage } = setup();
    storage.write.mockRejectedValue(new Error('Keychain bloqueado'));
    await expect(session.refresh()).rejects.toThrow('Keychain bloqueado');
    expect(session.getAccessToken()).toBeUndefined();
  });
  it('borra la sesión local aunque falle la revocación remota', async () => {
    const { session, transport, storage } = setup();
    await session.refresh();
    transport.logout.mockRejectedValue(new Error('Sin conexión'));
    await expect(session.logout()).rejects.toThrow('Sin conexión');
    expect(await storage.read()).toBeNull();
    expect(session.getAccessToken()).toBeUndefined();
  });
  it('una renovación tardía nunca restaura una sesión cerrada', async () => {
    const { session, transport, storage } = setup();
    let complete!: (value: AuthResult) => void;
    transport.refresh.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const refreshing = session.refresh();
    await vi.waitFor(() => expect(transport.refresh).toHaveBeenCalledOnce());
    await session.logout();
    complete(result);
    await expect(refreshing).rejects.toThrow('La sesión ya se cerró.');
    expect(await storage.read()).toBeNull();
    expect(session.getAccessToken()).toBeUndefined();
  });
  it('el registro pide explícitamente tokens móviles y sólo persiste refresh', async () => {
    const { session, transport, storage } = setup();
    await session.register({
      name: 'Prueba',
      email: 'test@example.test',
      phone: '+59170123456',
      password: 'ExampleTestPass12',
    });
    expect(transport.register).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'mobile' }),
    );
    expect(storage.write).toHaveBeenCalledWith('refresh-new');
  });
});
