import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AvailabilitySegmentDto } from '../availability/availability.dto';

export class BookingItemDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) serviceId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) staffId!: string;
  @ApiProperty({ type: String }) serviceName!: string;
  @ApiProperty({ type: Number }) durationMinutes!: number;
  @ApiProperty({ type: Number }) bufferBeforeMinutes!: number;
  @ApiProperty({ type: Number }) bufferAfterMinutes!: number;
  @ApiProperty({ type: String, example: '50.00', description: 'Monto decimal en bolivianos' })
  price!: string;
  @ApiProperty({ type: String }) depositAmount!: string;
  @ApiProperty({ type: Number }) capacity!: number;
  @ApiProperty({ type: Number }) position!: number;
  @ApiProperty({ type: String, format: 'date-time' }) startAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) endAt!: string;
}
export class BookingLocationDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) address!: string;
  @ApiProperty({ type: String, example: 'America/La_Paz' }) timezone!: string;
}
export class BookingStaffDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) name!: string;
}
export class BookingCustomerDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String, format: 'email' }) email!: string;
  @ApiProperty({ type: String }) phone!: string;
}
export class BookingDto {
  @ApiProperty({
    type: Boolean,
    description:
      'Permiso del actor para gestionar la cita completa; las políticas de plazo se verifican al modificar',
  })
  canManage!: boolean;
  @ApiProperty({ type: Boolean }) mixedStaff!: boolean;
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, example: '7MZK3PW9' }) code!: string;
  @ApiProperty({ type: String, format: 'uuid' }) businessId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) locationId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) staffId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) customerId!: string;
  @ApiProperty({
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'],
  })
  status!: string;
  @ApiProperty({ type: String, enum: ['WEB', 'MOBILE', 'ADMIN', 'WALK_IN'] }) source!: string;
  @ApiProperty({ type: String, format: 'date-time' }) startAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) endAt!: string;
  @ApiProperty({ type: String, example: 'BOB' }) currency!: string;
  @ApiProperty({ type: String }) totalAmount!: string;
  @ApiProperty({ type: String }) depositAmount!: string;
  @ApiProperty({ type: Number }) version!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) expiresAt!: string | null;
  @ApiProperty({ type: [BookingItemDto] }) items!: BookingItemDto[];
  @ApiProperty({ type: BookingLocationDto }) location!: BookingLocationDto;
  @ApiProperty({ type: BookingStaffDto }) staff!: BookingStaffDto;
  @ApiPropertyOptional({
    type: BookingCustomerDto,
    description:
      'Disponible solo para el usuario autenticado autorizado, nunca para enlaces de invitado',
  })
  customer?: BookingCustomerDto;
  @ApiPropertyOptional({
    type: String,
    description: 'Token de gestión entregado únicamente al crear la reserva',
  })
  manageToken?: string;
}
export class BookingPageDto {
  @ApiProperty({ type: [BookingDto] }) data!: BookingDto[];
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) nextCursor!: string | null;
}
export class HoldDto {
  @ApiProperty({ type: [String] }) staffIds!: string[];
  @ApiProperty({ type: [AvailabilitySegmentDto] }) segments!: AvailabilitySegmentDto[];
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) holdToken!: string;
  @ApiProperty({ type: String, format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ type: String, format: 'uuid' }) staffId!: string;
  @ApiProperty({ type: String, format: 'date-time' }) startAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) endAt!: string;
}
