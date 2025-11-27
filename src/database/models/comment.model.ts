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

export enum CommentableType {
  Quotation = 'Quotation',
  Auction = 'Auction',
}

@Table({
  tableName: 'comments',
  timestamps: true,
  indexes: [
    {
      fields: ['commentableType', 'commentableId'],
      name: 'idx_comments_commentable',
    },
    {
      fields: ['authorId'],
    },
  ],
})
export class Comment extends Model<Comment> {
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
  authorId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  commentableId: number;

  @Column({
    type: DataType.ENUM(...Object.values(CommentableType)),
    allowNull: false,
  })
  commentableType: CommentableType;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  content: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => User, { foreignKey: 'authorId', as: 'author' })
  author: User;

  isOnQuotation(): boolean {
    return this.commentableType === CommentableType.Quotation;
  }

  isOnAuction(): boolean {
    return this.commentableType === CommentableType.Auction;
  }

  isByUser(userId: number): boolean {
    return this.authorId === userId;
  }
}


