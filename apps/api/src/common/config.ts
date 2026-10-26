import { z } from 'zod';

const environment = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().startsWith('mysql://'),
  BUSINESS_ID: z.string().uuid(),
  JWT_SECRET: z.string().min(32),
  WEB_ORIGIN: z
    .string()
    .url()
    .refine(
      (value) => new URL(value).origin === value,
      'Use the exact origin without a path or trailing slash',
    )
    .default('http://localhost:3000'),
  AUTH_ENCRYPTION_KEY: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z
      .string()
      .regex(/^[a-f0-9]{64}$/i)
      .optional(),
  ),
  TRUSTED_PROXY_IPS: z.string().default(''),
  AUTH_REFRESH_DAYS: z.coerce.number().int().min(1).max(90).default(30),
});
export type AppConfig = z.infer<typeof environment>;
let config: AppConfig | undefined;
export function getConfig(): AppConfig {
  config ??= environment.parse(process.env);
  if (config.NODE_ENV === 'production' && !config.WEB_ORIGIN.startsWith('https://')) {
    throw new Error('WEB_ORIGIN must use HTTPS in production');
  }
  return config;
}
