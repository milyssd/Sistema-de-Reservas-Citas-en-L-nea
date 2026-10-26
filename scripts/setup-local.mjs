import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const secret = () => randomBytes(32).toString('hex');
function create(relative, content) {
  const path = resolve(root, relative);
  if (existsSync(path)) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, { mode: 0o600, flag: 'wx' });
  console.log(`Creado ${relative} (valores privados; no se muestran).`);
}
create('.env', `MYSQL_PASSWORD=${secret()}\nMYSQL_ROOT_PASSWORD=${secret()}\n`);
const vars = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
);
if (!vars.MYSQL_PASSWORD) throw new Error('Define MYSQL_PASSWORD en .env.');
create(
  'apps/api/.env',
  `NODE_ENV=development\nPORT=3001\nDATABASE_URL=mysql://reservas:${encodeURIComponent(vars.MYSQL_PASSWORD)}@127.0.0.1:3306/reservas\nBUSINESS_ID=11111111-1111-4111-8111-111111111111\nJWT_SECRET=${secret()}\nAUTH_ENCRYPTION_KEY=${secret()}\nWEB_ORIGIN=http://localhost:3000\nADMIN_EMAIL=admin@agenda.local\nADMIN_PASSWORD=Aa1!${secret()}\nSTORAGE_PATH=../../storage\n`,
);
create(
  'apps/web/.env.local',
  'NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n',
);
create('apps/mobile/.env', 'EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1\n');
console.log('Configuración local preparada. No usar estos archivos en producción.');
