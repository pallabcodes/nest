import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
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
})
export class Course extends Model<Course> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
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
    comment: 'Number of credits',
  })
  credits: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  // Many-to-Many: Course ↔ Student
  @BelongsToMany(() => Student, {
    through: () => Enrollment,
    foreignKey: 'courseId',
    otherKey: 'studentId',
    as: 'students',
  })
  students: Student[];

  // Many-to-Many: Course ↔ Teacher
  @BelongsToMany(() => Teacher, {
    through: () => CourseTeacher,
    foreignKey: 'courseId',
    otherKey: 'teacherId',
    as: 'teachers',
  })
  teachers: Teacher[];

  // One-to-Many: Course → Enrollments
  @HasMany(() => Enrollment, {
    foreignKey: 'courseId',
    as: 'Enrollments',
  })
  Enrollments: Enrollment[];
}

