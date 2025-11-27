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
import { Player } from './player.model';
import { Team } from './team.model';
import { Auction } from './auction.model';

export enum QuotationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Table({
  tableName: 'quotations',
  timestamps: true,
  indexes: [
    {
      fields: ['playerId'],
    },
    {
      fields: ['teamId'],
    },
    {
      fields: ['playerId', 'teamId'],
      name: 'idx_quotations_player_team',
    },
    {
      fields: ['auctionId'],
    },
    {
      fields: ['auctionId', 'playerId'],
      name: 'idx_quotations_auction_player',
    },
    // unique `index` i.e. below (auctionId, playerId, teamId) to ensure one current row per team inside that session.
    {
      fields: ['auctionId', 'playerId', 'teamId'],
      name: 'idx_quotations_auction_player_team',
      unique: true,
    },
    {
      fields: ['status'],
    },
  ],
})
export class Quotation extends Model<Quotation> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @ForeignKey(() => Auction)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  auctionId: number;

  @ForeignKey(() => Player)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  playerId: number;

  @ForeignKey(() => Team)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  teamId: number;

  @Column({
    type: DataType.DECIMAL(15, 2),
    allowNull: false,
  })
  amount: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'USD',
  })
  currency: string;

  @Column({
    type: DataType.ENUM(...Object.values(QuotationStatus)),
    allowNull: false,
    defaultValue: QuotationStatus.PENDING,
  })
  status: QuotationStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  expiresAt: Date;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => Player, { foreignKey: 'playerId', as: 'player' })
  player: Player;

  @BelongsTo(() => Team, { foreignKey: 'teamId', as: 'team' })
  team: Team;

  @BelongsTo(() => Auction, { foreignKey: 'auctionId', as: 'auction' })
  auction?: Auction;

  isPending(): boolean {
    return this.status === QuotationStatus.PENDING;
  }

  isAccepted(): boolean {
    return this.status === QuotationStatus.ACCEPTED;
  }

  isRejected(): boolean {
    return this.status === QuotationStatus.REJECTED;
  }

  isExpired(reference: Date = new Date()): boolean {
    return Boolean(this.expiresAt && this.expiresAt < reference);
  }
}


