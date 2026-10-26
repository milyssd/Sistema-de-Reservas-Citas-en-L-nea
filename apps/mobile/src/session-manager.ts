import type { AuthResult, User, RegisterRequest } from '@reservas/api-client';

export interface SessionStorage {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  remove(): Promise<void>;
}
export interface SessionTransport {
  register(body: RegisterRequest): Promise<AuthResult>;
  login(
    email: string,
    password: string,
    platform: 'mobile',
    totpCode?: string,
  ): Promise<AuthResult>;
  refresh(platform: 'mobile', token: string): Promise<AuthResult>;
  logout(platform: 'mobile', token: string): Promise<unknown>;
}

/** Una única rotación evita que dos peticiones consuman simultáneamente el mismo token. */
export function createSessionManager(storage: SessionStorage, transport: SessionTransport) {
  let accessToken: string | undefined;
  let rotation: Promise<AuthResult> | null = null;
  let generation = 0;
  async function save(result: AuthResult, expectedGeneration: number) {
    if (expectedGeneration !== generation) throw new Error('La sesión ya se cerró.');
    if (!result.refreshToken) throw new Error('La API no devolvió una sesión móvil.');
    await storage.write(result.refreshToken);
    if (expectedGeneration !== generation) {
      await storage.remove();
      throw new Error('La sesión ya se cerró.');
    }
    accessToken = result.accessToken;
    return result;
  }
  const refresh = () => {
    if (rotation) return rotation;
    const activeGeneration = generation;
    rotation = (async () => {
      const token = await storage.read();
      if (!token) throw new Error('Inicia sesión para continuar.');
      return save(await transport.refresh('mobile', token), activeGeneration);
    })().finally(() => {
      rotation = null;
    });
    return rotation;
  };
  async function forget() {
    generation++;
    accessToken = undefined;
    await storage.remove();
  }
  return {
    getAccessToken: () => accessToken,
    login: async (email: string, password: string, code?: string): Promise<User> => {
      const activeGeneration = ++generation;
      return (
        await save(
          await transport.login(email.trim().toLowerCase(), password, 'mobile', code),
          activeGeneration,
        )
      ).user;
    },
    register: async (body: RegisterRequest): Promise<User> => {
      const activeGeneration = ++generation;
      return (
        await save(await transport.register({ ...body, platform: 'mobile' }), activeGeneration)
      ).user;
    },
    restore: async (): Promise<User | null> =>
      (await storage.read()) ? (await refresh()).user : null,
    refresh,
    forget,
    logout: async () => {
      const token = await storage.read();
      await forget();
      if (token) await transport.logout('mobile', token);
    },
  };
}
