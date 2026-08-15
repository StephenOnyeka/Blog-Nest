import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health Check')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check / root endpoint' })
  @ApiResponse({ status: 200, description: 'API Server is healthy' })
  getHello(): string {
    return this.appService.getHello();
  }
}
