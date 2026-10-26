import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard, OptionalAuthGuard, RolesGuard } from './auth.guard';
import { PrismaService } from './prisma.service';
import { RateLimitService } from './rate-limit';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [PrismaService, AuthGuard, OptionalAuthGuard, RolesGuard, RateLimitService],
  exports: [PrismaService, JwtModule, AuthGuard, OptionalAuthGuard, RolesGuard, RateLimitService],
})
export class CommonModule {}
