import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Op, Sequelize, QueryTypes } from 'sequelize';
import { Course } from '../../database/models/course.model';
import { Student } from '../../database/models/student.model';
import { Teacher } from '../../database/models/teacher.model';
import { Enrollment } from '../../database/models/enrollment.model';
import { CourseTeacher } from '../../database/models/course-teacher.model';
import { Department } from '../../database/models/department.model';

/**
 * CourseRepository - Direct Sequelize usage without BaseRepository
 */
@Injectable()
export class CourseRepository {
  constructor(
    @InjectModel(Course)
    private readonly courseModel: typeof Course,
    @InjectModel(Student)
    private readonly studentModel: typeof Student,
    @InjectModel(Teacher)
    private readonly teacherModel: typeof Teacher,
    @InjectModel(Enrollment)
    private readonly enrollmentModel: typeof Enrollment,
    @InjectModel(CourseTeacher)
    private readonly courseTeacherModel: typeof CourseTeacher,
    @InjectModel(Department)
    private readonly departmentModel: typeof Department,
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
    return this.courseModel.create(data);
  }

  async findById(id: number) {
    return this.courseModel.findByPk(id, {
      include: [
        {
          model: this.studentModel,
          as: 'students',
          required: false,
        },
        {
          model: this.teacherModel,
          as: 'teachers',
          required: false,
        },
      ],
    });
  }

  async update(id: number, data: any) {
    const [affectedCount] = await this.courseModel.update(data, {
      where: { id },
    });
    return affectedCount;
  }

  async delete(id: number) {
    return this.courseModel.destroy({ where: { id } });
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
    if (filters.code) {
      where.code = { [Op.like]: `%${filters.code}%` };
    }
    
    // Flag-based conditional filter: isActive handling
    if (options?.includeInactive || options?.userRole === 'admin') {
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive === 'true' || filters.isActive === true;
      }
    } else {
      // Regular users only see active courses
      where.isActive = true;
    }

