import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { TeacherRepository } from './teacher.repository';
import { TeacherResponseMapper } from './mappers/teacher-response.mapper';
import { Teacher } from '../../database/models/teacher.model';
import { Department } from '../../database/models/department.model';
import { Course } from '../../database/models/course.model';
import { TeacherDepartment } from '../../database/models/teacher-department.model';
import { CourseTeacher } from '../../database/models/course-teacher.model';

@Module({
  imports: [
    SequelizeModule.forFeature([Teacher, Department, Course, TeacherDepartment, CourseTeacher]),
  ],
  controllers: [TeacherController],
  providers: [TeacherService, TeacherRepository, TeacherResponseMapper],
  exports: [TeacherService, TeacherRepository],
})
export class TeacherModule {}
