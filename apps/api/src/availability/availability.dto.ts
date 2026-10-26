import { ApiProperty } from '@nestjs/swagger';

export class AvailabilitySegmentDto {
  @ApiProperty({ type: String, format: 'uuid' }) serviceId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) staffId!: string;
  @ApiProperty({ type: String, format: 'date-time' }) startAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) endAt!: string;
  @ApiProperty({ type: Number }) bufferBeforeMinutes!: number;
  @ApiProperty({ type: Number }) bufferAfterMinutes!: number;
}
export class AvailabilitySlotDto {
  @ApiProperty({ type: String, format: 'uuid' }) staffId!: string;
  @ApiProperty({ type: [String] }) staffIds!: string[];
  @ApiProperty({ type: String, format: 'uuid' }) locationId!: string;
  @ApiProperty({ type: String, format: 'date-time' }) startAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) endAt!: string;
  @ApiProperty({ type: Number }) remainingCapacity!: number;
  @ApiProperty({
    type: Number,
    description: 'Total calculado por la API con los precios de cada profesional',
  })
  totalAmount!: number;
  @ApiProperty({ type: Number }) depositAmount!: number;
  @ApiProperty({ type: [AvailabilitySegmentDto] }) segments!: AvailabilitySegmentDto[];
}
export class AvailabilityResponseDto {
  @ApiProperty({ type: [AvailabilitySlotDto] }) data!: AvailabilitySlotDto[];
  @ApiProperty({ type: String }) timezone!: string;
}
