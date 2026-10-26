# Servidor local y publicación con Cloudflare Tunnel

La API, web, base de datos, almacenamiento de comprobantes y worker pertenecen al servidor del negocio. Cloudflare Tunnel publica HTTPS sin redirecciones de puertos en el router. El dominio y la cuenta de Cloudflare los configura el operador. Estas instrucciones son de despliegue: el repositorio no contiene credenciales del túnel ni ejecuta una publicación automáticamente.

## Preparar el servidor

1. Usar Linux con Node.js compatible con `.node-version`, pnpm de `packageManager`, MySQL 8 o MariaDB compatible y Nginx. Redis es obligatorio en producción para compartir los límites de solicitudes entre réplicas; configurar `REDIS_URL` apuntando a un servicio local protegido. El compose del repositorio se reserva para desarrollo.
2. Crear una cuenta de sistema sin privilegios para la aplicación y una base de datos exclusiva. Dar al usuario MySQL permisos sólo sobre esa base, nunca privilegios globales. Mantener MySQL/Redis accesibles sólo desde loopback o red privada controlada.
3. Clonar el repositorio en `/srv/agenda` y ejecutar `pnpm install --frozen-lockfile` desde esa carpeta. No ejecutar Node, PM2 o pnpm como root.
4. Copiar los `.env.example` de cada aplicación a sus `.env`. Restringir permisos con `chmod 600 apps/api/.env`. Nunca subir estos archivos a Git.
5. Elegir un UUID estable como `BUSINESS_ID`, un `JWT_SECRET` aleatorio de al menos 32 caracteres y `AUTH_ENCRYPTION_KEY` aleatoria de 32 bytes en hexadecimal para TOTP. Generarlos localmente; no usar las credenciales de pruebas. El seed inicial requiere las variables de administrador documentadas en `apps/api/.env.example`.
6. Configurar `WEB_ORIGIN=https://reservas.tudominio.bo`, `TRUSTED_PROXY_IPS=127.0.0.1,::ffff:127.0.0.1` y la URL pública de API en web/móvil. Usar `STORAGE_PATH=/srv/agenda-storage` fuera del checkout y de cualquier raíz pública. Crear esa carpeta con acceso sólo al usuario del proceso. El worker y las réplicas de API deben compartirla. Configurar `QUEUE_PREFIX` si varias instalaciones comparten Redis. Para un SMTP con CA privada, `SMTP_CA_FILE` debe apuntar a la CA confiable del operador y `SMTP_TLS_SERVERNAME` al nombre validado; nunca desactivar la verificación TLS.
7. Ejecutar `pnpm db:generate`, `pnpm db:migrate` y `pnpm db:seed`. El seed es idempotente para datos de ejemplo; revisar su comportamiento antes de volver a usarlo en una base con citas reales. Retirar las variables de contraseña inicial una vez creado el administrador.
8. Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test`, las pruebas de integración con base de pruebas dedicada y `pnpm build`. La exportación de Expo es una comprobación separada.

En producción, `NEXT_PUBLIC_*` se fija al compilar Next.js. Cambiar el dominio requiere reconstruir la web. El cliente móvil también debe compilarse con su URL pública. Ninguna variable de esta familia puede contener secretos.

## PM2 y Nginx

Instalar PM2 mediante su paquete oficial en la cuenta de despliegue o usar una instalación de sistema administrada. Desde `/srv/agenda`:

```sh
pm2 start deployment/ecosystem.config.cjs
pm2 status
curl --fail http://127.0.0.1:3001/health
curl --fail http://127.0.0.1:3001/ready
pm2 save
pm2 startup
```

`pm2 startup` imprime el comando exacto que el administrador debe ejecutar para su sistema; seguirlo y volver a guardar procesos. API: cluster con dos procesos por defecto (`API_INSTANCES` lo cambia). Web: un proceso. Worker: un proceso separado con la misma configuración y directorio de trabajo de la API. No multiplicar workers antes de validar reclamación de tareas y recuperación de fallos.

Copiar `deployment/nginx.conf` dentro de un archivo incluido por el bloque `http` de Nginx, sustituir el dominio y verificar `sudo nginx -t` antes de recargar. El listener está ligado a `127.0.0.1:8080`. No añadir un listener público sin revisar la confianza de proxies. Las rutas SSE desactivan buffering. Swagger y los endpoints de salud internos no se publican.

Nginx aplica un límite compartido por IP a todas las réplicas. La API usa Redis para los límites compartidos en producción; el fallback en memoria se reserva a desarrollo. Los contadores de intentos de acceso y sesiones residen en MySQL.

## Cloudflare Tunnel

Instalar `cloudflared` desde el repositorio oficial para el sistema. Verificar las firmas del gestor de paquetes. En una terminal del operador:

```sh
cloudflared tunnel login
cloudflared tunnel create agenda-abierta
cloudflared tunnel route dns agenda-abierta reservas.tudominio.bo
```

Copiar `deployment/cloudflared.example.yml` a `/etc/cloudflared/config.yml`, sustituir el UUID y dominio, y colocar el JSON de credenciales en la ruta indicada. Este JSON debe permanecer fuera del repositorio y sólo ser legible por el servicio. Instalar el servicio con `sudo cloudflared --config /etc/cloudflared/config.yml service install` y revisar su estado con el gestor de servicios.

El único origen HTTP de Nginx es el túnel local. Nginx valida esa procedencia antes de interpretar `CF-Connecting-IP`, y transmite a la API la IP calculada. Bloquear los puertos 3000, 3001, 3306, 6379 y 8080 desde interfaces externas mediante el firewall del servidor. No se requiere abrir puertos entrantes en el router.

## Verificación después del despliegue

- Abrir el dominio HTTPS y confirmar cookies de refresh `Secure`, `HttpOnly` y `SameSite=Lax`.
- Crear una cuenta de prueba, reservar un turno, reintentar el mismo POST con su clave de idempotencia y verificar una sola reserva.
- Probar que otra cuenta no obtiene esa cita, sesiones o comprobante.
- Confirmar un pago manual como administrador y revisar el audit log.
- Comprobar SMTP/push con destinatarios autorizados. La cola conserva envíos pendientes cuando falta la configuración del proveedor; una fila pendiente no demuestra entrega.
- Reiniciar API/worker y comprobar que las citas y sesiones persisten, que los holds caducan y que los recordatorios no se pierden.
- Medir Lighthouse móvil sobre el dominio real. No asumir una puntuación sin medición.

## Actualizaciones y recuperación

Respaldar MySQL y `STORAGE_PATH` antes de migrar. Restaurar periódicamente una copia en un entorno aislado y ejecutar `/ready` más una reserva de prueba. Mantener las claves de cifrado y credenciales en un respaldo seguro independiente; no se pueden recuperar secretos TOTP si se pierde `AUTH_ENCRYPTION_KEY`.

Para actualizar: detener temporalmente nuevas operaciones mediante mantenimiento, respaldar, obtener un commit revisado, instalar con lockfile, generar Prisma, migrar y compilar. Ejecutar `pm2 reload deployment/ecosystem.config.cjs --update-env`. Volver a verificar una cita y un login. Una migración de base de datos no se revierte simplemente cambiando el commit: preparar un plan de reversión o restauración antes del cambio.
