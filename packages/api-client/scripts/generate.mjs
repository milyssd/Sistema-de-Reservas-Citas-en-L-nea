import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';

const source = process.env.OPENAPI_URL || 'http://127.0.0.1:3001/docs-json';
const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error(`OpenAPI respondió HTTP ${response.status}`);
const document = await response.json();
if (!document.openapi || !Object.keys(document.paths || {}).length) {
  throw new Error('El contrato OpenAPI no contiene endpoints. Inicia la API en desarrollo.');
}
const schema = astToString(await openapiTS(document));
await writeFile(
  fileURLToPath(new URL('../openapi.json', import.meta.url)),
  `${JSON.stringify(document, null, 2)}\n`,
);
await writeFile(
  fileURLToPath(new URL('../src/schema.d.ts', import.meta.url)),
  `/** Generado desde OpenAPI. Ejecutar pnpm api:generate-client. */\n${schema}`,
);
console.log(`Contrato generado: ${Object.keys(document.paths).length} rutas.`);