    const { rows, count } = await this.courseModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.studentModel,
          as: 'students',
          required: false,
        },
        {
          model: this.teacherModel,
          as: 'teachers',
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
   * Find courses with nested includes and conditional filters
   * Demonstrates: Course → Teachers → Departments, Course → Students → Enrollments
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

    const { rows, count } = await this.courseModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
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
          // Nested include: Teachers → Departments
          include: [
            {
              model: this.departmentModel,
              as: 'departments',
              required: false,
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: this.studentModel,
          as: 'students',
          required: false,
          attributes: ['id', 'name', 'email'],
          // Include with condition: only active students
          where: {
            isActive: true,
          },
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
   * Find courses with complex filters using Op.and / Op.or
   */
  async findAllWithComplexFilters(query?: any) {
    const { page = 1, limit = 10, name, code, minCredits, maxCredits, hasTeachers } = query || {};
    const offset = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    // Op.and example: Multiple conditions
    const andConditions: any[] = [];

    if (name || code) {
      // Op.or example: Either name OR code matches
      const orConditions: any[] = [];
      if (name) {
        orConditions.push({ name: { [Op.like]: `%${name}%` } });
      }
      if (code) {
        orConditions.push({ code: { [Op.like]: `%${code}%` } });
      }
      if (orConditions.length > 0) {
        andConditions.push({ [Op.or]: orConditions });
      }
    }

    // Op.and with Op.between for credits range
    if (minCredits !== undefined || maxCredits !== undefined) {
      const creditsCondition: any = {};
      if (minCredits !== undefined) {
        const minCreditsNum = parseInt(minCredits, 10);
        if (!isNaN(minCreditsNum) && isFinite(minCreditsNum) && minCreditsNum >= 0) {
          creditsCondition[Op.gte] = minCreditsNum;
        }
      }
      if (maxCredits !== undefined) {
        const maxCreditsNum = parseInt(maxCredits, 10);
        if (!isNaN(maxCreditsNum) && isFinite(maxCreditsNum) && maxCreditsNum >= 0) {
          creditsCondition[Op.lte] = maxCreditsNum;
        }
      }
      if (Object.keys(creditsCondition).length > 0) {
        andConditions.push({ credits: creditsCondition });
      }
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    const { rows, count } = await this.courseModel.findAndCountAll({
      where,
      limit: limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.teacherModel,
          as: 'teachers',
          // Conditional include: INNER JOIN if hasTeachers filter is true
          ...(hasTeachers === 'true' ? {
            required: true, // INNER JOIN - only courses with teachers
          } : {
            required: false, // LEFT JOIN - all courses
          }),
          attributes: ['id', 'name'],
        },
        {
          model: this.studentModel,
          as: 'students',
          required: false,
          attributes: ['id', 'name'],
        },
      ],
    });

    return {
      data: rows,
      total: count,
      page: page,
      limit: limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  // ============================================
  // RELATIONSHIP QUERIES
  // ============================================

  /**
   * Get students enrolled in course
   */
  async getStudents(courseId: number) {
    return this.enrollmentModel.findAll({
      where: { courseId },
      include: [
        {
          model: this.studentModel,
          as: 'student',
          required: false,
        },
      ],
    });
  }

  /**
   * Get teachers assigned to course
   */
  async getTeachers(courseId: number) {
    return this.courseTeacherModel.findAll({
      where: { courseId },
      include: [
        {
          model: this.teacherModel,
          as: 'teacher',
          required: false,
        },
      ],
    });
  }

  /**
   * Get course enrollments with details
   */
  async getEnrollments(courseId: number) {
    return this.enrollmentModel.findAll({
      where: { courseId },
      include: [
        {
          model: this.studentModel,
          as: 'student',
          required: false,
        },
      ],
      order: [['enrolledAt', 'DESC']],
    });
  }

  /**
   * Get enrollment statistics
   */
  async getEnrollmentStatistics(courseId: number) {
    const enrollments = await this.enrollmentModel.findAll({
      where: { courseId },
      attributes: ['status'],
    });

    const stats = {
      total: enrollments.length,
      enrolled: enrollments.filter((e) => e.status === 'enrolled').length,
      completed: enrollments.filter((e) => e.status === 'completed').length,
      dropped: enrollments.filter((e) => e.status === 'dropped').length,
      failed: enrollments.filter((e) => e.status === 'failed').length,
    };

    // Calculate average grade
    const completedWithGrades = await this.enrollmentModel.findAll({
      where: {
        courseId,
        status: 'completed',
        grade: { [Op.ne]: null as any },
      },
      attributes: ['grade'],
    });

    let averageGrade: number | null = null;
    if (completedWithGrades.length > 0) {
      const totalGrade = completedWithGrades.reduce(
        (sum, e) => sum + parseFloat(String(e.grade || 0)),
        0,
      );
      averageGrade = totalGrade / completedWithGrades.length;
    }

    return {
      ...stats,
      averageGrade,
    };
  }

  /**
   * Get courses by teacher
   */
  async getCoursesByTeacher(teacherId: number) {
    return this.courseTeacherModel.findAll({
      where: { teacherId },
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
   * Get courses with most enrollments
   */
  async getCoursesWithMostEnrollments(limit: number = 10) {
    const validLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;
    return this.courseModel.findAll({
      attributes: [
        'id',
        'name',
        'code',
        [Sequelize.fn('COUNT', Sequelize.col('Enrollments.id')), 'enrollmentCount'],
      ],
      include: [
        {
          model: this.enrollmentModel,
          as: 'Enrollments',
          attributes: [],
          required: false,
        },
      ],
      group: ['Course.id', 'Course.name', 'Course.code'],
      order: [[Sequelize.literal('enrollmentCount'), 'DESC']],
      limit: validLimit,
      subQuery: false,
      raw: true,
    });
  }

  /**
   * Get courses added this month
   */
  async getCoursesAddedThisMonth() {
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    return this.courseModel.findAll({
      where: {
        createdAt: {
          [Op.gte]: thisMonthStart,
        },
      },
      order: [['createdAt', 'DESC']],
    });
  }

  // ============================================
  // COMPLEX QUERIES
  // ============================================

  /**
   * Get courses with average grade above/below threshold
   */
  async getCoursesByAverageGrade(threshold: number, above: boolean = true) {
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
    
    const operator = above ? '>=' : '<';
    const result = await this.sequelize.query(`
      SELECT 
        c.id,
        c.name,
        c.code,
        c.description,
        COUNT(e.id) as totalEnrollments,
        COUNT(CASE WHEN e.status = 'completed' AND e.grade IS NOT NULL THEN 1 END) as completedWithGrade,
        AVG(CASE WHEN e.status = 'completed' AND e.grade IS NOT NULL THEN e.grade END) as averageGrade
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.courseId
      WHERE c.isActive = true
      GROUP BY c.id, c.name, c.code, c.description
      HAVING averageGrade IS NOT NULL AND averageGrade ${operator} :threshold
      ORDER BY averageGrade DESC
    `, {
      replacements: { threshold: validThreshold },
      type: QueryTypes.SELECT,
    });
    return result;
  }

  /**
   * Get courses taught by teachers from specific department
   */
  async getCoursesByDepartment(departmentId: number) {
    const validDepartmentId = this.safePositiveInt(departmentId, 0);
    if (validDepartmentId <= 0) {
      throw new Error('Invalid department ID');
    }
    const result = await this.sequelize.query(`
      SELECT DISTINCT
        c.id,
        c.name,
        c.code,
        c.description,
        c.credits,
        COUNT(DISTINCT ct.teacherId) as teacherCount,
        COUNT(DISTINCT e.studentId) as studentCount
      FROM courses c
      INNER JOIN course_teachers ct ON c.id = ct.courseId
      INNER JOIN teachers t ON ct.teacherId = t.id
      INNER JOIN teacher_departments td ON t.id = td.teacherId
      LEFT JOIN enrollments e ON c.id = e.courseId
      WHERE td.departmentId = :departmentId AND c.isActive = true
      GROUP BY c.id, c.name, c.code, c.description, c.credits
      ORDER BY c.name
    `, {
      replacements: { departmentId: validDepartmentId },
      type: QueryTypes.SELECT,
    });
    return result;
  }

  /**
   * Get courses with completion rate above threshold
   */
  async getCoursesByCompletionRate(threshold: number) {
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
        c.id,
        c.name,
        c.code,
        COUNT(e.id) as totalEnrollments,
        COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completedEnrollments,
        ROUND(
          (COUNT(CASE WHEN e.status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(e.id), 0)),
          2
        ) as completionRate
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.courseId
      WHERE c.isActive = true
      GROUP BY c.id, c.name, c.code
      HAVING completionRate >= :threshold
      ORDER BY completionRate DESC
    `, {
      replacements: { threshold: validThreshold },
      type: QueryTypes.SELECT,
    });
    return result;
  }

  /**
   * Get courses with low enrollment (below threshold)
   */
  async getCoursesWithLowEnrollment(threshold: number = 5) {
    let validThreshold = 5;
    if (threshold != null && threshold !== undefined) {
      let num: number;
      if (typeof threshold === 'string') {
        num = parseInt(threshold, 10);
      } else if (typeof threshold === 'number') {
        num = threshold;
      } else {
        num = NaN;
      }
      if (!isNaN(num) && isFinite(num) && Number.isInteger(num) && num >= 0) {
        validThreshold = Math.floor(Math.abs(num));
      }
    }
    
    // Ensure validThreshold is always a valid number
    if (isNaN(validThreshold) || !isFinite(validThreshold) || validThreshold < 0) {
      validThreshold = 5;
    }
    
    const result = await this.sequelize.query(`
      SELECT 
        c.id,
        c.name,
        c.code,
        c.description,
        COUNT(e.id) as enrollmentCount,
        COUNT(CASE WHEN e.status = 'enrolled' THEN 1 END) as activeEnrollments
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.courseId
      WHERE c.isActive = true
      GROUP BY c.id, c.name, c.code, c.description
      HAVING enrollmentCount < :threshold
      ORDER BY enrollmentCount ASC
    `, {
      replacements: { threshold: validThreshold },
      type: QueryTypes.SELECT,
    });
    return result;
  }

  /**
   * Get enrollment trends (monthly counts)
   */
  async getEnrollmentTrends(months: number = 12) {
    const result = await this.sequelize.query(`
      SELECT 
        DATE_FORMAT(e.enrolledAt, '%Y-%m') as month,
        COUNT(e.id) as enrollmentCount,
        COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completedCount,
        COUNT(CASE WHEN e.status = 'dropped' THEN 1 END) as droppedCount
      FROM enrollments e
      WHERE e.enrolledAt >= DATE_SUB(NOW(), INTERVAL :months MONTH)
      GROUP BY DATE_FORMAT(e.enrolledAt, '%Y-%m')
      ORDER BY month DESC
    `, {
      replacements: { months },
      type: QueryTypes.SELECT,
    });
    return result;
  }
}
