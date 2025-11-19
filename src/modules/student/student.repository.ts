import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Op, Sequelize, QueryTypes } from 'sequelize';
import { Student } from '../../database/models/student.model';
import { Course } from '../../database/models/course.model';
import { Enrollment } from '../../database/models/enrollment.model';
import { Teacher } from '../../database/models/teacher.model';

/**
 * StudentRepository - Direct Sequelize usage without BaseRepository
 */
@Injectable()
export class StudentRepository {
  constructor(
    @InjectModel(Student)
    private readonly studentModel: typeof Student,
    @InjectModel(Course)
    private readonly courseModel: typeof Course,
    @InjectModel(Enrollment)
    private readonly enrollmentModel: typeof Enrollment,
    @InjectModel(Teacher)
    private readonly teacherModel: typeof Teacher,
    @InjectConnection()
    private readonly sequelize: Sequelize,
  ) {}

  /**
   * Helper method to safely convert a value to a positive integer
   * Returns default value if conversion fails or value is invalid
   */
  private safePositiveInt(value: any, defaultValue: number = 10): number {
    if (value == null || value === undefined || value === '') return defaultValue;
    let num: number;
    if (typeof value === 'string') {
      num = parseInt(value, 10);
    } else if (typeof value === 'number') {
      num = value;
    } else {
      return defaultValue;
    }
    if (isNaN(num) || !isFinite(num) || !Number.isInteger(num) || num <= 0) {
      return defaultValue;
    }
    return Math.floor(Math.abs(num));
  }

  async create(data: any) {
    return this.studentModel.create(data);
  }

  async findById(id: number) {
    return this.studentModel.findByPk(id, {
      include: [
        {
          model: this.courseModel,
          as: 'courses',
          required: false,
        },
      ],
    });
  }

  async update(id: number, data: any) {
    const [affectedCount] = await this.studentModel.update(data, {
      where: { id },
    });
    return affectedCount;
  }

  async delete(id: number) {
    return this.studentModel.destroy({ where: { id } });
  }

  async findAll(query?: any, options?: { userRole?: string; includeInactive?: boolean }) {
    const { page = 1, limit = 10, ...filters } = query || {};
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 10;
    const offset = (safePage - 1) * safeLimit;

    const where: any = {};
    
    // Basic filters
    if (filters.name) {
      where.name = { [Op.like]: `%${filters.name}%` };
    }
    if (filters.email) {
      where.email = { [Op.like]: `%${filters.email}%` };
    }
    
    // Flag-based conditional filter: isActive handling
    if (options?.includeInactive || options?.userRole === 'admin') {
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive === 'true' || filters.isActive === true;
      }
    } else {
      // Regular users only see active students
      where.isActive = true;
    }

