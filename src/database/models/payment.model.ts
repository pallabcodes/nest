import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { User } from './user.model';
import { Order } from './order.model';

export enum PaymentStatus {
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
}

@Table({
  tableName: 'payments',
  timestamps: true,
  indexes: [
    {
      fields: ['orderId'],
      name: 'idx_payments_order_id',
    },
    {
      fields: ['userId'],
      name: 'idx_payments_user_id',
    },
    {
      fields: ['stripePaymentIntentId'],
      unique: true,
      name: 'uq_payments_stripe_payment_intent_id',
    },
    {
      fields: ['stripeCheckoutSessionId'],
      unique: true,
      name: 'uq_payments_stripe_checkout_session_id',
    },
    {
      fields: ['idempotencyKey'],
      unique: true,
      name: 'uq_payments_idempotency_key',
    },
  ],
})
export class Payment extends Model<Payment> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @ForeignKey(() => Order)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  orderId: number;

  @BelongsTo(() => Order)
  order: Order;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentProvider)),
    allowNull: false,
    defaultValue: PaymentProvider.STRIPE,
  })
  provider: PaymentProvider;

  @Column({
    type: DataType.ENUM(...Object.values(PaymentStatus)),
    allowNull: false,
    defaultValue: PaymentStatus.REQUIRES_PAYMENT_METHOD,
  })
  status: PaymentStatus;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Payment amount in minor units',
  })
  amount: number;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
  })
  currency: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  stripePaymentIntentId: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  stripeCheckoutSessionId: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  stripeCustomerId: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  stripeSubscriptionId: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  idempotencyKey: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  metadata: Record<string, unknown> | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}

