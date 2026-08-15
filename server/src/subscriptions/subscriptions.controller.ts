import { Controller, Post, Get, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Subscribe email to newsletter and topics' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'subscriber@example.com' },
        topics: { type: 'array', items: { type: 'string' }, example: ['Technology', 'Design'] },
        newsletter: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Subscription created and verification email sent' })
  async subscribe(@Body() body: { email: string; topics?: string[]; newsletter?: boolean }) {
    return this.subscriptionsService.subscribe(body.email, body.topics, body.newsletter);
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verify email subscription via token' })
  @ApiQuery({ name: 'token', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Subscription verified' })
  async verify(@Query('token') token: string) {
    return this.subscriptionsService.verify(token);
  }

  @Delete('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe email subscription via token' })
  @ApiQuery({ name: 'token', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Unsubscribed successfully' })
  async unsubscribe(@Query('token') token: string) {
    return this.subscriptionsService.unsubscribe(token);
  }
}
