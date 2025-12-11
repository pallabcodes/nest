import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  BelongsToMany,
  HasMany,
} from 'sequelize-typescript';
import { Student } from './student.model';
import { Enrollment } from './enrollment.model';
import { Teacher } from './teacher.model';
import { CourseTeacher } from './course-teacher.model';

@Table({
  tableName: 'courses',
  timestamps: true,
  indexes: [
    {
      fields: ['name'],
    },
    {
      fields: ['code'],
      unique: true,
    },
    {
      fields: ['isActive'],
    },
  ],
})
export class Course extends Model<Course> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: [1, 255],
    },
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  code: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  credits: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
    comment: 'Price in minor units (for example cents)',
  })
  price: number | null;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
    comment: 'Currency code for price, for example usd',
  })
  currency: string | null;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsToMany(() => Student, {
    through: () => Enrollment,
    foreignKey: 'courseId',
    otherKey: 'studentId',
    as: 'students',
  })
  students: Student[];

  @BelongsToMany(() => Teacher, {
    through: () => CourseTeacher,
    foreignKey: 'courseId',
    otherKey: 'teacherId',
    as: 'teachers',
  })
  teachers: Teacher[];

  @HasMany(() => Enrollment, {
    foreignKey: 'courseId',
    as: 'enrollments',
  })
  enrollments: Enrollment[];
}


