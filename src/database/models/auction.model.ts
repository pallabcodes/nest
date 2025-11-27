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
import { Quotation } from './quotation.model';
import { Player } from './player.model';
import { Team } from './team.model';

@Table({
  tableName: 'auctions',
  timestamps: true,
  indexes: [
    {
      fields: ['name'],
    },
    {
      fields: ['status'],
    },
  ],
})
export class Auction extends Model<Auction> {
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
  status: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  startsAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  endsAt: Date;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @HasMany(() => Quotation, {
    foreignKey: 'auctionId',
    as: 'quotations',
  })
  quotations?: Quotation[];

  @BelongsToMany(() => Player, {
    through: () => Quotation,
    foreignKey: 'auctionId',
    otherKey: 'playerId',
    as: 'players',
  })
  players?: Player[];

  @BelongsToMany(() => Team, {
    through: () => Quotation,
    foreignKey: 'auctionId',
    otherKey: 'teamId',
    as: 'teams',
  })
  teams?: Team[];

  hasStarted(reference: Date = new Date()): boolean {
    return Boolean(this.startsAt && this.startsAt <= reference);
  }

  hasEnded(reference: Date = new Date()): boolean {
    return Boolean(this.endsAt && this.endsAt < reference);
  }

  isRunning(reference: Date = new Date()): boolean {
    if (!this.startsAt || !this.endsAt) {
      return false;
    }
    return this.startsAt <= reference && reference < this.endsAt;
  }
}


