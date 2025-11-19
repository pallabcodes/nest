import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CourseRepository } from './course.repository';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(private readonly courseRepository: CourseRepository) {}

  async create(createDto: CreateCourseDto) {
    return this.courseRepository.create(createDto);
  }

  async findAll(query?: any) {
    return this.courseRepository.findAll(query);
  }

  async findOne(id: number) {
    const item = await this.courseRepository.findById(id);
    if (!item) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return item;
  }

  async update(id: number, updateDto: UpdateCourseDto) {
    const item = await this.findOne(id);
    await this.courseRepository.update(id, updateDto);
    return this.courseRepository.findById(id);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.courseRepository.delete(id);
    return item;
  }

  // ============================================
  // RELATIONSHIP QUERIES
  // ============================================

  async getStudents(courseId: number) {
    await this.findOne(courseId); // Verify course exists
    return this.courseRepository.getStudents(courseId);
  }

  async getTeachers(courseId: number) {
    await this.findOne(courseId); // Verify course exists
    return this.courseRepository.getTeachers(courseId);
  }

  async getEnrollments(courseId: number) {
    await this.findOne(courseId); // Verify course exists
    return this.courseRepository.getEnrollments(courseId);
  }

  async getEnrollmentStatistics(courseId: number) {
    await this.findOne(courseId); // Verify course exists
    return this.courseRepository.getEnrollmentStatistics(courseId);
  }

  async getCoursesByTeacher(teacherId: number) {
    return this.courseRepository.getCoursesByTeacher(teacherId);
  }

  async getCoursesWithMostEnrollments(limit: number = 10) {
    return this.courseRepository.getCoursesWithMostEnrollments(limit);
  }

  async getCoursesAddedThisMonth() {
    return this.courseRepository.getCoursesAddedThisMonth();
  }

  // ============================================
  // COMPLEX QUERIES
  // ============================================

  async getCoursesByAverageGrade(threshold: number, above: boolean = true) {
    return this.courseRepository.getCoursesByAverageGrade(threshold, above);
  }

  async getCoursesByDepartment(departmentId: number) {
    return this.courseRepository.getCoursesByDepartment(departmentId);
  }

  async getCoursesByCompletionRate(threshold: number) {
    return this.courseRepository.getCoursesByCompletionRate(threshold);
  }

  async getCoursesWithLowEnrollment(threshold: number = 5) {
    return this.courseRepository.getCoursesWithLowEnrollment(threshold);
  }

  async getEnrollmentTrends(months: number = 12) {
    return this.courseRepository.getEnrollmentTrends(months);
  }
}
