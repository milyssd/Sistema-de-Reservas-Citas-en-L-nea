# Dependencias y correcciones verificables

Revisión del 26 de octubre de 2026. Las versiones mantenidas sustituyen las líneas antiguas que presentaban avisos: web Next.js 16.4.3 con React 19.3.1; móvil Expo 58.0.19/React Native 0.88.0 con los módulos de su `bundledNativeModules.json`. La API usa NestJS 11, Express 5 y Zod 4. Las versiones exactas están en los manifests y `pnpm-lock.yaml`.

## Dependencias transitivas

Los overrides están limitados a los consumidores/líneas afectados y se documentan en `pnpm-workspace.yaml`. Prisma config usa deepmerge-ts 8.0.2 con generación, validación y migraciones comprobadas. Expo CLI 58.1.15 usa Zod 4.6.7 mediante un override específico; las pruebas ejercitan sus módulos reales de validación. No se cambian checksums ni se desactiva la verificación de paquetes/TLS.

Expo SDK 58 elimina la cadena antigua de image-size reportada en SDK 54. Se verificaron TypeScript, lint y export Android usando la versión instalada de React Native 0.88.0 y el conjunto de módulos compatible con ese SDK.

## Aviso de node-forge y parche local

La auditoría de producción conserva **un aviso alto**, `node-forge` 1.4.0 (`GHSA-86w9-cpqp-85rv`), utilizado por herramientas de Expo CLI para certificados/firmas. Al revisar no existe una versión oficial publicada que corrija ese aviso. La auditoría no se presenta como limpia y no se usa una exclusión para ocultarlo.

Se aplicó `patches/node-forge@1.4.0.patch` mediante `pnpm.patchedDependencies`. El paquete original se obtiene con la integridad del lockfile; después se aplica el parche versionado. La corrección rechaza estructuras ASN.1 DigestAlgorithm malformadas, conserva los algoritmos admitidos y no relaja ninguna validación.

La regresión se reprodujo contra el paquete original y se probaron el rechazo tras el parche y la interoperabilidad con Node/OpenSSL. Cuatro pruebas de tooling verifican esos casos y los consumidores reales de Zod en Expo CLI. Detalles, origen y límites en `../patches/README.md`. Este es un parche local mantenido por el proyecto, no una publicación corregida upstream; reemplazarlo y repetir las pruebas cuando exista una versión oficial.

## Repetir la revisión

```sh
pnpm audit --prod
pnpm test:tooling
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm --filter @reservas/mobile build --max-workers 2
```

`pnpm audit --prod` sigue devolviendo un resultado no limpio por la versión de node-forge, aun con el parche aplicado. Guardar el resultado correspondiente al commit que se despliegue. Las pruebas funcionales, Lighthouse y el parche no son una certificación general de seguridad. Las credenciales de firma, certificados y configuración de paquetes deben provenir del operador y de fuentes de confianza.
