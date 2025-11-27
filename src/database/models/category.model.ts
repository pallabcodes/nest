import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';

@Table({
  tableName: 'categories',
  timestamps: true,
  indexes: [
    {
      fields: ['name'],
    },
    {
      fields: ['parentId'],
    },
  ],
})
export class Category extends Model<Category> {
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

  @ForeignKey(() => Category)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  parentId: number | null;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => Category, { foreignKey: 'parentId', as: 'parent' })
  parent?: Category;

  @HasMany(() => Category, { foreignKey: 'parentId', as: 'children' })
  children?: Category[];

  isRoot(): boolean {
    return this.parentId == null;
  }

  isChild(): boolean {
    return this.parentId != null;
  }
}


