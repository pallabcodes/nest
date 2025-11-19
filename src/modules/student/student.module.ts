import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { StudentRepository } from './student.repository';
import { StudentResponseMapper } from './mappers/student-response.mapper';
import { Student } from '../../database/models/student.model';
import { Course } from '../../database/models/course.model';
import { Enrollment } from '../../database/models/enrollment.model';
import { Teacher } from '../../database/models/teacher.model';
import { TeacherModule } from '../teacher/teacher.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Student, Course, Enrollment, Teacher]),
    TeacherModule,
  ],
  controllers: [StudentController],
  providers: [StudentService, StudentRepository, StudentResponseMapper],
  exports: [StudentService],
})
export class StudentModule {}
