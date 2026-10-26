export type Service = {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: string | number;
  depositAmount?: string | number;
  categoryId?: string;
  capacity: number;
  active: boolean;
  onlineBookable: boolean;
};
export type Staff = {
  id: string;
  name: string;
  bio?: string;
  photoUrl?: string;
  locationId: string;
  services?: { serviceId: string }[];
  staffServices?: { serviceId: string; durationMinutes?: number; price?: number | string }[];
  workingHours?: { dayOfWeek: number; startMinute: number; endMinute: number }[];
};
export type Location = {
  id: string;
  name: string;
  address: string;
  timezone: string;
  mapUrl?: string;
};
export type Catalog = {
  business: {
    id: string;
    name: string;
    description?: string;
    logoUrl?: string;
    brandColor?: string;
    phone?: string;
    featureFlags?: { multiStaffBookings?: boolean };
  };
  locations: Location[];
  services: Service[];
  staff: Staff[];
  reviews: { id: string; rating: number; comment?: string; customer?: { name: string } }[];
};
export type Slot = {
  staffId: string;
  staffIds?: string[];
  segments?: { serviceId: string; staffId: string; startAt: string; endAt: string }[];
  startAt: string;
  endAt: string;
  remainingCapacity: number;
  totalAmount?: number;
  depositAmount?: number;
};
export type User = {
  id: string;
  businessId: string;
  role: 'CLIENT' | 'STAFF' | 'ADMIN' | 'OWNER' | 'SUPERADMIN';
  name: string;
  email: string;
  staffId?: string;
  customerId?: string;
};
export type Booking = {
  id: string;
  code: string;
  status: string;
  startAt: string;
  endAt: string;
  version: number;
  staffId: string;
  locationId: string;
  totalAmount: number | string;
  depositAmount: number | string;
  manageToken?: string;
  canManage?: boolean;
  mixedStaff?: boolean;
  customer?: { name: string; phone: string; email: string };
  staff?: { name: string };
  location?: Location;
  items?: {
    serviceId?: string;
    staffId?: string;
    startAt?: string;
    endAt?: string;
    position?: number;
    serviceName?: string;
    name?: string;
    service?: { name: string };
  }[];
  payments?: { id: string; amount: string; status: string; method: string; version: number }[];
};
export const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
  EXPIRED: 'Vencida',
};
export const money = (value: number | string) =>
  new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    currencyDisplay: 'narrowSymbol',
  }).format(Number(value));
export const dateLabel = (value: string, timezone = 'America/La_Paz') =>
  new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeZone: timezone }).format(
    new Date(value),
  );
export const timeLabel = (value: string, timezone = 'America/La_Paz') =>
  new Intl.DateTimeFormat('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value));
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'No pudimos completar la solicitud. Inténtalo de nuevo.';
}
