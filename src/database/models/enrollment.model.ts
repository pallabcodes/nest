import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
} from 'sequelize-typescript';
import { Student } from './student.model';
import { Course } from './course.model';

@Table({
  tableName: 'enrollments',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'courseId'],
      name: 'unique_student_course',
    },
  ],
})
export class Enrollment extends Model<Enrollment> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: number;

  @ForeignKey(() => Student)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  studentId: number;

  @ForeignKey(() => Course)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  courseId: number;

  @Column({
    type: DataType.ENUM('enrolled', 'completed', 'dropped', 'failed'),
    defaultValue: 'enrolled',
  })
  status: string;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Final grade (0-100)',
    validate: {
      min: 0,
      max: 100,
    },
  })
  grade: number;

  @CreatedAt
  declare enrolledAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  // Associations
  @BelongsTo(() => Student, { foreignKey: 'studentId', as: 'student' })
  student: Student;

  @BelongsTo(() => Course, { foreignKey: 'courseId', as: 'course' })
  course: Course;
}

