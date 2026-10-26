import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiRequire = createRequire(resolve(root, 'apps/api/package.json'));
const file = resolve(root, 'apps/api/.env');
const local = existsSync(file) ? apiRequire('dotenv').parse(readFileSync(file)) : {};
const env = {
  ...process.env,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || local.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || local.ADMIN_PASSWORD,
};
if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  throw new Error(
    'Las pruebas completas requieren ADMIN_EMAIL y ADMIN_PASSWORD del seed. No se imprimen sus valores.',
  );
}
const result = spawnSync('pnpm', ['--filter', '@reservas/web', 'test:e2e'], {
  cwd: root,
  env,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
