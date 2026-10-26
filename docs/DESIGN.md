# Agenda abierta: propuesta antes de la interfaz

La acción principal es confirmar una cita con el mínimo número de decisiones. El público boliviano necesita ver el precio en bolivianos, la sede, el horario local y un número de contacto sin recorrer páginas promocionales. La dirección es **editorial funcional**, inspirada en una agenda de atención: líneas de tiempo, números claros y un resumen que acompaña la elección.

## Paleta

| Nombre       | Hex       | Uso                                  |
| ------------ | --------- | ------------------------------------ |
| Tinta andina | `#16324F` | Texto, titulares, navegación         |
| Azul lago    | `#146C94` | Acción principal y selección         |
| Papel        | `#F5F8FA` | Fondo general                        |
| Blanco       | `#FFFFFF` | Superficies y formularios            |
| Coral        | `#D1495B` | Errores y alertas, siempre con texto |
| Confirmación | `#26745B` | Estados confirmados y completados    |

Manrope aporta ritmo en titulares y números. Source Sans 3 facilita la lectura de formularios y descripciones. Ambas se alojan con el proyecto: no se solicita una fuente externa al abrir la página. Escala de espacios de 4, 8, 12, 16, 24, 32 y 48 px. Controles táctiles de al menos 44 px, foco visible, mensajes de error vinculados y contraste suficiente en textos y acciones.

## Composición

```text
ESCRITORIO
┌─────────────────────────────────────────────────────────┐
│ Marca / sede                               Mi cuenta    │
├───────────────────────────────────┬─────────────────────┤
│ Tu tiempo, en orden.              │ TU RESERVA          │
│ Servicio y precio                 │ Servicio · Bs       │
│ ───────────────────────────────   │ Profesional / sede  │
│ Profesional · fecha               │ Fecha y hora local  │
│ 09:00  09:30  10:00  10:30        │                     │
│ Nombre · celular · correo         │ [Confirmar cita]    │
└───────────────────────────────────┴─────────────────────┘

MÓVIL
┌───────────────────────┐
│ Marca         Cuenta  │
│ Elegir servicio       │
│ Profesional · fecha   │
│ 09:00  09:30  10:00    │
│ Datos de contacto     │
├───────────────────────┤
│ Total Bs · Confirmar  │
└───────────────────────┘
```

La propuesta inicial de tarjetas repetidas se descartó. La diferenciación está en la franja horaria, las divisiones editoriales y el resumen de cita persistente. No se usan sombras uniformes ni animaciones de entrada en cada sección. Los cambios de selección tienen respuesta inmediata; `prefers-reduced-motion` conserva la funcionalidad sin movimiento.

Evaluación DFII: impacto 4, adecuación 5, factibilidad 5, rendimiento 5, riesgo de consistencia 4: **15**. La API mantiene la lógica y las políticas; la interfaz sólo presenta decisiones y respuestas. El estilo permite reemplazar la marca mediante variables CSS; validar contraste al cambiar el color principal.

## Textos y localización

Acciones: «Reservar», «Confirmar cita», «Cambiar horario», «Cancelar cita». Importes en `es-BO`, moneda `BOB` y rótulo `Bs`. El contrato intercambia UTC; la presentación usa la zona IANA de la sede (`America/La_Paz` por defecto). Los estados combinan texto y color. No se comunican decisiones sólo mediante iconos.
