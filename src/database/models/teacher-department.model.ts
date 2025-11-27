import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
} from 'sequelize-typescript';
import { Teacher } from './teacher.model';
import { Department } from './department.model';

@Table({
  tableName: 'teacher_departments',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['teacherId', 'departmentId'],
      name: 'unique_teacher_department',
    },
  ],
})
export class TeacherDepartment extends Model<TeacherDepartment> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @ForeignKey(() => Teacher)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  teacherId: number;

  @ForeignKey(() => Department)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  departmentId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    comment: 'Role in department for example Head or Member',
  })
  role: string;

  @CreatedAt
  declare assignedAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => Teacher, { foreignKey: 'teacherId', as: 'teacher' })
  teacher: Teacher;

  @BelongsTo(() => Department, {
    foreignKey: 'departmentId',
    as: 'department',
  })
  department: Department;
}


