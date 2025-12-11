import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { Order, OrderItem, Payment, Subscription, User, Course } from '@database/models';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeClientProvider } from './stripe-client.provider';

@Module({
  imports: [
    ConfigModule,
    SequelizeModule.forFeature([Order, OrderItem, Payment, Subscription, User, Course]),
  ],
  controllers: [PaymentsController, StripeWebhookController],
  providers: [StripeClientProvider, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

