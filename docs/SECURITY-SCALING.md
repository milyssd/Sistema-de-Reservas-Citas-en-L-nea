# Seguridad, límites y operación

## Decisiones de la versión inicial

La v1 sirve un negocio identificado por `BUSINESS_ID`. Los datos poseen `businessId` desde su creación y cada operación autenticada debe aplicar ese ámbito. Convertirlo en plataforma requiere resolver el negocio por dominio o pertenencia de usuario y revisar el acceso SUPERADMIN; no basta con aceptar un `businessId` arbitrario del cliente.

El recurso se bloquea transaccionalmente para reservar y se vuelven a comprobar solapamientos dentro de la transacción. Los precios y duraciones se copian a los items de reserva. MySQL es la fuente de verdad; un evento SSE o una entrada en caché no concede por sí solo un turno.

La cola usa BullMQ cuando hay Redis y un adaptador node-cron/DB en desarrollo sin Redis. MySQL conserva el registro autoritativo de tareas y entregas; los workers reclaman filas, reintentan con backoff y recuperan jobs si Redis los pierde. SMTP, Web Push y Expo Push se configuran por variables. Los pagos son manuales: confirmar un comprobante no verifica automáticamente una cuenta bancaria. Una pasarela futura debe implementar el contrato del proveedor y validar firmas e idempotencia en webhooks.

## Checklist antes de aceptar clientes

- [ ] Credenciales distintas de desarrollo; `.env`, dumps y almacenamiento privado fuera de Git.
- [ ] HTTPS real, dominio correcto y origen CORS exacto.
- [ ] API/DB/Redis sin acceso público directo; confianza de proxies limitada al salto local.
- [ ] Registro, login, expiración de access token, rotación de refresh y detección de reutilización probados.
- [ ] Recuperación/verificación enviadas por SMTP real; tokens de un solo uso y caducidad comprobados.
- [ ] TOTP habilitado en cuentas administrativas y clave de cifrado respaldada.
- [ ] Pruebas de permisos por rol y tenant, acceso a comprobantes y exportación de cuenta aprobadas.
- [ ] Reservas simultáneas probadas contra la misma versión de MySQL/MariaDB usada en producción.
- [ ] Políticas de cancelación, buffers, anticipos y horario de cada sede revisados.
- [ ] Carga de comprobantes comprobada con archivos falsos, tamaño excesivo e imágenes válidas.
- [ ] Logs sin contraseñas, tokens, cookies, comprobantes ni datos innecesarios de clientes.
- [ ] Respaldos cifrados con restauración probada y política de retención definida.
- [ ] Páginas de privacidad adaptadas a los datos, responsables y contacto reales del negocio.
- [ ] Exportación/eliminación de cuenta revisadas junto a obligaciones contables de retención.
- [ ] Lighthouse móvil y revisión manual de teclado/lector de pantalla ejecutados sobre producción.

Las casillas son una lista de operación. No representan comprobaciones realizadas por el repositorio ni una certificación de seguridad.

## Escalar con evidencia

1. Medir latencia p50/p95, errores, conexiones MySQL, duración de transacciones, cola pendiente y tareas fallidas. Ejecutar carga representativa con varios profesionales y reservas simultáneas.
2. Mantener el bloqueo y la comprobación de disponibilidad en MySQL. Aumentar conexiones de Prisma gradualmente: número de réplicas × pool debe caber en `max_connections`.
3. El límite por IP de Nginx se comparte entre workers del proxy. La API exige Redis en producción para su limitador compartido; la caché de disponibilidad de fallback es local al proceso. Validar contadores entre réplicas y comportamiento cuando Redis deja de responder antes de aumentar exposición.
4. La caché Redis usa TTL de 5 segundos e invalida el namespace del negocio tras crear/mover/cancelar/retener. El fallback en memoria se limita a 256 entradas. Mantener esa invalidación al añadir nuevas mutaciones. Reservar siempre consulta la base de datos bajo bloqueo, aunque la caché ofrezca el turno.
5. La cola BullMQ conserva identificadores de trabajo deduplicables; aumentar workers después de medir latencia y probar reclamación de filas y recuperación. Un proveedor puede aceptar un mensaje antes de perderse la respuesta: contemplar entrega al menos una vez.
6. Para varios servidores, compartir almacenamiento privado mediante un volumen protegido o un proveedor de objetos detrás de una interfaz. No dirigir un comprobante a una réplica que no pueda leerlo.
7. Una réplica de lectura puede servir reportes con retraso tolerable; disponibilidad transaccional, autenticación, sesiones y reservas leen la primaria.
8. SSE exige reconexión y consulta de estado. La agenda consulta cambios agregados en la DB cada 5 segundos y disponibilidad se refresca con esa frecuencia, por lo que funcionan entre procesos. Evaluar pub/sub cuando el número de suscriptores justifique reducir sondeos.

No se publica una capacidad numérica sin pruebas de carga: depende del hardware, duración de consultas, distribución de citas y servicios con cupos. La app móvil usa el mismo OpenAPI para reservas, sesiones y avisos; calendario y push requieren aceptación en dispositivos físicos con credenciales del operador.
