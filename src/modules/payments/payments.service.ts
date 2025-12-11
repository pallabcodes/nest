import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Order, OrderStatus, OrderType } from '@database/models';
import { OrderItem } from '@database/models';
import { Payment, PaymentStatus, PaymentProvider } from '@database/models';
import { Subscription, SubscriptionStatus } from '@database/models';
import { Course } from '@database/models';
import { CreateCheckoutDto, CheckoutMode, PurchasableType } from './dto/create-checkout.dto';
import { CheckoutResponseDto } from './dto/checkout-response.dto';
import { ListPaymentsDto, ListPaymentsQueryDto, PaymentSummaryDto } from './dto/payment.dto';
import { StripeClientProvider } from './stripe-client.provider';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly defaultCurrency: string;
  private readonly supportedCurrencies: string[];
  private readonly successUrl: string;
  private readonly cancelUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly stripeClientProvider: StripeClientProvider,
    @InjectModel(Order)
    private readonly orderModel: typeof Order,
    @InjectModel(OrderItem)
    private readonly orderItemModel: typeof OrderItem,
    @InjectModel(Payment)
    private readonly paymentModel: typeof Payment,
    @InjectModel(Subscription)
    private readonly subscriptionModel: typeof Subscription,
    @InjectModel(Course)
    private readonly courseModel: typeof Course,
  ) {
    this.stripe = this.stripeClientProvider.getClient();
    const stripeConfig = this.configService.get('stripe') as any;
    this.defaultCurrency = stripeConfig?.defaultCurrency || 'usd';
    this.supportedCurrencies = stripeConfig?.supportedCurrencies || ['usd'];
    this.successUrl = stripeConfig?.successUrl;
    this.cancelUrl = stripeConfig?.cancelUrl;
  }

  async createCheckoutSessionForOrder(
    userId: number,
    dto: CreateCheckoutDto,
  ): Promise<CheckoutResponseDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    // For now, single currency per order; all items must be in default currency
    const currency = this.ensureSupportedCurrency(this.defaultCurrency);

    // Resolve items and pricing from domain models
    const resolvedItems = await this.resolveItems(dto.items, currency);

    const totalAmount = resolvedItems.reduce(
      (sum, item) => sum + item.unitAmount * item.quantity,
      0,
    );

    if (totalAmount <= 0) {
      throw new BadRequestException('Order amount must be greater than zero');
    }

    const idempotencyKey = this.buildOrderIdempotencyKey(userId, dto, totalAmount, currency);

    // Create order
    const order = await this.orderModel.create({
      userId,
      status: OrderStatus.AWAITING_PAYMENT,
      type: dto.mode === CheckoutMode.SUBSCRIPTION ? OrderType.SUBSCRIPTION : OrderType.ONE_TIME,
      totalAmount,
      currency,
      clientReferenceId: dto.clientReferenceId || null,
      idempotencyKey,
      metadata: null,
    });

    // Create order items
    for (const item of resolvedItems) {
      await this.orderItemModel.create({
        orderId: order.id,
        purchasableType: item.purchasableType,
        purchasableId: item.purchasableId,
        quantity: item.quantity,
        unitAmount: item.unitAmount,
        currency,
        metadata: null,
      });
    }

    // Create payment placeholder
    const paymentIdempotencyKey = this.buildPaymentIdempotencyKey(order.id, userId, totalAmount, currency);
    const payment = await this.paymentModel.create({
      orderId: order.id,
      userId,
      provider: PaymentProvider.STRIPE,
      status: PaymentStatus.REQUIRES_PAYMENT_METHOD,
      amount: totalAmount,
      currency,
      idempotencyKey: paymentIdempotencyKey,
      stripePaymentIntentId: null,
      stripeCheckoutSessionId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      metadata: null,
    });

    // Build Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = resolvedItems.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency,
        unit_amount: item.unitAmount,
        product_data: {
          name: item.name,
        },
      },
    }));

    const mode: Stripe.Checkout.SessionCreateParams.Mode =
      dto.mode === CheckoutMode.SUBSCRIPTION ? 'subscription' : 'payment';

    const session = await this.stripe.checkout.sessions.create(
      {
        mode,
        line_items: lineItems,
        success_url: this.successUrl,
        cancel_url: this.cancelUrl,
        client_reference_id: String(order.id),
        metadata: {
          orderId: String(order.id),
          paymentId: String(payment.id),
          userId: String(userId),
        },
      },
      {
        idempotencyKey: paymentIdempotencyKey,
      },
    );

    await payment.update({
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      status: PaymentStatus.REQUIRES_ACTION,
    });

    return {
      checkoutUrl: session.url as string,
      orderId: order.id,
      paymentId: payment.id,
    };
  }

  async getPaymentForUser(paymentId: number, userId: number): Promise<PaymentSummaryDto | null> {
    const payment = await this.paymentModel.findOne({
      where: {
        id: paymentId,
        userId,
      },
    });

    if (!payment) {
      return null;
    }

    return this.mapPaymentToSummary(payment);
  }

  async listPaymentsForUser(
    userId: number,
    query: ListPaymentsQueryDto,
  ): Promise<ListPaymentsDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 && query.limit <= 100 ? query.limit : 20;
    const offset = (page - 1) * limit;

    const { rows, count } = await this.paymentModel.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      items: rows.map((p) => this.mapPaymentToSummary(p)),
      total: count,
      page,
      limit,
    };
  }

  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const orderIdFromMetadata = session.metadata?.orderId;
    const paymentIdFromMetadata = session.metadata?.paymentId;

    let payment: Payment | null = null;

    if (paymentIdFromMetadata) {
      payment = await this.paymentModel.findByPk(Number(paymentIdFromMetadata));
    }

    if (!payment && orderIdFromMetadata) {
      payment = await this.paymentModel.findOne({
        where: {
          orderId: Number(orderIdFromMetadata),
          stripeCheckoutSessionId: session.id,
        },
      });
    }

    if (!payment) {
      return;
    }

    const order = await this.orderModel.findByPk(payment.orderId);
    if (!order) {
      return;
    }

    const amountTotal = session.amount_total ?? null;
    const currency = session.currency ?? payment.currency;

    await payment.update({
      status: PaymentStatus.SUCCEEDED,
      amount: amountTotal ?? payment.amount,
      currency,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string' ? session.payment_intent : payment.stripePaymentIntentId,
    });

    if (
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.REFUNDED &&
      order.status !== OrderStatus.PARTIALLY_REFUNDED
    ) {
      await order.update({ status: OrderStatus.PAID });
    }

    if (session.mode === 'subscription' && session.subscription && typeof session.subscription === 'string') {
      await this.upsertSubscriptionFromStripe(session.subscription, payment.userId, currency || this.defaultCurrency);
    }
  }

  async handlePaymentIntentFailed(intent: Stripe.PaymentIntent): Promise<void> {
    if (!intent.id) {
      return;
    }

    const payment = await this.paymentModel.findOne({
      where: { stripePaymentIntentId: intent.id },
    });

    if (!payment) {
      return;
    }

    await payment.update({
      status: PaymentStatus.FAILED,
    });

    const order = await this.orderModel.findByPk(payment.orderId);
    if (!order) {
      return;
    }

    const successfulPayments = await this.paymentModel.count({
      where: {
        orderId: order.id,
        status: PaymentStatus.SUCCEEDED,
      },
    });

    if (successfulPayments === 0 && order.status === OrderStatus.AWAITING_PAYMENT) {
      await order.update({ status: OrderStatus.FAILED });
    }
  }

  async handleSubscriptionEvent(subscription: Stripe.Subscription): Promise<void> {
    if (!subscription.id || !subscription.customer) {
      return;
    }

    const userId = this.extractUserIdFromSubscription(subscription);
    if (!userId) {
      return;
    }

    const status = this.mapStripeSubscriptionStatus(subscription.status);

    const periodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : null;
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    const currency = subscription.items.data[0]?.price?.currency ?? null;
    const priceId = subscription.items.data[0]?.price?.id ?? null;
    const productId =
      (subscription.items.data[0]?.price?.product as string | undefined) ?? null;

    const existing = await this.subscriptionModel.findOne({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (existing) {
      await existing.update({
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        currency,
        priceId,
        productId,
      });
    } else {
      await this.subscriptionModel.create({
        userId,
        stripeSubscriptionId: subscription.id,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        currency,
        priceId,
        productId,
        metadata: null,
      });
    }
  }

  private ensureSupportedCurrency(currency: string): string {
    const normalized = currency.toLowerCase();
    if (!this.supportedCurrencies.includes(normalized)) {
      throw new BadRequestException(`Currency ${currency} is not supported`);
    }
    return normalized;
  }

  private mapPaymentToSummary(payment: Payment): PaymentSummaryDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: payment.createdAt,
    };
  }

  private async resolveItems(
    items: { type: PurchasableType; id: number; quantity: number }[],
    currency: string,
  ): Promise<
    Array<{
      purchasableType: string;
      purchasableId: number;
      quantity: number;
      unitAmount: number;
      name: string;
    }>
  > {
    const resolved: Array<{
      purchasableType: string;
      purchasableId: number;
      quantity: number;
      unitAmount: number;
      name: string;
    }> = [];

    for (const item of items) {
      if (item.type === PurchasableType.COURSE) {
        const course = await this.courseModel.findByPk(item.id);
        if (!course) {
          throw new BadRequestException(`Course ${item.id} not found`);
        }
        if (course.price == null || typeof course.price !== 'number') {
          throw new BadRequestException('Course pricing is not configured correctly');
        }
        const unitAmount = course.price;
        resolved.push({
          purchasableType: 'course',
          purchasableId: course.id,
          quantity: item.quantity,
          unitAmount,
          name: (course as any).title || course.id.toString(),
        });
      } else {
        throw new BadRequestException(`Unsupported purchasable type ${item.type}`);
      }
    }

    return resolved;
  }

  private buildOrderIdempotencyKey(
    userId: number,
    dto: CreateCheckoutDto,
    totalAmount: number,
    currency: string,
  ): string {
    const itemsKey = dto.items
      .map((i) => `${i.type}:${i.id}:${i.quantity}`)
      .sort()
      .join('|');
    return `order:${userId}:${currency}:${totalAmount}:${itemsKey}`;
  }

  private buildPaymentIdempotencyKey(
    orderId: number,
    userId: number,
    amount: number,
    currency: string,
  ): string {
    return `payment:${orderId}:${userId}:${currency}:${amount}`;
  }

  private async upsertSubscriptionFromStripe(
    stripeSubscriptionId: string,
    userId: number,
    currency: string,
  ): Promise<void> {
    const remote = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    await this.handleSubscriptionEvent(remote);
  }

  private extractUserIdFromSubscription(subscription: Stripe.Subscription): number | null {
    const metadataUserId = subscription.metadata?.userId;
    if (metadataUserId) {
      const parsed = Number(metadataUserId);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private mapStripeSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    switch (stripeStatus) {
      case 'incomplete':
        return SubscriptionStatus.INCOMPLETE;
      case 'incomplete_expired':
        return SubscriptionStatus.INCOMPLETE_EXPIRED;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'unpaid':
        return SubscriptionStatus.UNPAID;
      default:
        return SubscriptionStatus.UNPAID;
    }
  }
}

