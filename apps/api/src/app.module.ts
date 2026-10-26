import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health/health.controller';
import { BookingsModule } from './bookings/bookings.module';
import { AvailabilityModule } from './availability/availability.module';
import { OperationsModule } from './operations/operations.module';
@Module({
  imports: [
    CommonModule,
    AuthModule,
    UsersModule,
    BookingsModule,
    AvailabilityModule,
    OperationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
