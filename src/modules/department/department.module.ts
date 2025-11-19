import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { DepartmentRepository } from './department.repository';
import { DepartmentResponseMapper } from './mappers/department-response.mapper';
import { Department } from '../../database/models/department.model';
import { Teacher } from '../../database/models/teacher.model';
import { TeacherDepartment } from '../../database/models/teacher-department.model';
import { CourseTeacher } from '../../database/models/course-teacher.model';
import { Course } from '../../database/models/course.model';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Department, Teacher, TeacherDepartment, CourseTeacher, Course]),
    forwardRef(() => CourseModule),
  ],
  controllers: [DepartmentController],
  providers: [DepartmentService, DepartmentRepository, DepartmentResponseMapper],
  exports: [DepartmentService, DepartmentRepository],
})
export class DepartmentModule {}
