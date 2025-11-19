import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  CreatedAt,
  BelongsTo,
  AutoIncrement,
} from 'sequelize-typescript';
// Circular dependency prevention: Arrow functions in decorators defer evaluation
import { User } from './user.model';
import { Role } from './role.model';

@Table({
  tableName: 'user_roles',
  timestamps: true,
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'roleId'],
      name: 'unique_user_role',
    },
  ],
})
export class UserRole extends Model<UserRole> {
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

  @ForeignKey(() => Role)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  roleId: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'ID of the user who assigned this role (for audit trail)',
  })
  assignedBy: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    comment: 'Optional reason or context for role assignment',
  })
  reason: string;

  @CreatedAt
  declare assignedAt: Date;

  // Associations
  @BelongsTo(() => User, { foreignKey: 'userId', as: 'user' })
  user: User;

  @BelongsTo(() => Role, { foreignKey: 'roleId', as: 'role' })
  role: Role;

  // Optional: User who assigned this role (for audit trail)
  @BelongsTo(() => User, { foreignKey: 'assignedBy', as: 'assigner' })
  assigner?: User;
}

