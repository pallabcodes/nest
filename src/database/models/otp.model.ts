import { Table, Column, Model, DataType, BelongsTo, CreatedAt } from 'sequelize-typescript';
import { User } from './user.model';

export enum OtpType {
  LOGIN = 'LOGIN',
  RESET = 'RESET',
  VERIFY = 'VERIFY',
}

@Table({
  tableName: 'otps',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      fields: ['code'],
    },
    {
      fields: ['userId', 'type', 'isUsed', 'expiresAt'],
      name: 'idx_otps_user_type_is_used_expires',
    },
  ],
})
export class Otp extends Model<Otp> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  userId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  code: string;

  @Column({
    type: DataType.ENUM(...Object.values(OtpType)),
    allowNull: false,
  })
  type: OtpType;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  expiresAt: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isUsed: boolean;

  @CreatedAt
  declare createdAt: Date;

  // Associations
  @BelongsTo(() => User, { foreignKey: 'userId', as: 'user' })
  user: User;
}
