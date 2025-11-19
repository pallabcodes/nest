import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  CreatedAt,
} from 'sequelize-typescript';
// Circular dependency prevention: Arrow function in @BelongsTo(() => User) defers evaluation
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
})
export class Otp extends Model<Otp> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
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

  @CreatedAt
  declare createdAt: Date;

  // Associations
  @BelongsTo(() => User, { foreignKey: 'userId', as: 'user' })
  user: User;
}

