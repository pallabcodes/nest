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

export enum SocialProvider {
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  GITHUB = 'GITHUB',
}

@Table({
  tableName: 'social_auths',
  timestamps: true,
  updatedAt: false,
})
export class SocialAuth extends Model<SocialAuth> {
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
    type: DataType.ENUM(...Object.values(SocialProvider)),
    allowNull: false,
  })
  provider: SocialProvider;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  providerId: string;

  @CreatedAt
  declare createdAt: Date;

  // Associations
  @BelongsTo(() => User, { foreignKey: 'userId', as: 'user' })
  user: User;
}

