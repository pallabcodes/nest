import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  BelongsToMany,
} from 'sequelize-typescript';
// Circular dependency prevention: Arrow functions in decorators defer evaluation
import { User } from './user.model';
import { UserRole } from './user-role.model';

@Table({
  tableName: 'roles',
  timestamps: true,
})
export class Role extends Model<Role> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [1, 100],
    },
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    validate: {
      len: [0, 500],
    },
  })
  description: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
    comment: 'Optional permissions metadata (e.g., ["users:read", "users:write"])',
  })
  permissions: string[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  // Many-to-Many association with User through UserRole
  // Using arrow function prevents circular dependency
  @BelongsToMany(() => User, {
    through: () => UserRole,
    foreignKey: 'roleId',
    otherKey: 'userId',
    as: 'users',
  })
  users: User[];
}

