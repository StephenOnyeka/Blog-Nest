import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';
import * as crypto from 'crypto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {}

  async subscribe(email: string, topics: string[] = [], newsletter = true) {
    let subscription = await this.subscriptionRepo.findOne({ where: { email } });

    if (subscription) {
      // Update existing subscription
      subscription.topics = topics;
      subscription.newsletter = newsletter;
      await this.subscriptionRepo.save(subscription);
      return { success: true, verified: subscription.verified };
    }

    // Create new subscription with a verification token
    const token = crypto.randomBytes(32).toString('hex');
    subscription = this.subscriptionRepo.create({ email, topics, newsletter, token, verified: false });
    await this.subscriptionRepo.save(subscription);

    // In production you would send a verification email here
    console.log(`[Subscriptions] Verification token for ${email}: ${token}`);
    return { success: true, verified: false };
  }

  async verify(token: string) {
    const subscription = await this.subscriptionRepo.findOne({ where: { token } });
    if (!subscription) return { success: false };

    subscription.verified = true;
    subscription.token = null;
    await this.subscriptionRepo.save(subscription);
    return { success: true };
  }

  async unsubscribe(token: string) {
    const subscription = await this.subscriptionRepo.findOne({ where: { token } });
    if (!subscription) return { success: false };

    await this.subscriptionRepo.remove(subscription);
    return { success: true };
  }
}
