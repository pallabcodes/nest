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

@Table({
  tableName: 'user_profiles',
  timestamps: true,
  indexes: [
    {
      fields: ['userId'],
      unique: true,
      name: 'idx_user_profiles_user_unique',
    },
  ],
})
export class UserProfile extends Model<UserProfile> {
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
    allowNull: true,
  })
  bio: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  avatarUrl: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => User, { foreignKey: 'userId', as: 'user' })
  user: User;

  isEmpty(): boolean {
    return !this.bio && !this.avatarUrl;
  }
}


