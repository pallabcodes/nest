import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { User } from './user.model';

@Table({
  tableName: 'addresses',
  timestamps: true,
  indexes: [
    {
      fields: ['userId'],
    },
    {
      fields: ['userId', 'isPrimary'],
      name: 'idx_addresses_user_primary',
    },
  ],
})
export class Address extends Model<Address> {
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

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  line1: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  line2: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  city: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  state: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  country: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  postalCode: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isPrimary: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => User, { foreignKey: 'userId', as: 'user' })
  user: User;
}


