import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RateLimitService } from '../common/rate-limit';
@Controller()
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RateLimitService) private readonly limiter: RateLimitService,
  ) {}
  @Get('health') health() {
    return { status: 'ok', service: 'reservas-api' };
  }
  @Get('ready') async ready() {
    try {
      await Promise.all([
        this.prisma.business.findFirst({ select: { id: true } }),
        this.limiter.ready(),
      ]);
      return { status: 'ready', database: 'connected' };
    } catch {
      throw new ServiceUnavailableException('Una dependencia requerida no está disponible.');
    }
  }
}
