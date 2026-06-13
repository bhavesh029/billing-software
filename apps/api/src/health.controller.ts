import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  ok() {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