    const { rows, count } = await this.studentModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.courseModel,
          as: 'courses',
          required: false,
        },
      ],
    });

    return {
      data: rows,
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(count / safeLimit),
    };
  }

  /**
   * Find students with nested includes
   * Demonstrates: Student → Courses → Teachers → Departments
   */
  async findAllWithNestedIncludes(query?: any) {
    const { page = 1, limit = 10, ...filters } = query || {};
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 10;
    const offset = (safePage - 1) * safeLimit;

    const where: any = {};
    if (filters.name) {
      where.name = { [Op.like]: `%${filters.name}%` };
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    const { rows, count } = await this.studentModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.courseModel,
          as: 'courses',
          required: false,
          attributes: ['id', 'name', 'code', 'credits'],
          // Include with condition: only active courses
          where: {
            isActive: true,
          },
          // Nested include: Courses → Teachers
          include: [
            {
              model: this.teacherModel,
              as: 'teachers',
              required: false,
              attributes: ['id', 'name', 'email'],
              // Include with condition: only active teachers
              where: {
                isActive: true,
              },
            },
          ],
        },
      ],
    });

    return {
      data: rows,
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(count / safeLimit),
    };
  }

  // ============================================
  // ENROLLMENT OPERATIONS
  // ============================================

  /**
   * Enroll student in a course
   */
  async enrollInCourse(studentId: number, courseId: number, status: string = 'enrolled') {
    // Check if enrollment already exists
    const existing = await this.enrollmentModel.findOne({
      where: { studentId, courseId },
    });

    if (existing) {
      throw new Error('Student is already enrolled in this course');
    }

    return this.enrollmentModel.create({
      studentId,
      courseId,
      status,
    } as any);
  }

  /**
   * Get student's enrollments with course details
   */
  async getEnrollments(studentId: number, status?: string) {
    const where: any = { studentId };
    if (status) {
      where.status = status;
    }

    return this.enrollmentModel.findAll({
      where,
      include: [
        {
          model: this.courseModel,
          as: 'course',
          required: false,
        },
      ],
      order: [['enrolledAt', 'DESC']],
    });
  }

  /**
   * Update enrollment (status or grade)
   */
  async updateEnrollment(enrollmentId: number, data: { status?: string; grade?: number }) {
    const [affectedCount] = await this.enrollmentModel.update(data, {
      where: { id: enrollmentId },
    });
    if (affectedCount === 0) {
      throw new Error('Enrollment not found');
    }
    return this.enrollmentModel.findByPk(enrollmentId, {
      include: [
        {
          model: this.courseModel,
          as: 'course',
          required: false,
        },
      ],
    });
  }

  /**
   * Drop enrollment (delete)
   */
  async dropEnrollment(enrollmentId: number) {
    return this.enrollmentModel.destroy({ where: { id: enrollmentId } });
  }

  /**
   * Get students enrolled in a course
   */
  async getStudentsByCourse(courseId: number) {
    const enrollments = await this.enrollmentModel.findAll({
      where: { courseId },
      include: [
        {
          model: this.studentModel,
          as: 'student',
          required: false,
        },
      ],
    });
    return enrollments;
  }

  /**
   * Get students enrolled this month
   */
  async getStudentsEnrolledThisMonth() {
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const enrollments = await this.enrollmentModel.findAll({
      where: {
        enrolledAt: {
          [Op.gte]: thisMonthStart,
        },
      },
      include: [
        {
          model: this.studentModel,
          as: 'student',
          required: false,
        },
        {
          model: this.courseModel,
          as: 'course',
          required: false,
        },
      ],
    });
    return enrollments;
  }

  /**
   * Get student GPA (average grade)
   */
  async getStudentGPA(studentId: number) {
    const enrollments = await this.enrollmentModel.findAll({
      where: {
        studentId,
        status: 'completed',
        grade: { [Op.ne]: null as any },
      },
      attributes: ['grade'],
    });

    if (enrollments.length === 0) {
      return null;
    }

    const totalGrade = enrollments.reduce((sum, e) => sum + parseFloat(String(e.grade || 0)), 0);
    return totalGrade / enrollments.length;
  }

  // ============================================
  // COMPLEX QUERIES
  // ============================================

  /**
   * Get top performing students (ranked by GPA)
   * RAW SQL VERSION - More reliable for complex GROUP BY queries
   */
  async getTopPerformingStudents(limit: number = 10, minGPA?: number) {
    const validLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;
    
    let sql = `
      SELECT 
        s.id,
        s.name,
        s.email,
        s.studentId,
        COUNT(e.id) AS completedCourses,
        AVG(e.grade) AS gpa
      FROM students s
      INNER JOIN enrollments e ON s.id = e.studentId
      WHERE e.status = 'completed' AND e.grade IS NOT NULL
      GROUP BY s.id, s.name, s.email, s.studentId
    `;
    
    if (minGPA != null && minGPA !== undefined && !isNaN(minGPA as any)) {
      const numGPA = typeof minGPA === 'string' ? parseFloat(minGPA) : minGPA;
      if (typeof numGPA === 'number' && !isNaN(numGPA) && isFinite(numGPA) && numGPA >= 0) {
        sql += ` HAVING AVG(e.grade) >= ${numGPA}`;
      }
    }
    
    sql += ` ORDER BY gpa DESC LIMIT ${validLimit}`;
    
    return this.sequelize.query(sql, {
      replacements: {},
      type: QueryTypes.SELECT,
    });
  }

  /**
   * Get students enrolled in courses by department
   * Cross-entity traversal: Student → Enrollment → Course → CourseTeacher → Teacher → TeacherDepartment → Department
   */
  async getStudentsByDepartment(departmentId: number) {
    const result = await this.sequelize.query(`
      SELECT DISTINCT
        s.id,
        s.name,
        s.email,
        s.studentId,
        c.id as courseId,
        c.name as courseName,
        c.code as courseCode,
        e.status as enrollmentStatus,
        e.grade
      FROM students s
      INNER JOIN enrollments e ON s.id = e.studentId
      INNER JOIN courses c ON e.courseId = c.id
      INNER JOIN course_teachers ct ON c.id = ct.courseId
      INNER JOIN teachers t ON ct.teacherId = t.id
      INNER JOIN teacher_departments td ON t.id = td.teacherId
      WHERE td.departmentId = :departmentId
      ORDER BY s.name, c.name
    `, {
      replacements: { departmentId },
      type: QueryTypes.SELECT,
    });
    return result;
  }

  /**
   * Get students with GPA above threshold
   */
  async getStudentsWithGPAAbove(threshold: number) {
    let validThreshold: number;
    if (typeof threshold === 'number' && !isNaN(threshold) && isFinite(threshold) && threshold >= 0) {
      validThreshold = threshold;
    } else if (typeof threshold === 'string') {
      const parsed = parseFloat(threshold);
      if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
        validThreshold = parsed;
      } else {
        throw new Error('Invalid threshold value');
      }
    } else {
      throw new Error('Invalid threshold value');
    }
    
    const result = await this.sequelize.query(`
      SELECT 
        s.id,
        s.name,
        s.email,
        s.studentId,
        AVG(e.grade) as gpa,
        COUNT(e.id) as completedCourses
      FROM students s
      INNER JOIN enrollments e ON s.id = e.studentId
      WHERE e.status = 'completed' AND e.grade IS NOT NULL
      GROUP BY s.id, s.name, s.email, s.studentId
      HAVING AVG(e.grade) >= :threshold
      ORDER BY gpa DESC
    `, {
      replacements: { threshold: validThreshold },
      type: QueryTypes.SELECT,
    });
    return result;
  }

  /**
   * Get available courses for a student (not already enrolled, active courses)
   */
  async getAvailableCoursesForStudent(studentId: number) {
    const validStudentId = this.safePositiveInt(studentId, 0);
    if (validStudentId <= 0) {
      throw new Error('Invalid student ID');
    }
    const result = await this.sequelize.query(`
      SELECT 
        c.id,
        c.name,
        c.code,
        c.description,
        c.credits,
        COUNT(DISTINCT ct.teacherId) as teacherCount,
        COUNT(DISTINCT e2.studentId) as currentEnrollments
      FROM courses c
      LEFT JOIN course_teachers ct ON c.id = ct.courseId
      LEFT JOIN enrollments e2 ON c.id = e2.courseId AND e2.status = 'enrolled'
      WHERE c.isActive = true
        AND c.id NOT IN (
          SELECT courseId 
          FROM enrollments 
          WHERE studentId = :studentId AND status IN ('enrolled', 'completed')
        )
      GROUP BY c.id, c.name, c.code, c.description, c.credits
      ORDER BY c.name
    `, {
      replacements: { studentId: validStudentId },
      type: QueryTypes.SELECT,
    });
    return result;
  }
}
