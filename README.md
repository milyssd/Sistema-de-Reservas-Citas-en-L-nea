# Agenda abierta

Sistema de reservas API-first para negocios de Bolivia. Monorepo TypeScript: NestJS, Next.js 16, Expo 58 y Prisma/MySQL. Moneda BOB, interfaz en español y zona predeterminada `America/La_Paz`. La API concentra permisos, disponibilidad, precios y acceso a datos.

## Estructura

```text
apps/api          API REST /api/v1, motor de turnos, autenticación y tareas
apps/web          Sitio de reservas, cuenta y panel de gestión
apps/mobile       Expo: autenticación y citas
packages/shared   Validaciones Zod, tipos y constantes
packages/api-client  Contrato OpenAPI y cliente compartido
scripts           Preparación del desarrollo local
deployment        PM2, Nginx y Cloudflare Tunnel
docs              Arquitectura, diseño, seguridad y despliegue
```

## Requisitos

Node.js 24 (versión en `.node-version`), pnpm 11.25 y Docker con Compose. MySQL 8.4 es obligatorio. Redis es opcional para desarrollo. Se puede utilizar una instancia MySQL existente indicando `DATABASE_URL`.

## Primera ejecución

```bash
git clone https://github.com/milyssd/Sistema-de-Reservas-Citas-en-L-nea.git
cd Sistema-de-Reservas-Citas-en-L-nea
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
node scripts/setup-local.mjs
docker compose up -d --wait mysql
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm build
```

`setup-local.mjs` crea únicamente archivos de entorno ausentes. Genera claves aleatorias locales y nunca las imprime. La contraseña inicial está en `apps/api/.env`, variable `ADMIN_PASSWORD`; el correo local inicial es `admin@agenda.local`. Estos archivos se excluyen de Git. Para un servidor real, configura tus propios valores siguiendo los ejemplos de cada aplicación. El seed requiere las credenciales por variables de entorno y no debe restablecer contraseñas existentes.

Inicia cada proceso en una terminal:

```bash
pnpm --filter @reservas/api dev
pnpm --filter @reservas/web dev
pnpm --filter @reservas/api worker
```

API: puerto 3001; web: puerto 3000. Swagger se sirve solo en desarrollo. Los endpoints `/health` y `/ready` comprueban proceso y conexión a base de datos. En esta interfaz de configuración del entorno no se proporcionan vistas previas de localhost.

Para móvil, ajusta `EXPO_PUBLIC_API_URL` a una dirección de tu servidor accesible desde el teléfono y ejecuta:

```bash
pnpm --filter @reservas/mobile dev
```

## Comandos

| Comando                    | Propósito                                               |
| -------------------------- | ------------------------------------------------------- |
| `pnpm dev`                 | API y web en modo desarrollo                            |
| `pnpm build`               | Compilar paquetes, API, web y exportar Android          |
| `pnpm lint`                | Revisar TypeScript y JavaScript                         |
| `pnpm typecheck`           | Comprobar los tipos de todos los proyectos              |
| `pnpm test`                | Pruebas unitarias                                       |
| `pnpm test:integration`    | Integración con MySQL, permisos y concurrencia          |
| `pnpm test:e2e`            | Flujo de reserva en navegador; requiere API y seed      |
| `pnpm db:migrate`          | Aplicar migraciones versionadas                         |
| `pnpm db:seed`             | Datos demostrativos e identidad inicial                 |
| `pnpm api:generate-client` | Regenerar tipos desde el OpenAPI de la API en ejecución |

El cliente generado está versionado; solo hay que regenerarlo cuando cambia el contrato. El build no debe depender de una API en ejecución.

## Configuración y despliegue

Consulta los `.env.example` de la raíz y de cada aplicación, así como las guías en `docs/` y las configuraciones de `deployment/`. No expongas MySQL ni Redis a Internet. Nginx recibe tráfico del túnel; PM2 ejecuta API, web y worker como procesos separados. La publicación en GitHub y el despliegue en un servidor requieren acciones independientes: crear los archivos en este espacio no los publica.

La v1 selecciona el negocio público mediante `BUSINESS_ID`; la identidad autenticada determina el negocio y el alcance de cada operación privada. Todos los importes se expresan en bolivianos; las fechas de la API están en UTC y la web las convierte según la sede.

## Desarrollo y cambios

Usa commits convencionales, por ejemplo `feat(bookings): permite reprogramar una cita`. Husky y lint-staged formatean los archivos preparados para commit. GitHub Actions ejecuta controles de calidad contra MySQL. No se incluyen cuentas de clientes reales ni credenciales de producción.

## Resultado de la validación

Consulta [VALIDATION.md](docs/VALIDATION.md) para pruebas ejecutadas y [alcance.md](docs/alcance.md) para límites. Se completaron las reservas con varios profesionales, la protección adaptativa de invitados, BullMQ, los reembolsos parciales y los flujos móviles. El aviso restante de una herramienta de Expo tiene un parche local documentado en [DEPENDENCY-SECURITY.md](docs/DEPENDENCY-SECURITY.md); el registro de auditoría sigue mostrando la versión upstream afectada. Las credenciales del negocio, la firma móvil y la validación del servidor real se configuran al desplegar.

En este entorno de nube, ejecutar `source scripts/cloud-env.sh` antes de comandos Prisma o pnpm. `scripts/cloud-install.sh` reproduce la instalación y reutiliza un motor de migraciones compilado desde el commit oficial de Prisma 6.19; no se desactivó TLS ni la comprobación de integridad.
