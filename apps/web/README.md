# Web · Agenda abierta

Next.js 16 App Router, React 19, TypeScript, Tailwind y fuentes locales. Consume únicamente la API REST compartida mediante `@reservas/api-client`; no conecta a Prisma ni contiene secretos.

Desde la raíz, configura `apps/web/.env.local` a partir de `.env.example` y ejecuta `pnpm --filter @reservas/web dev`. La API debe estar disponible en 3001 con `WEB_ORIGIN=http://localhost:3000`. En producción usa el mismo dominio y `NEXT_PUBLIC_API_URL=https://tu-dominio/api/v1`; las variables públicas quedan incorporadas durante `build`.

- `pnpm --filter @reservas/web build`: compilación de producción.
- `pnpm --filter @reservas/web typecheck`: comprobación TypeScript.
- `pnpm --filter @reservas/web test:e2e`: Playwright contra API, MySQL y web en ejecución; necesita el seed. No utiliza respuestas simuladas.
- `pnpm --filter @reservas/web start`: servidor de producción en 3000.

Rutas: `/` catálogo y reserva; `/reserva/:token` gestión privada; `/cuenta` acceso, citas, perfil y sesiones; `/panel` agenda, catálogo, CRM, pagos, políticas, reportes, usuarios y auditoría; `/verificar?token=...` y `/recuperar?token=...`; páginas legales y `/offline`.

El JWT de acceso vive en memoria, el refresh en cookie httpOnly y todos los formularios vuelven a validarse en la API. La PWA cachea recursos estáticos; nunca cachea respuestas de la API ni páginas privadas. Las citas sin conexión requieren guardado explícito y se borran al salir. El service worker se registra solo en producción. HTTPS es necesario fuera de localhost.

Diseño: “Agenda abierta”, editorial de agenda con franjas horarias y resumen fijo. Manrope para títulos y Source Sans 3 para lectura, seis colores declarados en `globals.css`, foco visible, movimiento reducido, formularios etiquetados y formatos `es-BO`/`America/La_Paz`. Las políticas legales deben personalizarse con el responsable y plazos reales antes de publicar.

La agenda y la disponibilidad reciben cambios por SSE, con reconexión y tokens solo en cabeceras. El arrastre de citas funciona en escritorio; en móvil y con teclado se utiliza el editor de horario. La cuenta y el enlace privado permiten cancelar y reprogramar; el historial permite volver a reservar los mismos servicios. Las suscripciones push se activan desde Notificaciones, con permiso explícito, cuando la API informa que VAPID está configurado. La puntuación Lighthouse debe medirse en el dominio de despliegue; no se presupone un resultado.

Para usar Chromium instalado en el sistema: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium pnpm --filter @reservas/web test:e2e`. Si no está disponible, instala el navegador de Playwright con `pnpm --filter @reservas/web exec playwright install chromium`.

La versión actual utiliza Next.js 16.4.3 y React 19.3.1 para mantener una línea con correcciones de seguridad. Las mutaciones se realizan en la API; `proxy.ts` rechaza solicitudes de Server Actions y el optimizador de imágenes está desactivado.

Cuando el negocio activa citas con varios profesionales, el formulario permite asignar un profesional por servicio. La API devuelve los tramos y el precio definitivo antes de confirmar. La agenda administra cada sede en su zona horaria. Los reembolsos parciales muestran el saldo disponible y conservan una clave de idempotencia para los reintentos.

Si la API detecta abuso en reservas de invitados, la verificación SHA-256 se resuelve en un Web Worker sin bloquear el formulario; la prueba se envía en cabeceras vinculadas a la solicitud. No se solicitan servicios de captcha externos.
