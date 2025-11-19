import { Injectable, NotFoundException, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { StudentRepository } from './student.repository';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { EnrollCourseDto, UpdateEnrollmentDto } from './dto/enroll-course.dto';
import { ValidationError as SequelizeValidationError, UniqueConstraintError } from 'sequelize';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(private readonly studentRepository: StudentRepository) {}

  async create(createDto: CreateStudentDto) {
    try {
      return await this.studentRepository.create(createDto);
    } catch (error: any) {
      if (error instanceof UniqueConstraintError) {
        const field = error.errors[0]?.path || 'field';
        throw new ConflictException(`${field} already exists`);
      }
      if (error instanceof SequelizeValidationError) {
        const messages = error.errors.map((err: any) => err.message).join(', ');
        throw new BadRequestException(`Validation failed: ${messages}`);
      }
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors?.[0]?.path || 'field';
        throw new ConflictException(`${field} already exists`);
      }
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors?.map((err: any) => err.message).join(', ') || error.message;
        throw new BadRequestException(`Validation failed: ${messages}`);
      }
      this.logger.error(`Error creating student: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Failed to create student');
    }
  }

  async findAll(query?: any) {
    return this.studentRepository.findAll(query);
  }

  async findOne(id: number) {
    const item = await this.studentRepository.findById(id);
    if (!item) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }
    return item;
  }

  async update(id: number, updateDto: UpdateStudentDto) {
    const item = await this.findOne(id);
    await this.studentRepository.update(id, updateDto);
    return this.studentRepository.findById(id);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.studentRepository.delete(id);
    return item;
  }

  // ============================================
  // ENROLLMENT OPERATIONS
  // ============================================

  async enrollInCourse(studentId: number, enrollDto: EnrollCourseDto) {
    await this.findOne(studentId); // Verify student exists
    
    try {
      return await this.studentRepository.enrollInCourse(
        studentId,
        enrollDto.courseId,
        enrollDto.status || 'enrolled',
      );
    } catch (error: any) {
      if (error.message.includes('already enrolled')) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  async getEnrollments(studentId: number, status?: string) {
    await this.findOne(studentId); // Verify student exists
    return this.studentRepository.getEnrollments(studentId, status);
  }

  async updateEnrollment(studentId: number, enrollmentId: number, updateDto: UpdateEnrollmentDto) {
    await this.findOne(studentId); // Verify student exists
    
    try {
      return await this.studentRepository.updateEnrollment(enrollmentId, updateDto);
    } catch (error: any) {
      throw new NotFoundException(error.message || 'Enrollment not found');
    }
  }

  async dropEnrollment(studentId: number, enrollmentId: number) {
    await this.findOne(studentId); // Verify student exists
    
    const deleted = await this.studentRepository.dropEnrollment(enrollmentId);
    if (deleted === 0) {
      throw new NotFoundException('Enrollment not found');
    }
    return { success: true, message: 'Enrollment dropped successfully' };
  }

  async getStudentsByCourse(courseId: number) {
    return this.studentRepository.getStudentsByCourse(courseId);
  }

  async getStudentsEnrolledThisMonth() {
    return this.studentRepository.getStudentsEnrolledThisMonth();
  }

  async getStudentGPA(studentId: number) {
    await this.findOne(studentId); // Verify student exists
    const gpa = await this.studentRepository.getStudentGPA(studentId);
    return { studentId, gpa };
  }

  // ============================================
  // COMPLEX QUERIES
  // ============================================

  async getTopPerformingStudents(limit: number = 10, minGPA?: number) {
    // Ensure limit is always a valid number
    const safeLimit = (limit != null && typeof limit === 'number' && !isNaN(limit) && isFinite(limit) && limit > 0) 
      ? Math.floor(Math.abs(limit)) 
      : 10;
    // Ensure minGPA is valid if provided
    let safeMinGPA: number | undefined = undefined;
    if (minGPA != null && typeof minGPA === 'number' && !isNaN(minGPA) && isFinite(minGPA) && minGPA >= 0) {
      safeMinGPA = minGPA;
    }
    return this.studentRepository.getTopPerformingStudents(safeLimit, safeMinGPA);
  }

  async getStudentsByDepartment(departmentId: number) {
    return this.studentRepository.getStudentsByDepartment(departmentId);
  }

  async getStudentsWithGPAAbove(threshold: number) {
    return this.studentRepository.getStudentsWithGPAAbove(threshold);
  }

  async getAvailableCoursesForStudent(studentId: number) {
    await this.findOne(studentId); // Verify student exists
    return this.studentRepository.getAvailableCoursesForStudent(studentId);
  }
}
