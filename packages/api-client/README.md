# Cliente compartido

Web y Expo usan `createApiClient` sobre `/api/v1`. El token de acceso lo proporciona una función; el cliente no persiste credenciales. Los POST con `Idempotency-Key` conservan su clave al reintentar. La rotación de refresh tokens nunca se reintenta automáticamente.

Con la API en desarrollo iniciada, ejecutar `pnpm api:generate-client`. `OPENAPI_URL` permite apuntar al JSON de OpenAPI. El comando guarda el contrato real en `openapi.json` y genera `src/schema.d.ts` mediante `openapi-typescript`. No se debe regenerar desde una API de otra versión.

`src/generated-client.ts` ofrece el cliente completamente tipado por las rutas del contrato generado. `createApiClient` añade el transporte común con autenticación y reintentos; ambas interfaces consumen los mismos endpoints.

Los tipos `AuthResult`, `User`, `Booking`, `BookingPage`, `LoginRequest`, `RefreshRequest`, `BookingCreateRequest` y `HoldCreateRequest` se derivan directamente del contrato generado. El transporte común no vuelve a declarar esos modelos: las funciones de login, renovación, creación y listado usan esas firmas. `request<T>` queda disponible para endpoints adicionales; preferir los métodos tipados o `createGeneratedApiClient` en código nuevo.
