# Aplicación móvil · Agenda abierta

Aplicación nativa con Expo SDK 58, React 19.3.1 y React Native 0.88. Consume el mismo cliente generado OpenAPI y los mismos endpoints que la web.

## Funciones

- Registro, login, recuperación por correo, acceso con TOTP, refresh rotativo en SecureStore y cierre de sesiones.
- Reservar uno o varios servicios, elegir sede y profesionales por servicio cuando el negocio lo habilita, consultar turnos en la zona de la sede y retener el horario antes de confirmar.
- Crear reservas con clave de idempotencia persistida en almacenamiento seguro. Si la respuesta se pierde o la app se cierra, «Consultar resultado pendiente» reutiliza exactamente el cuerpo y la clave originales.
- Ver citas paginadas, reprogramar y cancelar con control de versión. STAFF ve su agenda diaria y puede marcar citas propias completadas o como inasistencia; las citas compartidas que requieren coordinación se gestionan por administración.
- Agregar una cita al calendario mediante el formulario del sistema y programar recordatorios locales 24 h y 2 h antes. Los recordatorios existentes se actualizan al reprogramar y se eliminan al cancelar.
- Activar push Expo explícitamente, recibir avisos de nuevas reservas, abrir la cita desde la notificación o desde `agendaabierta://booking/UUID`.
- Perfil, preferencias de notificación, bandeja paginada y sesiones activas. La agenda se actualiza al recibir avisos, al volver a la pantalla o mediante actualización manual.

## Ejecutar

1. Instalar desde la raíz con `pnpm install --frozen-lockfile`.
2. Copiar `.env.example` a `.env`. `EXPO_PUBLIC_API_URL` debe apuntar a la IP LAN del servidor o su dominio HTTPS; un teléfono no alcanza el localhost del servidor.
3. Iniciar MySQL, API y seed según el README raíz.
4. Ejecutar `pnpm --filter @reservas/mobile dev`. Para probar todas las integraciones, usar un development build SDK 58 en dispositivo; push remoto no funciona en Expo Go.
5. Registrarse desde la aplicación o usar la misma cuenta de la web. No hay contraseñas incorporadas.

Para compilar localmente, instalar Android Studio/JDK o Xcode y ejecutar `pnpm exec expo run:android` o `pnpm exec expo run:ios` desde esta carpeta. No se exige un servicio de compilación de pago. Un APK/IPA de distribución necesita la firma propia del operador.

## Push y calendario

`EXPO_PUBLIC_EAS_PROJECT_ID` es el ID público de un proyecto Expo. Android necesita el archivo de FCM mediante `GOOGLE_SERVICES_FILE`, apuntando a una ruta fuera del repositorio. iOS necesita las credenciales APNs y el identificador de aplicación correspondiente. Registrar estas credenciales con el proveedor antes de solicitar el token Expo; no incluir claves privadas en variables `EXPO_PUBLIC_*`. El servidor admite `EXPO_ACCESS_TOKEN` si se habilita la seguridad mejorada de Expo Push.

El botón «Activar notificaciones push» solicita permiso y registra el dispositivo en `POST /api/v1/devices`. Desactivarlo o cerrar sesión elimina la suscripción remota cuando hay conexión y cancela avisos locales. Sin proyecto/credenciales push configurados, la app explica qué falta; las reservas y recordatorios locales funcionan de forma independiente.

El calendario del sistema muestra el evento para que la persona decida guardarlo. La app no lee los eventos personales. La copia de calendario es una exportación; cambios posteriores requieren editar esa copia. Los recordatorios locales propios de la app sí se actualizan al reprogramar.

## Conectividad y datos locales

El access token vive en memoria. El refresh token y el único intento de reserva pendiente se guardan con `expo-secure-store`, sin contraseñas. Una sola renovación en curso evita consumir dos veces el mismo refresh token. El cierre de sesión invalida renovaciones tardías y limpia el acceso local incluso si falla la revocación remota.

Un fallo de red conserva la clave de idempotencia. Un rechazo explícito de la API permite corregir la selección. Nunca se sustituye automáticamente una reserva de resultado desconocido por una nueva. La validación de precio, disponibilidad, permisos y políticas pertenece a la API.

## Validación

```sh
pnpm --filter @reservas/mobile typecheck
pnpm --filter @reservas/mobile lint
pnpm --filter @reservas/mobile test
pnpm --filter @reservas/mobile build --max-workers 2
```

16 pruebas cubren rotación/persistencia segura, cierre durante una renovación, recuperación de reservas tras reinicio, doble toque, 401, calendario, recordatorios y contrato de registro push. El export Android de Metro con SDK 58 compiló 725 módulos. Las integraciones de dispositivo se prueban mediante adaptadores simulados en la suite; la exportación no equivale a ejecutar un APK/IPA ni confirma entrega APNs/FCM. Debe completarse la prueba en hardware con las credenciales del negocio.
