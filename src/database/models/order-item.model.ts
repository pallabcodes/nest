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
import { Order } from './order.model';

@Table({
  tableName: 'order_items',
  timestamps: true,
  indexes: [
    {
      fields: ['orderId'],
      name: 'idx_order_items_order_id',
    },
    {
      fields: ['purchasableType', 'purchasableId'],
      name: 'idx_order_items_purchasable',
    },
  ],
})
export class OrderItem extends Model<OrderItem> {
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

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    comment: 'Type of the purchasable entity, for example course, plan',
  })
  purchasableType: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'Id of the purchasable entity',
  })
  purchasableId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  quantity: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    comment: 'Unit amount in minor units',
  })
  unitAmount: number;

  @Column({
    type: DataType.STRING(10),
    allowNull: false,
  })
  currency: string;

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

