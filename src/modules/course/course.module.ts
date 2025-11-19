import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { CourseRepository } from './course.repository';
import { CourseResponseMapper } from './mappers/course-response.mapper';
import { Course } from '../../database/models/course.model';
import { Student } from '../../database/models/student.model';
import { Teacher } from '../../database/models/teacher.model';
import { Enrollment } from '../../database/models/enrollment.model';
import { CourseTeacher } from '../../database/models/course-teacher.model';
import { Department } from '../../database/models/department.model';
import { DepartmentModule } from '../department/department.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Course, Student, Teacher, Enrollment, CourseTeacher, Department]),
    forwardRef(() => DepartmentModule),
  ],
  controllers: [CourseController],
  providers: [CourseService, CourseRepository, CourseResponseMapper],
  exports: [CourseService, CourseRepository],
})
export class CourseModule {}
