# Validación de la entrega

Comprobaciones locales del 26 de octubre de 2026 sobre Node 24.19.0, pnpm 11.25.0, MySQL 8.4 y Redis 7.4. La entrega usa Next.js 16.4.3/React 19.3.1 y Expo 58/React Native 0.88. Estos resultados describen esta máquina; no atribuyen ejecuciones a GitHub Actions, al servidor del usuario ni a un teléfono.

**120 pruebas aprobadas, sin omisiones:** 46 unitarias/de tooling, 67 de integración y 7 end-to-end de navegador.

| Comprobación                 | Resultado                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Instalación y lockfile       | Completada; integridad de paquetes y TLS conservadas                                                                                                                     |
| Prisma validate/generate     | Aprobados; cliente oficial con adaptador MariaDB/MySQL                                                                                                                   |
| Migraciones y seed           | Migraciones aplicadas/repetidas; seed idempotente sin sobrescribir contraseñas                                                                                           |
| Lint y TypeScript            | Aprobados en el monorepo                                                                                                                                                 |
| Build API y web              | Aprobados con la versión final de Next.js 16                                                                                                                             |
| Unitarias API                | 22 aprobadas: motor, políticas, límites, ocupación y adaptadores                                                                                                         |
| Unitarias cliente compartido | 4 aprobadas: autenticación, errores y reintentos idempotentes                                                                                                            |
| Unitarias móvil              | 16 aprobadas: sesiones/almacenamiento seguro, reservas persistentes, calendario, recordatorios y registro push simulado                                                  |
| Tooling                      | 4 aprobadas: regresión ASN.1, interoperabilidad criptográfica y consumidores reales de esquemas de Expo CLI                                                              |
| Integración MySQL/Redis      | 67 aprobadas: auth, permisos/IDOR, concurrencia, multi-profesional, holds, pagos/devoluciones, comprobantes, PoW y colas                                                 |
| Playwright Chromium móvil    | 7 aprobadas en un agregado de 17.2 s: reserva/gestión, permisos, panel de 13 secciones, PWA offline, profesionales encadenados, PoW real y devolución parcial con ledger |
| Lighthouse móvil             | **Rendimiento 96, accesibilidad 100, buenas prácticas 100, SEO 100**, medido en el build final el 26/10/2026 a las 07:30 (America/La_Paz)                                |
| Consola pública              | Sin errores JavaScript ni respuestas HTTP fallidas durante la medición final                                                                                             |
| Expo Android                 | Export Metro final aprobado: 725 módulos, bundle Hermes de 2 MB; no ejecutado en hardware                                                                                |
| Configuración Expo           | SDK 58, scheme, identificador Android y plugins nativos comprobados                                                                                                      |
| Cliente OpenAPI              | Generado desde API real; login móvil, listado y logout ejecutados con el cliente tipado                                                                                  |
| HTTP funcional               | health, ready, catálogo, disponibilidad, idempotencia y gestión segura                                                                                                   |
| Nginx                        | nginx -t aprobado con Nginx 1.28 Alpine; listener privado para el túnel                                                                                                  |
| Auditoría de producción      | Un aviso alto de versión en node-forge de Expo CLI; parche local aplicado y probado, sin ocultar el aviso                                                                |

## Casos relevantes

La prueba de concurrencia envió 12 solicitudes al mismo turno y obtuvo exactamente una reserva. Seis reintentos simultáneos con la misma clave devolvieron la misma reserva. Las pruebas cubren zonas IANA/DST, medianoche, buffers, feriados, capacidad, corte de cancelación, expiración, reasignaciones y conservación de snapshots.

Los servicios encadenados bloquean los recursos en orden, retienen todas las etapas y respetan horarios/precios por profesional. El acceso STAFF se limita a sus segmentos y diferencia las citas compartidas que debe coordinar administración. Los pagos prueban devoluciones parciales idempotentes, prohibición de sobredevolución y conservación del precio original.

El worker se probó con MySQL y Redis reales, BullMQ y el adaptador node-cron/DB. Un servidor SMTP TLS local verificó certificados, entrega de plantillas y reintentos tras errores temporales. Web Push/Expo se probaron con transporte simulado; no se afirma entrega a un proveedor externo sin sus credenciales.

Las pruebas móviles verifican que una respuesta de reserva perdida conserva el mismo cuerpo y clave tras reiniciar la app; un doble toque no inicia dos envíos; una renovación tardía no restaura una sesión cerrada. Calendario y notificaciones nativas se prueban mediante adaptadores simulados. El export Metro no sustituye la instalación y aceptación en Android/iOS.

## Repetir

En este entorno, ejecutar `source scripts/cloud-env.sh`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `REDIS_URL=redis://127.0.0.1:6379 pnpm test:integration` y `pnpm build`. Con API y web iniciadas, ejecutar `pnpm test:e2e`. Las pruebas de integración crean y limpian negocios aislados. `node scripts/verify-http.mjs` crea y cancela una reserva de prueba en el negocio público de desarrollo.

El motor nativo de Prisma se compiló desde `prisma/prisma-engines` commit `2ba551f319ab1df4bc874a89965d8b3641056773`, con Rust 1.90.0 y `cargo --locked`; coincide con Prisma 6.19. Las migraciones finales usan ese motor sin alterar sus verificaciones. Las tareas posteriores reutilizan la instalación preparada.

Consultar `DEPENDENCY-SECURITY.md` para el aviso upstream pendiente y su parche local. La publicación del código, la publicación del entorno y el despliegue del servidor/túnel son acciones distintas. Los certificados APNs/FCM, la entrega push real, la prueba en hardware y la aceptación del servidor del operador requieren ese entorno y sus credenciales.
