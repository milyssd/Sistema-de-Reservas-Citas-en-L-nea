# API de reservas

NestJS 11.2.8, Express 5 y Prisma 6 con MySQL. La validación compartida utiliza Zod 4.6.7 y la documentación de entradas se genera con su API oficial `toJSONSchema`. Ejecutar desde la raíz `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`; luego `pnpm --filter @reservas/api dev`. Variables documentadas en `.env.example`; el script local genera valores privados de desarrollo.

`/api/v1` contiene el contrato común web/móvil. Swagger y `/docs-json` están habilitados únicamente fuera de producción. `/health` valida el proceso; `/ready` comprueba MySQL y Redis cuando está configurado. Iniciar el worker en otro proceso: `pnpm --filter @reservas/api worker`.

La configuración Prisma usa el cliente JavaScript oficial y el adaptador MariaDB compatible con MySQL. Las migraciones versionadas utilizan el motor nativo de Prisma. Los procedimientos del entorno de nube se guardan aparte de los archivos de producción.

El negocio público se fija con `BUSINESS_ID`. Los guards resuelven la identidad desde la base de datos y restringen negocio, rol y propietario. Los precios y políticas se resuelven exclusivamente aquí. Las reservas y pagos exigen `Idempotency-Key`; los cambios exigen `If-Match` con la versión vigente.

El outbox persistente funciona sin Redis en desarrollo. Producción exige Redis para limitar solicitudes de forma compartida entre instancias; el worker es independiente y usa reclamaciones de mensajes en MySQL. Consulta `docs/DEPLOYMENT.md`, `docs/SECURITY-SCALING.md` y `docs/alcance.md` para canales, credenciales opcionales y alcance verificado.

## Protección adaptativa de reservas de invitados

Las primeras ocho solicitudes de hold o nueva reserva por IP en quince minutos no requieren pasos adicionales. Después, la API responde `403 application/problem+json` con `code: GUEST_CHALLENGE_REQUIRED` y una extensión `challenge`. El cliente calcula SHA-256 de `token:nonce` en UTF-8 hasta obtener la cantidad indicada de bits iniciales cero, y reintenta el mismo JSON con `X-Guest-Challenge` y `X-Guest-Nonce`. Debe conservar exactamente `Idempotency-Key` en reservas. El desafío está firmado y vinculado al negocio, IP, acción, contenido y clave de idempotencia; expira a los dos minutos y sólo se consume una vez, mediante una restricción única en MySQL. Los reintentos idempotentes que ya tienen respuesta conservada no vuelven a consumir la prueba.

`POST /api/v1/anti-abuse/challenge` acepta `{ action: "BOOK" | "HOLD", payload: objetoOriginal, idempotencyKey?: string }` y permite renovar un desafío expirado. Se limita a doce emisiones por IP en cinco minutos. Los códigos `GUEST_PROOF_INVALID`, `GUEST_PROOF_EXPIRED` y `GUEST_PROOF_REPLAYED` distinguen las verificaciones rechazadas. La configuración opcional está en `.env.example`; producción comparte los contadores mediante Redis y todos los procesos comparten la protección contra reutilización de MySQL. Una identidad autenticada mediante el guard conserva los límites normales de IP/usuario y no recibe pruebas de trabajo.
