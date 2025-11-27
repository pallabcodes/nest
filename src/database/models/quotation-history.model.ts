import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Player } from './player.model';
import { Team } from './team.model';
import { Auction } from './auction.model';
import { Quotation, QuotationStatus } from './quotation.model';

@Table({
  tableName: 'quotation_history',
  timestamps: false,
  indexes: [
    {
      fields: ['quotationId'],
    },
    {
      fields: ['auctionId', 'playerId', 'teamId', 'createdAt'],
      name: 'idx_quotation_history_auction_player_team_created',
    },
  ],
})
export class QuotationHistory extends Model<QuotationHistory> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @ForeignKey(() => Quotation)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  quotationId: number;

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
  })
  status: QuotationStatus;

  @CreatedAt
  declare createdAt: Date;

  @BelongsTo(() => Quotation, { foreignKey: 'quotationId', as: 'quotation' })
  quotation?: Quotation;

  @BelongsTo(() => Auction, { foreignKey: 'auctionId', as: 'auction' })
  auction?: Auction;

  @BelongsTo(() => Player, { foreignKey: 'playerId', as: 'player' })
  player: Player;

  @BelongsTo(() => Team, { foreignKey: 'teamId', as: 'team' })
  team: Team;
}


