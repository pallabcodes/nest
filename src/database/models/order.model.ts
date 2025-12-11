import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { User } from './user.model';
import { OrderItem } from './order-item.model';
import { Payment } from './payment.model';

export enum OrderStatus {
  PENDING = 'pending',
  AWAITING_PAYMENT = 'awaiting_payment',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum OrderType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
}

@Table({
  tableName: 'orders',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'createdAt'],
      name: 'idx_orders_user_created_at',
    },
    {
      fields: ['idempotencyKey'],
      unique: true,
      name: 'uq_orders_idempotency_key',
    },
  ],
})
export class Order extends Model<Order> {
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
    type: DataType.ENUM(...Object.values(OrderStatus)),
    allowNull: false,
    defaultValue: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: DataType.ENUM(...Object.values(OrderType)),
    allowNull: false,
    defaultValue: OrderType.ONE_TIME,
  })
  type: OrderType;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Total amount in minor units (for example cents)',
  })
  totalAmount: number;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
  })
  currency: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'External or client side reference id',
  })
  clientReferenceId: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
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

  @HasMany(() => OrderItem)
  items?: OrderItem[];

  @HasMany(() => Payment)
  payments?: Payment[];
}

