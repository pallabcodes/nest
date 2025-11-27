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
import { Player } from './player.model';
import { Quotation } from './quotation.model';

@Table({
  tableName: 'teams',
  timestamps: true,
  indexes: [
    {
      fields: ['name'],
      unique: true,
    },
    {
      fields: ['isActive'],
    },
  ],
})
export class Team extends Model<Team> {
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
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  city: string;

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
    foreignKey: 'teamId',
    as: 'quotations',
  })
  quotations?: Quotation[];

  @BelongsToMany(() => Player, {
    through: () => Quotation,
    foreignKey: 'teamId',
    otherKey: 'playerId',
    as: 'players',
  })
  players?: Player[];

  isActiveTeam(): boolean {
    return this.isActive;
  }
}


