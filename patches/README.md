# Parches de dependencias de desarrollo

## node-forge 1.4.0 — GHSA-86w9-cpqp-85rv

Aviso: https://github.com/advisories/GHSA-86w9-cpqp-85rv

Expo CLI utiliza `node-forge` para tareas de certificados y firmas. La versión
publicada 1.4.0 permite elementos adicionales dentro de `DigestAlgorithm` al
verificar firmas RSA PKCS#1 v1.5. Su validador ASN.1 comprueba los elementos
esperados, pero permite hijos sobrantes y puede omitir un elemento opcional que
no coincide.

El parche local añade dos comprobaciones en `lib/rsa.js`:

1. `AlgorithmIdentifier` contiene exactamente el OID y, cuando está presente,
   un único parámetro NULL.
2. El parámetro NULL tiene contenido vacío, como exige ASN.1 DER.

Se conserva la aceptación de SHA con parámetros ausentes. El parche no cambia
claves, algoritmos, comparaciones de resumen, comprobaciones de padding ni las
opciones de verificación. No modifica la versión declarada de la dependencia.

`pnpm` descarga y verifica el paquete original mediante la integridad del
lockfile, y después aplica el archivo versionado mediante `patchedDependencies`.
Este es un parche local, no una versión corregida publicada por upstream. El
auditor de versiones puede seguir señalando el aviso; no se añade una excepción
para ocultarlo. Sustituir el parche cuando exista una versión oficial corregida,
conservando las pruebas de regresión.

## Validación reproducible

```sh
node --test scripts/tooling-security.test.cjs
```

Las pruebas generan una clave RSA desechable y comprueban:

- Rechazo de NULL, OID o secuencias adicionales, parámetros que no coinciden y
  NULL con contenido. Las mismas firmas también son rechazadas por Node/OpenSSL.
- Interoperabilidad de firmas SHA-256, SHA-384 y SHA-512 entre Node y Forge.
- Compatibilidad de parámetros SHA ausentes y rechazo de resúmenes incorrectos.
- Los dos módulos de esquemas de Expo CLI con su dependencia Zod instalada:
  plugins, parámetros MCP, tipos de salida y errores de validación.

La prueba de ASN.1 falla contra `node-forge` 1.4.0 sin parche. Para reproducir
la comparación con una copia local de ese paquete original puede establecerse
`FORGE_TEST_PACKAGE` a su directorio; no se usa esa variable en CI.

## Override acotado de Zod de Expo CLI

Expo CLI 58.1.15 utiliza Zod en `DevToolsPlugin.schema.js` y
`createMCPDevToolsExtensionSchema.js`. Ambos utilizan APIs públicas compatibles
con Zod 4.6.7 (`object`, `string`, `enum`, `array`, `union`, `readonly`, `strict`,
`safeParse` y `error.issues`). El override se limita a ese consumidor y versión.
La prueba verifica estos módulos reales y exige revisar la compatibilidad si una
nueva versión añade otros módulos que consuman Zod.

El servidor MCP remoto opcional de Expo no se instala ni habilita en este
proyecto; sus integraciones externas requieren su propia validación al activarse.
