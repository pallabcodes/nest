import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const STRIPE_CLIENT = 'STRIPE_CLIENT';

@Injectable()
export class StripeClientProvider {
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (!secretKey) {
      throw new Error('Stripe secret key (stripe.secretKey) is not configured');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-01-27.acacia',
      typescript: true,
    });
  }

  getClient(): Stripe {
    return this.stripe;
  }
}

