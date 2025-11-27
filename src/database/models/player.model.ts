import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { Team } from './team.model';
import { Quotation } from './quotation.model';

@Table({
  tableName: 'players',
  timestamps: true,
  indexes: [
    {
      fields: ['name'],
    },
    {
      fields: ['isActive'],
    },
  ],
})
export class Player extends Model<Player> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  position: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  country: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  isActive: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @HasMany(() => Quotation, {
    foreignKey: 'playerId',
    as: 'quotations',
  })
  quotations?: Quotation[];

  @BelongsToMany(() => Team, {
    through: () => Quotation,
    foreignKey: 'playerId',
    otherKey: 'teamId',
    as: 'teams',
  })
  teams?: Team[];

  isActivePlayer(): boolean {
    return this.isActive;
  }
}


