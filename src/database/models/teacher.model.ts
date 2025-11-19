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
} from 'sequelize-typescript';
import { Department } from './department.model';
import { TeacherDepartment } from './teacher-department.model';
import { Course } from './course.model';
import { CourseTeacher } from './course-teacher.model';

@Table({
  tableName: 'teachers',
  timestamps: true,
})
export class Teacher extends Model<Teacher> {
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
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phone: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  specialization: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  // Many-to-Many: Teacher ↔ Department
  @BelongsToMany(() => Department, {
    through: () => TeacherDepartment,
    foreignKey: 'teacherId',
    otherKey: 'departmentId',
    as: 'departments',
  })
  departments: Department[];

  // Many-to-Many: Teacher ↔ Course
  @BelongsToMany(() => Course, {
    through: () => CourseTeacher,
    foreignKey: 'teacherId',
    otherKey: 'courseId',
    as: 'courses',
  })
  courses: Course[];
}

