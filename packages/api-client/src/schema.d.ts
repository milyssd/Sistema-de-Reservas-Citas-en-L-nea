/** Generado desde OpenAPI. Ejecutar pnpm api:generate-client. */
export interface paths {
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["HealthController_health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["HealthController_ready"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Login web (cookie) o móvil (refresh token en respuesta) */
        post: operations["AuthController_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AuthController_me"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AuthController_sessions"];
        put?: never;
        post?: never;
        delete: operations["AuthController_revokeAll"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/sessions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["AuthController_revokeSession"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/forgot-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_forgot"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/resend-verification": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_resend"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/verify-email": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_verify"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/reset-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_reset"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/totp/setup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_setupTotp"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/totp/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AuthController_confirmTotp"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/totp": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["AuthController_disableTotp"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/users/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["UsersController_profile"];
        put?: never;
        post?: never;
        delete: operations["UsersController_delete"];
        options?: never;
        head?: never;
        patch: operations["UsersController_update"];
        trace?: never;
    };
    "/api/v1/users/me/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["UsersController_export"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["UsersController_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/users/{id}/role": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["UsersController_role"];
        trace?: never;
    };
    "/api/v1/bookings/holds": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Retener temporalmente un turno sin crear todavía una reserva */
        post: operations["BookingsController_hold"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/bookings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Citas propias; personal limitado a su agenda y administradores a su negocio */
        get: operations["BookingsController_list"];
        put?: never;
        /** Reservar como invitado, cliente o personal; comprueba ocupación en una transacción */
        post: operations["BookingsController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/bookings/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Cambios de la agenda, sin datos personales; reconectar con Authorization */
        get: operations["BookingsController_events"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/bookings/manage/{token}/calendar.ics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["BookingsController_guestCalendar"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/bookings/manage/{token}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["BookingsController_guestRead"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["BookingsController_guestPatch"];
        trace?: never;
    };
    "/api/v1/bookings/{id}/calendar.ics": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["BookingsController_calendar"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/bookings/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["BookingsController_read"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Reprogramar o actualizar el estado con control de versión */
        patch: operations["BookingsController_patch"];
        trace?: never;
    };
    "/api/v1/bookings/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["BookingsController_cancel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/bookings/{id}/reschedule": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["BookingsController_reschedule"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/availability/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Pulso público para refrescar los turnos cada cinco segundos; no transmite datos de clientes */
        get: operations["AvailabilityController_events"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/availability": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Turnos libres, evaluados en la zona de la sede y serializados en UTC */
        get: operations["AvailabilityController_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/anti-abuse/challenge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Prueba de trabajo breve para solicitudes de invitados tras detectar abuso. No requiere servicios externos. */
        post: operations["AntiAbuseController_issue"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["CatalogController_configuration"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/catalog": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["CatalogController_catalog"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/calendar/{staffId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["CatalogController_calendar"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/business": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AdminController_business"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["AdminController_updateBusiness"];
        trace?: never;
    };
    "/api/v1/admin/outbox": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AdminController_outbox"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/outbox/{id}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AdminController_retry"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/customers/{id}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AdminController_customer"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/{resource}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AdminController_list"];
        put?: never;
        post: operations["AdminController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/{resource}/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["AdminController_get"];
        put?: never;
        post?: never;
        delete: operations["AdminController_remove"];
        options?: never;
        head?: never;
        patch: operations["AdminController_update"];
        trace?: never;
    };
    "/api/v1/reports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ReportsController_reports"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reports.csv": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ReportsController_csv"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ReportsController_audit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/payments/instructions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["PaymentsController_instructions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["PaymentsController_list"];
        put?: never;
        post: operations["PaymentsController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/payments/{id}/receipt": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["PaymentsController_receipt"];
        put?: never;
        post: operations["PaymentsController_upload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/payments/{id}/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["PaymentsController_confirm"];
        trace?: never;
    };
    "/api/v1/payments/{id}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["PaymentsController_reject"];
        trace?: never;
    };
    "/api/v1/payments/{id}/refunds": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["PaymentsController_refunds"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/payments/{id}/refund": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["PaymentsController_refund"];
        trace?: never;
    };
    "/api/v1/payments/{id}/retain": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["PaymentsController_retain"];
        trace?: never;
    };
    "/api/v1/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["CommunityController_notifications"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notifications/{id}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["CommunityController_read"];
        trace?: never;
    };
    "/api/v1/devices": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["CommunityController_device"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/devices/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["CommunityController_removeDevice"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/waitlist": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["CommunityController_waitlist"];
        put?: never;
        post: operations["CommunityController_join"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/waitlist/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["CommunityController_leave"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reviews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["CommunityController_review"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["CommunityController_profile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/staff/{id}/calendar-token": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["CommunityController_calendar"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AvailabilitySegmentDto: {
            /** Format: uuid */
            serviceId: string;
            /** Format: uuid */
            staffId: string;
            /** Format: date-time */
            startAt: string;
            /** Format: date-time */
            endAt: string;
            bufferBeforeMinutes: number;
            bufferAfterMinutes: number;
        };
        HoldDto: {
            staffIds: string[];
            segments: components["schemas"]["AvailabilitySegmentDto"][];
            /** Format: uuid */
            id: string;
            holdToken: string;
            /** Format: date-time */
            expiresAt: string;
            /** Format: uuid */
            staffId: string;
            /** Format: date-time */
            startAt: string;
            /** Format: date-time */
            endAt: string;
        };
        BookingItemDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            serviceId: string;
            /** Format: uuid */
            staffId: string;
            serviceName: string;
            durationMinutes: number;
            bufferBeforeMinutes: number;
            bufferAfterMinutes: number;
            /**
             * @description Monto decimal en bolivianos
             * @example 50.00
             */
            price: string;
            depositAmount: string;
            capacity: number;
            position: number;
            /** Format: date-time */
            startAt: string;
            /** Format: date-time */
            endAt: string;
        };
        BookingLocationDto: {
            /** Format: uuid */
            id: string;
            name: string;
            address: string;
            /** @example America/La_Paz */
            timezone: string;
        };
        BookingStaffDto: {
            /** Format: uuid */
            id: string;
            name: string;
        };
        BookingCustomerDto: {
            /** Format: uuid */
            id: string;
            name: string;
            /** Format: email */
            email: string;
            phone: string;
        };
        BookingDto: {
            /** @description Permiso del actor para gestionar la cita completa; las políticas de plazo se verifican al modificar */
            canManage: boolean;
            mixedStaff: boolean;
            /** Format: uuid */
            id: string;
            /** @example 7MZK3PW9 */
            code: string;
            /** Format: uuid */
            businessId: string;
            /** Format: uuid */
            locationId: string;
            /** Format: uuid */
            staffId: string;
            /** Format: uuid */
            customerId: string;
            /** @enum {string} */
            status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "EXPIRED";
            /** @enum {string} */
            source: "WEB" | "MOBILE" | "ADMIN" | "WALK_IN";
            /** Format: date-time */
            startAt: string;
            /** Format: date-time */
            endAt: string;
            /** @example BOB */
            currency: string;
            totalAmount: string;
            depositAmount: string;
            version: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            notes: string | null;
            /** Format: date-time */
            expiresAt: string | null;
            items: components["schemas"]["BookingItemDto"][];
            location: components["schemas"]["BookingLocationDto"];
            staff: components["schemas"]["BookingStaffDto"];
            /** @description Disponible solo para el usuario autenticado autorizado, nunca para enlaces de invitado */
            customer?: components["schemas"]["BookingCustomerDto"];
            /** @description Token de gestión entregado únicamente al crear la reserva */
            manageToken?: string;
        };
        BookingPageDto: {
            data: components["schemas"]["BookingDto"][];
            /** Format: uuid */
            nextCursor: string | null;
        };
        AvailabilitySlotDto: {
            /** Format: uuid */
            staffId: string;
            staffIds: string[];
            /** Format: uuid */
            locationId: string;
            /** Format: date-time */
            startAt: string;
            /** Format: date-time */
            endAt: string;
            remainingCapacity: number;
            /** @description Total calculado por la API con los precios de cada profesional */
            totalAmount: number;
            depositAmount: number;
            segments: components["schemas"]["AvailabilitySegmentDto"][];
        };
        AvailabilityResponseDto: {
            data: components["schemas"]["AvailabilitySlotDto"][];
            timezone: string;
        };
        Problem: {
            type: string;
            title: string;
            status: number;
            detail: string;
            code: string;
            requestId: string;
            instance?: string;
            challenge?: {
                token: string;
                difficulty: number;
                /** Format: date-time */
                expiresAt: string;
                /** @enum {string} */
                algorithm: "SHA-256";
                /** @enum {string} */
                input: "token:nonce";
            };
            errors?: {
                path?: string;
                message?: string;
            }[];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    HealthController_health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    HealthController_ready: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: email */
                    email: string;
                    password: string;
                    /**
                     * @default web
                     * @enum {string}
                     */
                    platform?: "web" | "mobile";
                    totpCode?: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        accessToken: string;
                        /** @description Solo para platform=mobile. En web se entrega mediante cookie httpOnly. */
                        refreshToken?: string;
                        /** @example 900 */
                        expiresIn: number;
                        user: {
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            name: string;
                            /** Format: email */
                            email: string;
                            /** @enum {string} */
                            role: "CLIENT" | "STAFF" | "ADMIN" | "OWNER" | "SUPERADMIN";
                            /** Format: uuid */
                            staffId?: string;
                            /** Format: uuid */
                            customerId?: string;
                            emailVerified?: boolean;
                        };
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    name: string;
                    /** Format: email */
                    email: string;
                    /** @example +59170123456 */
                    phone: string;
                    password: string;
                    /** @enum {string} */
                    platform?: "web" | "mobile";
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        accessToken: string;
                        /** @description Solo para platform=mobile. En web se entrega mediante cookie httpOnly. */
                        refreshToken?: string;
                        /** @example 900 */
                        expiresIn: number;
                        user: {
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            name: string;
                            /** Format: email */
                            email: string;
                            /** @enum {string} */
                            role: "CLIENT" | "STAFF" | "ADMIN" | "OWNER" | "SUPERADMIN";
                            /** Format: uuid */
                            staffId?: string;
                            /** Format: uuid */
                            customerId?: string;
                            emailVerified?: boolean;
                        };
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /**
                     * @default web
                     * @enum {string}
                     */
                    platform?: "web" | "mobile";
                    refreshToken?: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        accessToken: string;
                        /** @description Solo para platform=mobile. En web se entrega mediante cookie httpOnly. */
                        refreshToken?: string;
                        /** @example 900 */
                        expiresIn: number;
                        user: {
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            name: string;
                            /** Format: email */
                            email: string;
                            /** @enum {string} */
                            role: "CLIENT" | "STAFF" | "ADMIN" | "OWNER" | "SUPERADMIN";
                            /** Format: uuid */
                            staffId?: string;
                            /** Format: uuid */
                            customerId?: string;
                            emailVerified?: boolean;
                        };
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /**
                     * @default web
                     * @enum {string}
                     */
                    platform?: "web" | "mobile";
                    refreshToken?: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_me: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        name: string;
                        /** Format: email */
                        email: string;
                        /** @enum {string} */
                        role: "CLIENT" | "STAFF" | "ADMIN" | "OWNER" | "SUPERADMIN";
                        /** Format: uuid */
                        staffId?: string;
                        /** Format: uuid */
                        customerId?: string;
                        emailVerified?: boolean;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_sessions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            /** Format: uuid */
                            id: string;
                            userAgent?: string | null;
                            ip?: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            expiresAt: string;
                        }[];
                        /** Format: uuid */
                        nextCursor: string | null;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_revokeAll: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_revokeSession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_forgot: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: email */
                    email: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_resend: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: email */
                    email: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_verify: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    token: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_reset: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    token: string;
                    password: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        message: string;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_setupTotp: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_confirmTotp: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AuthController_disableTotp: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    UsersController_profile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    UsersController_delete: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    UsersController_update: {
        parameters: {
            query?: never;
            header: {
                "if-match": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    UsersController_export: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    UsersController_list: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    UsersController_role: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BookingsController_hold: {
        parameters: {
            query?: never;
            header?: {
                /** @description Solución decimal de la prueba de trabajo del invitado */
                "X-Guest-Nonce"?: string;
                /** @description Firmado por /anti-abuse/challenge, requerido tras el umbral de invitado */
                "X-Guest-Challenge"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    locationId: string;
                    serviceIds: string[];
                    /** Format: uuid */
                    staffId?: string;
                    /** @description Un profesional por servicio; null asigna cualquiera. No combinar con staffId. */
                    staffIds?: (string | null)[];
                    /** Format: date-time */
                    startAt: string;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HoldDto"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BookingsController_list: {
        parameters: {
            query?: {
                order?: "asc" | "desc";
                status?: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "EXPIRED";
                locationId?: string;
                staffId?: string;
                to?: string;
                from?: string;
                limit?: number;
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingPageDto"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BookingsController_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Identificador único del intento, reutilizado para reintentos con los mismos datos */
                "Idempotency-Key": string;
                /** @description Solución decimal de la prueba de trabajo del invitado */
                "X-Guest-Nonce"?: string;
                /** @description Firmado por /anti-abuse/challenge, requerido tras el umbral de invitado */
                "X-Guest-Challenge"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    locationId: string;
                    serviceIds: string[];
                    /** Format: uuid */
                    staffId?: string;
                    /** @description Un profesional por servicio; null asigna cualquiera. No combinar con staffId. */
                    staffIds?: (string | null)[];
                    /** Format: date-time */
                    startAt: string;
                    /** @enum {string} */
                    source?: "WEB" | "MOBILE" | "ADMIN" | "WALK_IN";
                    notes?: string;
                    holdToken?: string;
                    customer?: {
                        name: string;
                        /** Format: email */
                        email: string;
                        /** @example +59171234567 */
                        phone: string;
                    };
                };
            };
        };
        responses: {
            /** @description Reserva creada o respuesta idempotente del intento original */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingDto"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BookingsController_events: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BookingsController_guestCalendar: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                token: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BookingsController_guestRead: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                token: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingDto"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BookingsController_guestPatch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                token: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingDto"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BookingsController_calendar: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BookingsController_read: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingDto"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BookingsController_patch: {
        parameters: {
            query?: never;
            header: {
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingDto"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BookingsController_cancel: {
        parameters: {
            query?: never;
            header: {
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingDto"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BookingsController_reschedule: {
        parameters: {
            query?: never;
            header: {
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingDto"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AvailabilityController_events: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AvailabilityController_list: {
        parameters: {
            query: {
                to: unknown;
                from: unknown;
                locationId?: unknown;
                /** @description UUID o any por servicio, separados por comas; no combinar con staffId */
                staffIds?: unknown;
                staffId?: unknown;
                /** @description UUID separados por comas, en orden de atención */
                serviceIds?: unknown;
                serviceId?: unknown;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AvailabilityResponseDto"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AntiAbuseController_issue: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @enum {string} */
                    action: "BOOK" | "HOLD";
                    payload: {
                        [key: string]: unknown;
                    };
                    idempotencyKey?: string;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        token: string;
                        difficulty: number;
                        /** Format: date-time */
                        expiresAt: string;
                        /** @enum {string} */
                        algorithm: "SHA-256";
                        /** @enum {string} */
                        input: "token:nonce";
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CatalogController_configuration: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        vapidPublicKey: string | null;
                        pushEnabled: boolean;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CatalogController_catalog: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        business: {
                            /** Format: uuid */
                            id: string;
                            name: string;
                            slug: string;
                            description: string | null;
                            currency: string;
                            locale: string;
                            timezone: string;
                            logoUrl: string | null;
                            brandColor: string;
                            minimumNoticeMinutes: number;
                            maximumAdvanceDays: number;
                            slotIntervalMinutes: number;
                            cancellationHours: number;
                            maintenanceMode: boolean;
                            featureFlags: {
                                multiStaffBookings: boolean;
                            };
                        };
                        locations: {
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            name: string;
                            address: string;
                            timezone: string;
                            phone: string | null;
                            mapUrl: string | null;
                            latitude: string | null;
                            longitude: string | null;
                            active: boolean;
                            version: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                        }[];
                        services: {
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            /** Format: uuid */
                            categoryId: string | null;
                            name: string;
                            description: string | null;
                            durationMinutes: number;
                            bufferBeforeMinutes: number;
                            bufferAfterMinutes: number;
                            /** @example 50.00 */
                            price: string;
                            /** @example 50.00 */
                            depositAmount: string;
                            depositPercent: number | null;
                            capacity: number;
                            active: boolean;
                            onlineBookable: boolean;
                            sortOrder: number;
                            version: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                        }[];
                        categories: {
                            /** Format: uuid */
                            id: string;
                            name: string;
                            sortOrder: number;
                            active: boolean;
                            version: number;
                        }[];
                        staff: {
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            locationId: string;
                            name: string;
                            bio: string | null;
                            photoUrl: string | null;
                            isResource: boolean;
                            staffServices: {
                                /** Format: uuid */
                                serviceId: string;
                                durationMinutes: number | null;
                                /** @example 50.00 */
                                price: string | null;
                            }[];
                            workingHours: {
                                dayOfWeek: number;
                                startMinute: number;
                                endMinute: number;
                            }[];
                        }[];
                        reviews: {
                            /** Format: uuid */
                            id: string;
                            rating: number;
                            comment: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            customer: {
                                name: string;
                            };
                        }[];
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CatalogController_calendar: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                staffId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AdminController_business: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        name: string;
                        slug?: string;
                        description?: string | null;
                        currency?: string;
                        locale?: string;
                        timezone?: string;
                        logoUrl?: string | null;
                        brandColor?: string;
                        minimumNoticeMinutes?: number;
                        maximumAdvanceDays?: number;
                        slotIntervalMinutes?: number;
                        cancellationHours?: number;
                        maintenanceMode?: boolean;
                        featureFlags?: unknown;
                        version: number;
                        holdMinutes?: number;
                        paymentExpiryHours?: number;
                        maxPendingBookings?: number;
                        maxNoShows?: number;
                        autoConfirm?: boolean;
                        assignmentRule?: string;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AdminController_updateBusiness: {
        parameters: {
            query?: never;
            header: {
                "if-match": string;
                "If-Match": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    name?: string;
                    description?: string;
                    brandColor?: string;
                    logoUrl?: string | null;
                    minimumNoticeMinutes?: number;
                    maximumAdvanceDays?: number;
                    slotIntervalMinutes?: number;
                    cancellationHours?: number;
                    autoConfirm?: boolean;
                    featureFlags?: {
                        multiStaffBookings: boolean;
                    };
                    maintenanceMode?: boolean;
                    holdMinutes?: number;
                    paymentExpiryHours?: number;
                    /** @enum {string} */
                    assignmentRule?: "LEAST_BUSY" | "ORDER";
                    maxPendingBookings?: number;
                    maxNoShows?: number;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        name: string;
                        slug?: string;
                        description?: string | null;
                        currency?: string;
                        locale?: string;
                        timezone?: string;
                        logoUrl?: string | null;
                        brandColor?: string;
                        minimumNoticeMinutes?: number;
                        maximumAdvanceDays?: number;
                        slotIntervalMinutes?: number;
                        cancellationHours?: number;
                        maintenanceMode?: boolean;
                        featureFlags?: unknown;
                        version: number;
                        holdMinutes?: number;
                        paymentExpiryHours?: number;
                        maxPendingBookings?: number;
                        maxNoShows?: number;
                        autoConfirm?: boolean;
                        assignmentRule?: string;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AdminController_outbox: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            /** Format: uuid */
                            id: string;
                            event: string;
                            channel: string;
                            status: string;
                            attempts: number;
                            maxAttempts: number;
                            /** Format: date-time */
                            scheduledAt: string;
                            /** Format: date-time */
                            sentAt: string | null;
                            lastError: string | null;
                            /** Format: date-time */
                            createdAt: string;
                        }[];
                        /** Format: uuid */
                        nextCursor: string | null;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AdminController_retry: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AdminController_customer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AdminController_list: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path: {
                resource: "services" | "categories" | "locations" | "staff" | "staff-services" | "working-hours" | "time-off" | "customers" | "settings";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: (({
                            name?: string;
                            /** @default  */
                            description: string;
                            /** Format: uuid */
                            categoryId?: string | null;
                            durationMinutes?: number;
                            /** @default 0 */
                            bufferBeforeMinutes: number;
                            /** @default 0 */
                            bufferAfterMinutes: number;
                            /** @example 50.00 */
                            price?: string;
                            /** @example 50.00 */
                            depositAmount?: string;
                            depositPercent?: number | null;
                            /** @default 0 */
                            sortOrder: number;
                            /** @default 1 */
                            capacity: number;
                            /** @default true */
                            active: boolean;
                            /** @default true */
                            onlineBookable: boolean;
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            version: number;
                            /** Format: date-time */
                            createdAt?: string;
                            /** Format: date-time */
                            updatedAt?: string;
                        } & {
                            [key: string]: unknown;
                        }) | ({
                            name?: string;
                            /** @default true */
                            active: boolean;
                            /** @default 0 */
                            sortOrder: number;
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            version: number;
                            /** Format: date-time */
                            createdAt?: string;
                            /** Format: date-time */
                            updatedAt?: string;
                        } & {
                            [key: string]: unknown;
                        }) | ({
                            name?: string;
                            address?: string;
                            /** @default America/La_Paz */
                            timezone: string;
                            phone?: string;
                            mapUrl?: string;
                            /** @default true */
                            active: boolean;
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            version: number;
                            /** Format: date-time */
                            createdAt?: string;
                            /** Format: date-time */
                            updatedAt?: string;
                        } & {
                            [key: string]: unknown;
                        }) | ({
                            name?: string;
                            /** @default false */
                            isResource: boolean;
                            /** Format: uuid */
                            locationId?: string;
                            /** Format: uuid */
                            userId?: string | null;
                            /** @default  */
                            bio: string;
                            photoUrl?: string | null;
                            /** @default true */
                            active: boolean;
                            /** @default 0 */
                            sortOrder: number;
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            version: number;
                            /** Format: date-time */
                            createdAt?: string;
                            /** Format: date-time */
                            updatedAt?: string;
                        } & {
                            [key: string]: unknown;
                        }) | ({
                            /** Format: uuid */
                            staffId?: string;
                            /** Format: uuid */
                            serviceId?: string;
                            durationMinutes?: number | null;
                            /** @example 50.00 */
                            price?: string;
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            version: number;
                            /** Format: date-time */
                            createdAt?: string;
                            /** Format: date-time */
                            updatedAt?: string;
                        } & {
                            [key: string]: unknown;
                        }) | ({
                            /** Format: uuid */
                            staffId?: string;
                            /** Format: uuid */
                            locationId?: string;
                            dayOfWeek?: number;
                            startMinute?: number;
                            endMinute?: number;
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            version: number;
                            /** Format: date-time */
                            createdAt?: string;
                            /** Format: date-time */
                            updatedAt?: string;
                        } & {
                            [key: string]: unknown;
                        }) | ({
                            /** Format: uuid */
                            staffId?: string | null;
                            /** Format: uuid */
                            locationId?: string;
                            /** Format: date-time */
                            startAt?: string;
                            /** Format: date-time */
                            endAt?: string;
                            reason?: string;
                            /** @default false */
                            isHoliday: boolean;
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            version: number;
                            /** Format: date-time */
                            createdAt?: string;
                            /** Format: date-time */
                            updatedAt?: string;
                        } & {
                            [key: string]: unknown;
                        }) | ({
                            name?: string;
                            /** Format: email */
                            email?: string;
                            phone?: string;
                            internalNotes?: string;
                            tags?: string[];
                            /** @default false */
                            blocked: boolean;
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            version: number;
                            /** Format: date-time */
                            createdAt?: string;
                            /** Format: date-time */
                            updatedAt?: string;
                        } & {
                            [key: string]: unknown;
                        }) | ({
                            key?: string;
                            value?: unknown;
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            version: number;
                            /** Format: date-time */
                            createdAt?: string;
                            /** Format: date-time */
                            updatedAt?: string;
                        } & {
                            [key: string]: unknown;
                        }))[];
                        /** Format: uuid */
                        nextCursor: string | null;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AdminController_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                resource: "services" | "categories" | "locations" | "staff" | "staff-services" | "working-hours" | "time-off" | "customers" | "settings";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    name: string;
                    /** @default  */
                    description?: string;
                    /** Format: uuid */
                    categoryId?: string | null;
                    durationMinutes: number;
                    /** @default 0 */
                    bufferBeforeMinutes?: number;
                    /** @default 0 */
                    bufferAfterMinutes?: number;
                    price: number;
                    /** @default 0 */
                    depositAmount?: number;
                    depositPercent?: number | null;
                    /** @default 0 */
                    sortOrder?: number;
                    /** @default 1 */
                    capacity?: number;
                    /** @default true */
                    active?: boolean;
                    /** @default true */
                    onlineBookable?: boolean;
                } | {
                    name: string;
                    /** @default true */
                    active?: boolean;
                    /** @default 0 */
                    sortOrder?: number;
                } | {
                    name: string;
                    address: string;
                    /** @default America/La_Paz */
                    timezone?: string;
                    phone?: string;
                    mapUrl?: string;
                    /** @default true */
                    active?: boolean;
                } | {
                    name: string;
                    /** @default false */
                    isResource?: boolean;
                    /** Format: uuid */
                    locationId: string;
                    /** Format: uuid */
                    userId?: string | null;
                    /** @default  */
                    bio?: string;
                    photoUrl?: string | null;
                    /** @default true */
                    active?: boolean;
                    /** @default 0 */
                    sortOrder?: number;
                } | {
                    /** Format: uuid */
                    staffId: string;
                    /** Format: uuid */
                    serviceId: string;
                    durationMinutes?: number | null;
                    price?: number | null;
                } | {
                    /** Format: uuid */
                    staffId: string;
                    /** Format: uuid */
                    locationId: string;
                    dayOfWeek: number;
                    startMinute: number;
                    endMinute: number;
                } | {
                    /** Format: uuid */
                    staffId?: string | null;
                    /** Format: uuid */
                    locationId: string;
                    /** Format: date-time */
                    startAt: string;
                    /** Format: date-time */
                    endAt: string;
                    reason: string;
                    /** @default false */
                    isHoliday?: boolean;
                } | {
                    name: string;
                    /** Format: email */
                    email: string;
                    phone: string;
                    internalNotes?: string;
                    tags?: string[];
                    /** @default false */
                    blocked?: boolean;
                } | {
                    key: string;
                    value: unknown;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": ({
                        name?: string;
                        /** @default  */
                        description: string;
                        /** Format: uuid */
                        categoryId?: string | null;
                        durationMinutes?: number;
                        /** @default 0 */
                        bufferBeforeMinutes: number;
                        /** @default 0 */
                        bufferAfterMinutes: number;
                        /** @example 50.00 */
                        price?: string;
                        /** @example 50.00 */
                        depositAmount?: string;
                        depositPercent?: number | null;
                        /** @default 0 */
                        sortOrder: number;
                        /** @default 1 */
                        capacity: number;
                        /** @default true */
                        active: boolean;
                        /** @default true */
                        onlineBookable: boolean;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        name?: string;
                        /** @default true */
                        active: boolean;
                        /** @default 0 */
                        sortOrder: number;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        name?: string;
                        address?: string;
                        /** @default America/La_Paz */
                        timezone: string;
                        phone?: string;
                        mapUrl?: string;
                        /** @default true */
                        active: boolean;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        name?: string;
                        /** @default false */
                        isResource: boolean;
                        /** Format: uuid */
                        locationId?: string;
                        /** Format: uuid */
                        userId?: string | null;
                        /** @default  */
                        bio: string;
                        photoUrl?: string | null;
                        /** @default true */
                        active: boolean;
                        /** @default 0 */
                        sortOrder: number;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        /** Format: uuid */
                        staffId?: string;
                        /** Format: uuid */
                        serviceId?: string;
                        durationMinutes?: number | null;
                        /** @example 50.00 */
                        price?: string;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        /** Format: uuid */
                        staffId?: string;
                        /** Format: uuid */
                        locationId?: string;
                        dayOfWeek?: number;
                        startMinute?: number;
                        endMinute?: number;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        /** Format: uuid */
                        staffId?: string | null;
                        /** Format: uuid */
                        locationId?: string;
                        /** Format: date-time */
                        startAt?: string;
                        /** Format: date-time */
                        endAt?: string;
                        reason?: string;
                        /** @default false */
                        isHoliday: boolean;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        name?: string;
                        /** Format: email */
                        email?: string;
                        phone?: string;
                        internalNotes?: string;
                        tags?: string[];
                        /** @default false */
                        blocked: boolean;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        key?: string;
                        value?: unknown;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    });
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AdminController_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                resource: "services" | "categories" | "locations" | "staff" | "staff-services" | "working-hours" | "time-off" | "customers" | "settings";
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": ({
                        name?: string;
                        /** @default  */
                        description: string;
                        /** Format: uuid */
                        categoryId?: string | null;
                        durationMinutes?: number;
                        /** @default 0 */
                        bufferBeforeMinutes: number;
                        /** @default 0 */
                        bufferAfterMinutes: number;
                        /** @example 50.00 */
                        price?: string;
                        /** @example 50.00 */
                        depositAmount?: string;
                        depositPercent?: number | null;
                        /** @default 0 */
                        sortOrder: number;
                        /** @default 1 */
                        capacity: number;
                        /** @default true */
                        active: boolean;
                        /** @default true */
                        onlineBookable: boolean;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        name?: string;
                        /** @default true */
                        active: boolean;
                        /** @default 0 */
                        sortOrder: number;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        name?: string;
                        address?: string;
                        /** @default America/La_Paz */
                        timezone: string;
                        phone?: string;
                        mapUrl?: string;
                        /** @default true */
                        active: boolean;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        name?: string;
                        /** @default false */
                        isResource: boolean;
                        /** Format: uuid */
                        locationId?: string;
                        /** Format: uuid */
                        userId?: string | null;
                        /** @default  */
                        bio: string;
                        photoUrl?: string | null;
                        /** @default true */
                        active: boolean;
                        /** @default 0 */
                        sortOrder: number;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        /** Format: uuid */
                        staffId?: string;
                        /** Format: uuid */
                        serviceId?: string;
                        durationMinutes?: number | null;
                        /** @example 50.00 */
                        price?: string;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        /** Format: uuid */
                        staffId?: string;
                        /** Format: uuid */
                        locationId?: string;
                        dayOfWeek?: number;
                        startMinute?: number;
                        endMinute?: number;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        /** Format: uuid */
                        staffId?: string | null;
                        /** Format: uuid */
                        locationId?: string;
                        /** Format: date-time */
                        startAt?: string;
                        /** Format: date-time */
                        endAt?: string;
                        reason?: string;
                        /** @default false */
                        isHoliday: boolean;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        name?: string;
                        /** Format: email */
                        email?: string;
                        phone?: string;
                        internalNotes?: string;
                        tags?: string[];
                        /** @default false */
                        blocked: boolean;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        key?: string;
                        value?: unknown;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    });
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AdminController_remove: {
        parameters: {
            query?: never;
            header: {
                "if-match": string;
                "If-Match": string;
            };
            path: {
                resource: string;
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    AdminController_update: {
        parameters: {
            query?: never;
            header: {
                "if-match": string;
                "If-Match": string;
            };
            path: {
                resource: "services" | "categories" | "locations" | "staff" | "staff-services" | "working-hours" | "time-off" | "customers" | "settings";
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    name?: string;
                    /** @default  */
                    description?: string;
                    /** Format: uuid */
                    categoryId?: string | null;
                    durationMinutes?: number;
                    /** @default 0 */
                    bufferBeforeMinutes?: number;
                    /** @default 0 */
                    bufferAfterMinutes?: number;
                    price?: number;
                    /** @default 0 */
                    depositAmount?: number;
                    depositPercent?: number | null;
                    /** @default 0 */
                    sortOrder?: number;
                    /** @default 1 */
                    capacity?: number;
                    /** @default true */
                    active?: boolean;
                    /** @default true */
                    onlineBookable?: boolean;
                } | {
                    name?: string;
                    /** @default true */
                    active?: boolean;
                    /** @default 0 */
                    sortOrder?: number;
                } | {
                    name?: string;
                    address?: string;
                    /** @default America/La_Paz */
                    timezone?: string;
                    phone?: string;
                    mapUrl?: string;
                    /** @default true */
                    active?: boolean;
                } | {
                    name?: string;
                    /** @default false */
                    isResource?: boolean;
                    /** Format: uuid */
                    locationId?: string;
                    /** Format: uuid */
                    userId?: string | null;
                    /** @default  */
                    bio?: string;
                    photoUrl?: string | null;
                    /** @default true */
                    active?: boolean;
                    /** @default 0 */
                    sortOrder?: number;
                } | {
                    /** Format: uuid */
                    staffId?: string;
                    /** Format: uuid */
                    serviceId?: string;
                    durationMinutes?: number | null;
                    price?: number | null;
                } | {
                    /** Format: uuid */
                    staffId?: string;
                    /** Format: uuid */
                    locationId?: string;
                    dayOfWeek?: number;
                    startMinute?: number;
                    endMinute?: number;
                } | {
                    /** Format: uuid */
                    staffId?: string | null;
                    /** Format: uuid */
                    locationId?: string;
                    /** Format: date-time */
                    startAt?: string;
                    /** Format: date-time */
                    endAt?: string;
                    reason?: string;
                    /** @default false */
                    isHoliday?: boolean;
                } | {
                    name?: string;
                    /** Format: email */
                    email?: string;
                    phone?: string;
                    internalNotes?: string;
                    tags?: string[];
                    /** @default false */
                    blocked?: boolean;
                } | {
                    key?: string;
                    value?: unknown;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": ({
                        name?: string;
                        /** @default  */
                        description: string;
                        /** Format: uuid */
                        categoryId?: string | null;
                        durationMinutes?: number;
                        /** @default 0 */
                        bufferBeforeMinutes: number;
                        /** @default 0 */
                        bufferAfterMinutes: number;
                        /** @example 50.00 */
                        price?: string;
                        /** @example 50.00 */
                        depositAmount?: string;
                        depositPercent?: number | null;
                        /** @default 0 */
                        sortOrder: number;
                        /** @default 1 */
                        capacity: number;
                        /** @default true */
                        active: boolean;
                        /** @default true */
                        onlineBookable: boolean;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        name?: string;
                        /** @default true */
                        active: boolean;
                        /** @default 0 */
                        sortOrder: number;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        name?: string;
                        address?: string;
                        /** @default America/La_Paz */
                        timezone: string;
                        phone?: string;
                        mapUrl?: string;
                        /** @default true */
                        active: boolean;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        name?: string;
                        /** @default false */
                        isResource: boolean;
                        /** Format: uuid */
                        locationId?: string;
                        /** Format: uuid */
                        userId?: string | null;
                        /** @default  */
                        bio: string;
                        photoUrl?: string | null;
                        /** @default true */
                        active: boolean;
                        /** @default 0 */
                        sortOrder: number;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        /** Format: uuid */
                        staffId?: string;
                        /** Format: uuid */
                        serviceId?: string;
                        durationMinutes?: number | null;
                        /** @example 50.00 */
                        price?: string;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        /** Format: uuid */
                        staffId?: string;
                        /** Format: uuid */
                        locationId?: string;
                        dayOfWeek?: number;
                        startMinute?: number;
                        endMinute?: number;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        /** Format: uuid */
                        staffId?: string | null;
                        /** Format: uuid */
                        locationId?: string;
                        /** Format: date-time */
                        startAt?: string;
                        /** Format: date-time */
                        endAt?: string;
                        reason?: string;
                        /** @default false */
                        isHoliday: boolean;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        name?: string;
                        /** Format: email */
                        email?: string;
                        phone?: string;
                        internalNotes?: string;
                        tags?: string[];
                        /** @default false */
                        blocked: boolean;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    }) | ({
                        key?: string;
                        value?: unknown;
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        version: number;
                        /** Format: date-time */
                        createdAt?: string;
                        /** Format: date-time */
                        updatedAt?: string;
                    } & {
                        [key: string]: unknown;
                    });
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    ReportsController_reports: {
        parameters: {
            query: {
                to: string;
                from: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: date-time */
                        from: string;
                        /** Format: date-time */
                        to: string;
                        currency: string;
                        totalBookings: number;
                        revenue: number;
                        grossRevenue: number;
                        refundedRevenue: number;
                        cancellationRate: number;
                        noShowRate: number;
                        byStatus: {
                            status: string;
                            _count: {
                                _all: number;
                            };
                        }[];
                        byStaff: {
                            /** Format: uuid */
                            staffId: string;
                            staffName: string;
                            bookings: number;
                            occupiedMinutes: number;
                            availableMinutes: number;
                            scheduledOccupiedMinutes: number;
                            occupancyRate: number | null;
                        }[];
                        byService: {
                            serviceName: string;
                            _count: {
                                _all: number;
                            };
                            _sum: {
                                /** @example 50.00 */
                                price: string | null;
                                durationMinutes: number | null;
                            };
                        }[];
                        peakHours: {
                            [key: string]: number;
                        };
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    ReportsController_csv: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    ReportsController_audit: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            /** Format: uuid */
                            userId: string | null;
                            action: string;
                            entityType: string;
                            /** Format: uuid */
                            entityId: string | null;
                            ip: string | null;
                            requestId: string | null;
                            metadata: unknown;
                            /** Format: date-time */
                            createdAt: string;
                        }[];
                        /** Format: uuid */
                        nextCursor: string | null;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    PaymentsController_instructions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    PaymentsController_list: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            /** Format: uuid */
                            bookingId: string;
                            /** @example 50.00 */
                            amount: string;
                            currency: string;
                            /** @enum {string} */
                            method: "QR" | "TRANSFER" | "CASH";
                            /** @enum {string} */
                            status: "PENDING" | "SUBMITTED" | "CONFIRMED" | "REJECTED" | "REFUNDED" | "RETAINED";
                            receiptAvailable: boolean;
                            /** @example 50.00 */
                            refundedAmount: string;
                            netAmount: number;
                            remainingRefundable: number;
                            receiptMime: string | null;
                            reference: string | null;
                            /** Format: uuid */
                            confirmedById: string | null;
                            /** Format: date-time */
                            confirmedAt: string | null;
                            reason: string | null;
                            version: number;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string;
                        }[];
                        /** Format: uuid */
                        nextCursor: string | null;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    PaymentsController_create: {
        parameters: {
            query?: never;
            header: {
                "idempotency-key": string;
                "x-booking-token": string;
                "X-Booking-Token"?: string;
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    bookingId: string;
                    amount: number;
                    /** @enum {string} */
                    method: "QR" | "TRANSFER" | "CASH";
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        /** Format: uuid */
                        bookingId: string;
                        /** @example 50.00 */
                        amount: string;
                        currency: string;
                        /** @enum {string} */
                        method: "QR" | "TRANSFER" | "CASH";
                        /** @enum {string} */
                        status: "PENDING" | "SUBMITTED" | "CONFIRMED" | "REJECTED" | "REFUNDED" | "RETAINED";
                        receiptAvailable: boolean;
                        /** @example 50.00 */
                        refundedAmount: string;
                        netAmount: number;
                        remainingRefundable: number;
                        receiptMime: string | null;
                        reference: string | null;
                        /** Format: uuid */
                        confirmedById: string | null;
                        /** Format: date-time */
                        confirmedAt: string | null;
                        reason: string | null;
                        version: number;
                        /** Format: date-time */
                        createdAt: string;
                        /** Format: date-time */
                        updatedAt: string;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    PaymentsController_receipt: {
        parameters: {
            query?: never;
            header: {
                "x-booking-token": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "image/webp": string;
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    PaymentsController_upload: {
        parameters: {
            query?: never;
            header: {
                "if-match": string;
                "x-booking-token": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    file: string;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        /** Format: uuid */
                        bookingId: string;
                        /** @example 50.00 */
                        amount: string;
                        currency: string;
                        /** @enum {string} */
                        method: "QR" | "TRANSFER" | "CASH";
                        /** @enum {string} */
                        status: "PENDING" | "SUBMITTED" | "CONFIRMED" | "REJECTED" | "REFUNDED" | "RETAINED";
                        receiptAvailable: boolean;
                        /** @example 50.00 */
                        refundedAmount: string;
                        netAmount: number;
                        remainingRefundable: number;
                        receiptMime: string | null;
                        reference: string | null;
                        /** Format: uuid */
                        confirmedById: string | null;
                        /** Format: date-time */
                        confirmedAt: string | null;
                        reason: string | null;
                        version: number;
                        /** Format: date-time */
                        createdAt: string;
                        /** Format: date-time */
                        updatedAt: string;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    PaymentsController_confirm: {
        parameters: {
            query?: never;
            header: {
                "if-match": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    reason?: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        /** Format: uuid */
                        bookingId: string;
                        /** @example 50.00 */
                        amount: string;
                        currency: string;
                        /** @enum {string} */
                        method: "QR" | "TRANSFER" | "CASH";
                        /** @enum {string} */
                        status: "PENDING" | "SUBMITTED" | "CONFIRMED" | "REJECTED" | "REFUNDED" | "RETAINED";
                        receiptAvailable: boolean;
                        /** @example 50.00 */
                        refundedAmount: string;
                        netAmount: number;
                        remainingRefundable: number;
                        receiptMime: string | null;
                        reference: string | null;
                        /** Format: uuid */
                        confirmedById: string | null;
                        /** Format: date-time */
                        confirmedAt: string | null;
                        reason: string | null;
                        version: number;
                        /** Format: date-time */
                        createdAt: string;
                        /** Format: date-time */
                        updatedAt: string;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    PaymentsController_reject: {
        parameters: {
            query?: never;
            header: {
                "if-match": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    reason?: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        /** Format: uuid */
                        bookingId: string;
                        /** @example 50.00 */
                        amount: string;
                        currency: string;
                        /** @enum {string} */
                        method: "QR" | "TRANSFER" | "CASH";
                        /** @enum {string} */
                        status: "PENDING" | "SUBMITTED" | "CONFIRMED" | "REJECTED" | "REFUNDED" | "RETAINED";
                        receiptAvailable: boolean;
                        /** @example 50.00 */
                        refundedAmount: string;
                        netAmount: number;
                        remainingRefundable: number;
                        receiptMime: string | null;
                        reference: string | null;
                        /** Format: uuid */
                        confirmedById: string | null;
                        /** Format: date-time */
                        confirmedAt: string | null;
                        reason: string | null;
                        version: number;
                        /** Format: date-time */
                        createdAt: string;
                        /** Format: date-time */
                        updatedAt: string;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    PaymentsController_refunds: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header: {
                "x-booking-token": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            /** Format: uuid */
                            id: string;
                            /** @example 50.00 */
                            amount: string;
                            reason: string;
                            /** Format: date-time */
                            createdAt: string;
                        }[];
                        /** Format: uuid */
                        nextCursor: string | null;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    PaymentsController_refund: {
        parameters: {
            query?: never;
            header: {
                "if-match": string;
                "idempotency-key": string;
                "If-Match": string;
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    amount: number;
                    reason: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        /** Format: uuid */
                        bookingId: string;
                        /** @example 50.00 */
                        amount: string;
                        currency: string;
                        /** @enum {string} */
                        method: "QR" | "TRANSFER" | "CASH";
                        /** @enum {string} */
                        status: "PENDING" | "SUBMITTED" | "CONFIRMED" | "REJECTED" | "REFUNDED" | "RETAINED";
                        receiptAvailable: boolean;
                        /** @example 50.00 */
                        refundedAmount: string;
                        netAmount: number;
                        remainingRefundable: number;
                        receiptMime: string | null;
                        reference: string | null;
                        /** Format: uuid */
                        confirmedById: string | null;
                        /** Format: date-time */
                        confirmedAt: string | null;
                        reason: string | null;
                        version: number;
                        /** Format: date-time */
                        createdAt: string;
                        /** Format: date-time */
                        updatedAt: string;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    PaymentsController_retain: {
        parameters: {
            query?: never;
            header: {
                "if-match": string;
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    reason?: string;
                };
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        /** Format: uuid */
                        bookingId: string;
                        /** @example 50.00 */
                        amount: string;
                        currency: string;
                        /** @enum {string} */
                        method: "QR" | "TRANSFER" | "CASH";
                        /** @enum {string} */
                        status: "PENDING" | "SUBMITTED" | "CONFIRMED" | "REJECTED" | "REFUNDED" | "RETAINED";
                        receiptAvailable: boolean;
                        /** @example 50.00 */
                        refundedAmount: string;
                        netAmount: number;
                        remainingRefundable: number;
                        receiptMime: string | null;
                        reference: string | null;
                        /** Format: uuid */
                        confirmedById: string | null;
                        /** Format: date-time */
                        confirmedAt: string | null;
                        reason: string | null;
                        version: number;
                        /** Format: date-time */
                        createdAt: string;
                        /** Format: date-time */
                        updatedAt: string;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CommunityController_notifications: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            /** Format: uuid */
                            id: string;
                            event: string;
                            subject: string;
                            body: string;
                            payload: unknown;
                            /** Format: date-time */
                            readAt: string | null;
                            /** Format: date-time */
                            createdAt: string;
                        }[];
                        /** Format: uuid */
                        nextCursor: string | null;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CommunityController_read: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CommunityController_device: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @enum {string} */
                    platform: "WEB" | "EXPO";
                    token: string;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CommunityController_removeDevice: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CommunityController_waitlist: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            /** Format: uuid */
                            id: string;
                            /** Format: uuid */
                            businessId: string;
                            /** Format: uuid */
                            customerId: string;
                            /** Format: uuid */
                            serviceId: string;
                            /** Format: uuid */
                            locationId: string;
                            /** Format: uuid */
                            staffId: string | null;
                            /** Format: date-time */
                            from: string;
                            /** Format: date-time */
                            to: string;
                            status: string;
                            /** Format: date-time */
                            notifiedAt: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            version: number;
                        }[];
                        /** Format: uuid */
                        nextCursor: string | null;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CommunityController_join: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    serviceId: string;
                    /** Format: uuid */
                    locationId: string;
                    /** Format: uuid */
                    staffId?: string | null;
                    /** Format: date-time */
                    from: string;
                    /** Format: date-time */
                    to: string;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        /** Format: uuid */
                        customerId: string;
                        /** Format: uuid */
                        serviceId: string;
                        /** Format: uuid */
                        locationId: string;
                        /** Format: uuid */
                        staffId: string | null;
                        /** Format: date-time */
                        from: string;
                        /** Format: date-time */
                        to: string;
                        status: string;
                        /** Format: date-time */
                        notifiedAt: string | null;
                        /** Format: date-time */
                        createdAt: string;
                        version: number;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CommunityController_leave: {
        parameters: {
            query?: never;
            header: {
                "if-match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CommunityController_review: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    bookingId: string;
                    rating: number;
                    comment: string;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        id: string;
                        /** Format: uuid */
                        businessId: string;
                        /** Format: uuid */
                        bookingId: string;
                        /** Format: uuid */
                        customerId: string;
                        rating: number;
                        comment: string | null;
                        visible: boolean;
                        /** Format: date-time */
                        createdAt: string;
                    };
                };
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CommunityController_profile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    CommunityController_calendar: {
        parameters: {
            query?: never;
            header: {
                "if-match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Error uniforme RFC 7807 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Error uniforme RFC 7807 */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
}
