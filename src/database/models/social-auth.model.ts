import { Table, Column, Model, DataType, BelongsTo, CreatedAt } from 'sequelize-typescript';
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
  indexes: [
    {
      fields: ['userId'],
    },
    {
      fields: ['provider', 'providerId'],
      unique: true,
      name: 'unique_provider_identity',
    },
  ],
})
export class SocialAuth extends Model<SocialAuth> {
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
