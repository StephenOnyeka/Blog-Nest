import { Controller, Post, Get, Delete, Body, Query } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  async subscribe(@Body() body: { email: string; topics?: string[]; newsletter?: boolean }) {
    return this.subscriptionsService.subscribe(body.email, body.topics, body.newsletter);
  }

  @Get('verify')
  async verify(@Query('token') token: string) {
    return this.subscriptionsService.verify(token);
  }

  @Delete('unsubscribe')
  async unsubscribe(@Query('token') token: string) {
    return this.subscriptionsService.unsubscribe(token);
  }
}
