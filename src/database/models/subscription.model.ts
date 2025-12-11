import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from './user.model';

export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

@Table({
  tableName: 'subscriptions',
  timestamps: true,
  indexes: [
    {
      fields: ['userId'],
      name: 'idx_subscriptions_user_id',
    },
    {
      fields: ['stripeSubscriptionId'],
      unique: true,
      name: 'uq_subscriptions_stripe_subscription_id',
    },
  ],
})
export class Subscription extends Model<Subscription> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  stripeSubscriptionId: string;

  @Column({
    type: DataType.ENUM(...Object.values(SubscriptionStatus)),
    allowNull: false,
  })
  status: SubscriptionStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  currentPeriodStart: Date | null;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  currentPeriodEnd: Date | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  cancelAtPeriodEnd: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  canceledAt: Date | null;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
  })
  currency: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Stripe price id',
  })
  priceId: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Stripe product id',
  })
  productId: string | null;

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

