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
import { Course } from './course.model';
import { Teacher } from './teacher.model';

@Table({
  tableName: 'course_teachers',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['courseId', 'teacherId'],
      name: 'unique_course_teacher',
    },
  ],
})
export class CourseTeacher extends Model<CourseTeacher> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @ForeignKey(() => Course)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  courseId: number;

  @ForeignKey(() => Teacher)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  teacherId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    comment: 'Role in course for example Instructor or Assistant',
  })
  role: string;

  @CreatedAt
  declare assignedAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @BelongsTo(() => Course, { foreignKey: 'courseId', as: 'course' })
  course: Course;

  @BelongsTo(() => Teacher, { foreignKey: 'teacherId', as: 'teacher' })
  teacher: Teacher;
}


