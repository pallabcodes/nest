import { Injectable, NotFoundException, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { TeacherRepository } from './teacher.repository';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AssignDepartmentDto, AssignCourseDto } from './dto/assign-department.dto';

@Injectable()
export class TeacherService {
  private readonly logger = new Logger(TeacherService.name);

  constructor(private readonly teacherRepository: TeacherRepository) {}

  async create(createDto: CreateTeacherDto) {
    return this.teacherRepository.create(createDto);
  }

  async findAll(query?: any) {
    return this.teacherRepository.findAll(query);
  }

  async findOne(id: number) {
    const item = await this.teacherRepository.findById(id);
    if (!item) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }
    return item;
  }

  async update(id: number, updateDto: UpdateTeacherDto) {
    const item = await this.findOne(id);
    await this.teacherRepository.update(id, updateDto);
    return this.teacherRepository.findById(id);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.teacherRepository.delete(id);
    return item;
  }

  // ============================================
  // DEPARTMENT ASSIGNMENT OPERATIONS
  // ============================================

  async assignToDepartment(teacherId: number, assignDto: AssignDepartmentDto) {
    await this.findOne(teacherId); // Verify teacher exists
    
    try {
      return await this.teacherRepository.assignToDepartment(
        teacherId,
        assignDto.departmentId,
        assignDto.role,
      );
    } catch (error: any) {
      if (error.message.includes('already assigned')) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  async getDepartments(teacherId: number) {
    await this.findOne(teacherId); // Verify teacher exists
    return this.teacherRepository.getDepartments(teacherId);
  }

  async removeFromDepartment(teacherId: number, departmentId: number) {
    await this.findOne(teacherId); // Verify teacher exists
    
    const deleted = await this.teacherRepository.removeFromDepartment(teacherId, departmentId);
    if (deleted === 0) {
      throw new NotFoundException('Assignment not found');
    }
    return { success: true, message: 'Teacher removed from department successfully' };
  }

  async getTeachersByDepartment(departmentId: number) {
    return this.teacherRepository.getTeachersByDepartment(departmentId);
  }

  // ============================================
  // COURSE ASSIGNMENT OPERATIONS
  // ============================================

  async assignToCourse(teacherId: number, assignDto: AssignCourseDto) {
    await this.findOne(teacherId); // Verify teacher exists
    
    try {
      return await this.teacherRepository.assignToCourse(
        teacherId,
        assignDto.courseId,
        assignDto.role,
      );
    } catch (error: any) {
      if (error.message.includes('already assigned')) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  async getCourses(teacherId: number) {
    await this.findOne(teacherId); // Verify teacher exists
    return this.teacherRepository.getCourses(teacherId);
  }

  async removeFromCourse(teacherId: number, courseId: number) {
    await this.findOne(teacherId); // Verify teacher exists
    
    const deleted = await this.teacherRepository.removeFromCourse(teacherId, courseId);
    if (deleted === 0) {
      throw new NotFoundException('Assignment not found');
    }
    return { success: true, message: 'Teacher removed from course successfully' };
  }

  async getTeachersByCourse(courseId: number) {
    return this.teacherRepository.getTeachersByCourse(courseId);
  }

  async getTeachersWithMostCourses(limit: number = 10) {
    return this.teacherRepository.getTeachersWithMostCourses(limit);
  }

  // ============================================
  // COMPLEX QUERIES
  // ============================================

  async getTeacherPerformanceMetrics(teacherId?: number) {
    // Ensure teacherId is valid if provided
    let safeTeacherId: number | undefined = undefined;
    if (teacherId != null && typeof teacherId === 'number' && !isNaN(teacherId) && isFinite(teacherId) && teacherId > 0) {
      safeTeacherId = Math.floor(Math.abs(teacherId));
    }
    return this.teacherRepository.getTeacherPerformanceMetrics(safeTeacherId);
  }

  async getTeachersWithLowEnrollmentCourses(enrollmentThreshold: number = 5) {
    // Ensure threshold is always a valid number
    const safeThreshold = (enrollmentThreshold != null && typeof enrollmentThreshold === 'number' && !isNaN(enrollmentThreshold) && isFinite(enrollmentThreshold) && enrollmentThreshold >= 0) 
      ? Math.floor(Math.abs(enrollmentThreshold)) 
      : 5;
    return this.teacherRepository.getTeachersWithLowEnrollmentCourses(safeThreshold);
  }

  async getTeachersByDepartmentWithStats(departmentId: number) {
    return this.teacherRepository.getTeachersByDepartmentWithStats(departmentId);
  }
}
