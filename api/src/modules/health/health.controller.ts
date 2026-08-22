import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface HealthReport {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  database: 'up' | 'down';
}

/**
 * Sits outside the `/api/v1` prefix so a platform health check does not have to
 * know the API's versioning scheme.
 */
@ApiTags('health')
@Public()
@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process is running. Never touches the database. */
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness: the process is up *and* the database answers. */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async ready(): Promise<HealthReport> {
    try {
      await this.prisma.ping();
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        uptimeSeconds: Math.floor(process.uptime()),
        database: 'down',
      });
    }

    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      database: 'up',
    };
  }
}
