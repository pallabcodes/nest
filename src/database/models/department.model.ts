import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  BelongsToMany,
} from 'sequelize-typescript';
import { Teacher } from './teacher.model';
import { TeacherDepartment } from './teacher-department.model';

@Table({
  tableName: 'departments',
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
export class Department extends Model<Department> {
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
      len: [1, 255],
    },
  })
  name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsToMany(() => Teacher, {
    through: () => TeacherDepartment,
    foreignKey: 'departmentId',
    otherKey: 'teacherId',
    as: 'teachers',
  })
  teachers: Teacher[];
}


