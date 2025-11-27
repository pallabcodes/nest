import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  BelongsToMany,
  HasMany,
  HasOne,
} from 'sequelize-typescript';
import { Role } from './role.model';
import { UserRole } from './user-role.model';
import { Address } from './address.model';
import { UserProfile } from './user-profile.model';
import { Article } from './article.model';

@Table({
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      fields: ['email'],
      unique: true,
    },
    {
      fields: ['isActive'],
    },
  ],
})
export class User extends Model<User> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  password: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phone: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isEmailVerified: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    comment: 'Avatar file path/URL',
  })
  avatar: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  // Many-to-Many association with Role through UserRole
  @BelongsToMany(() => Role, {
    through: () => UserRole,
    foreignKey: 'userId',
    otherKey: 'roleId',
    as: 'roles',
  })
  roles: Role[];

  @HasMany(() => Address, {
    foreignKey: 'userId',
    as: 'addresses',
  })
  addresses?: Address[];

  @HasOne(() => UserProfile, {
    foreignKey: 'userId',
    as: 'profile',
  })
  profile?: UserProfile;

  @HasMany(() => Article, {
    foreignKey: 'authorId',
    as: 'authoredArticles',
  })
  authoredArticles?: Article[];

  @HasMany(() => Article, {
    foreignKey: 'editorId',
    as: 'editedArticles',
  })
  editedArticles?: Article[];

  // Helper method to check if user has a specific role
  hasRole(roleName: string): boolean {
    return this.roles?.some((role) => role.name === roleName);
  }

  // Helper method to check if user has any of the specified roles
  hasAnyRole(roleNames: string[]): boolean {
    return this.roles?.some((role) => roleNames.includes(role.name));
  }
}
