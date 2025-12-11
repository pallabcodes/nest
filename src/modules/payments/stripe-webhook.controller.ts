import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentsService } from './payments.service';
import { StripeClientProvider } from './stripe-client.provider';

@Controller('payments')
export class StripeWebhookController {
  private readonly webhookSecret: string;
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    private readonly stripeClientProvider: StripeClientProvider,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (!secretKey) {
      throw new Error('Stripe secret key (stripe.secretKey) is not configured');
    }
    this.webhookSecret = this.configService.get<string>('stripe.webhookSecret') || '';
    this.stripe = this.stripeClientProvider.getClient();
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: any,
    @Body() body: any,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    let event: Stripe.Event;

    if (!this.webhookSecret) {
      // In development without webhook secret, trust parsed body (not recommended for production)
      event = body as Stripe.Event;
    } else {
      const possibleRawBody =
        (req as any).rawBody ||
        (req.rawBody as Buffer | undefined) ||
        (req.raw as Buffer | undefined) ||
        (req.body instanceof Buffer ? req.body : undefined);

      if (!possibleRawBody) {
        throw new Error('Raw body is required for Stripe webhook verification');
      }

      event = this.stripe.webhooks.constructEvent(
        possibleRawBody,
        signature,
        this.webhookSecret,
      );
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.paymentsService.handleCheckoutSessionCompleted(session);
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.paymentsService.handlePaymentIntentFailed(intent);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.paymentsService.handleSubscriptionEvent(subscription);
        break;
      }
      default:
        break;
    }

    return { received: true };
  }
}

