import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Op, Sequelize, QueryTypes } from 'sequelize';
import { Teacher } from '../../database/models/teacher.model';
import { Department } from '../../database/models/department.model';
import { Course } from '../../database/models/course.model';
import { TeacherDepartment } from '../../database/models/teacher-department.model';
import { CourseTeacher } from '../../database/models/course-teacher.model';

/**
 * TeacherRepository - Direct Sequelize usage without BaseRepository
 */
@Injectable()
export class TeacherRepository {
  constructor(
    @InjectModel(Teacher)
    private readonly teacherModel: typeof Teacher,
    @InjectModel(Department)
    private readonly departmentModel: typeof Department,
    @InjectModel(Course)
    private readonly courseModel: typeof Course,
    @InjectModel(TeacherDepartment)
    private readonly teacherDepartmentModel: typeof TeacherDepartment,
    @InjectModel(CourseTeacher)
    private readonly courseTeacherModel: typeof CourseTeacher,
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

  /**
   * Helper method to safely convert a value to a positive integer or undefined
   * Returns undefined if conversion fails or value is invalid
   */
  private safePositiveIntOrUndefined(value: any): number | undefined {
    if (value == null || value === undefined || value === '') return undefined;
    let num: number;
    if (typeof value === 'string') {
      num = parseInt(value, 10);
    } else if (typeof value === 'number') {
      num = value;
    } else {
      return undefined;
    }
    if (isNaN(num) || !isFinite(num) || !Number.isInteger(num) || num <= 0) {
      return undefined;
    }
    const result = Math.floor(Math.abs(num));
    return result > 0 ? result : undefined;
  }

  async create(data: any) {
    return this.teacherModel.create(data);
  }

  async findById(id: number) {
    return this.teacherModel.findByPk(id, {
      include: [
        {
          model: this.departmentModel,
          as: 'departments',
          required: false,
        },
        {
          model: this.courseModel,
          as: 'courses',
          required: false,
        },
      ],
    });
  }

  async update(id: number, data: any) {
    const [affectedCount] = await this.teacherModel.update(data, {
      where: { id },
    });
    return affectedCount;
  }

  async delete(id: number) {
    return this.teacherModel.destroy({ where: { id } });
  }

  async findAll(query?: any, options?: { userRole?: string; includeInactive?: boolean }) {
    const { page = 1, limit = 10, ...filters } = query || {};
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 10;
    const offset = (safePage - 1) * safeLimit;

    const where: any = {};
    
    // Basic filters - always applied
    if (filters.name) {
      where.name = { [Op.like]: `%${filters.name}%` };
    }
    if (filters.email) {
      where.email = { [Op.like]: `%${filters.email}%` };
    }
    if (filters.specialization) {
      where.specialization = { [Op.like]: `%${filters.specialization}%` };
    }
    
    // Flag-based conditional filter: isActive handling
    // If includeInactive flag is true (admin), allow filtering by isActive
    // Otherwise, always filter to active only
    if (options?.includeInactive || options?.userRole === 'admin') {
      // Admins can see inactive teachers if explicitly requested
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive === 'true' || filters.isActive === true;
      }
    } else {
      // Regular users only see active teachers
      where.isActive = true;
    }

    const { rows, count } = await this.teacherModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.departmentModel,
          as: 'departments',
          required: false,
        },
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

  // ============================================
  // ADVANCED QUERIES WITH NESTED INCLUDES
  // ============================================

  /**
   * Find teachers with nested includes
   * Demonstrates: Teacher → Departments → Courses → Students
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

    const { rows, count } = await this.teacherModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.departmentModel,
          as: 'departments',
          required: false,
          attributes: ['id', 'name', 'description'],
        },
        {
          model: this.courseModel,
          as: 'courses',
          required: false,
          attributes: ['id', 'name', 'code', 'credits'],
          // Include with condition: only active courses
          where: {
            isActive: true,
          },
          // Include with ordering
          order: [['name', 'ASC']],
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
   * Find teachers with complex conditional filters using Op.and / Op.or
   */
  async findAllWithComplexFilters(query?: any) {
    const { page = 1, limit = 10, name, email, specialization, minCourses, departmentId } = query || {};
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 10;
    const offset = (safePage - 1) * safeLimit;

    const where: any = {
      isActive: true,
    };

    // Op.and example: Multiple conditions that must all be true
    const andConditions: any[] = [];

    if (name || email) {
      // Op.or example: Either name OR email matches
      const orConditions: any[] = [];
      if (name) {
        orConditions.push({ name: { [Op.like]: `%${name}%` } });
      }
      if (email) {
        orConditions.push({ email: { [Op.like]: `%${email}%` } });
      }
      if (orConditions.length > 0) {
        andConditions.push({ [Op.or]: orConditions });
      }
    }

    if (specialization) {
      andConditions.push({ specialization: { [Op.like]: `%${specialization}%` } });
    }

    // Apply Op.and if we have multiple conditions
    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    const { rows, count } = await this.teacherModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.departmentModel,
          as: 'departments',
          // Conditional include: only include if departmentId filter is provided
          ...(departmentId ? {
            where: { id: this.safePositiveInt(departmentId, 0) },
            required: true, // INNER JOIN when filtering by department
          } : {
            required: false, // LEFT JOIN when not filtering
          }),
        },
        {
          model: this.courseModel,
          as: 'courses',
          required: false,
          attributes: ['id', 'name'],
        },
      ],
      // Subquery: false is needed when using includes with group/aggregates
      subQuery: false,
    });

    // Post-process to filter by minCourses if specified
    let filteredRows = rows;
    if (minCourses) {
      filteredRows = rows.filter((teacher: any) => 
        teacher.courses && teacher.courses.length >= parseInt(minCourses, 10)
      );
    }

    return {
      data: filteredRows,
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(count / safeLimit),
    };
  }

  // ============================================
  // DEPARTMENT ASSIGNMENT OPERATIONS
  // ============================================

  /**
   * Assign teacher to department
   */
  async assignToDepartment(teacherId: number, departmentId: number, role?: string) {
    const existing = await this.teacherDepartmentModel.findOne({
      where: { teacherId, departmentId },
    });

    if (existing) {
      throw new Error('Teacher is already assigned to this department');
    }

    return this.teacherDepartmentModel.create({
      teacherId,
      departmentId,
      ...(role && { role }),
    } as any);
  }

  /**
   * Get teacher's departments
   */
  async getDepartments(teacherId: number) {
    return this.teacherDepartmentModel.findAll({
      where: { teacherId },
      include: [
        {
          model: this.departmentModel,
          as: 'department',
          required: false,
        },
      ],
      order: [['assignedAt', 'DESC']],
    });
  }

  /**
   * Remove teacher from department
   */
  async removeFromDepartment(teacherId: number, departmentId: number) {
    return this.teacherDepartmentModel.destroy({
      where: { teacherId, departmentId },
    });
  }

  /**
   * Get teachers by department
   */
  async getTeachersByDepartment(departmentId: number) {
    return this.teacherDepartmentModel.findAll({
      where: { departmentId },
      include: [
        {
          model: this.teacherModel,
          as: 'teacher',
          required: false,
        },
      ],
    });
  }

  // ============================================
  // COURSE ASSIGNMENT OPERATIONS
  // ============================================

  /**
   * Assign teacher to course
   */
  async assignToCourse(teacherId: number, courseId: number, role?: string) {
    const existing = await this.courseTeacherModel.findOne({
      where: { teacherId, courseId },
    });

    if (existing) {
      throw new Error('Teacher is already assigned to this course');
    }

    return this.courseTeacherModel.create({
      teacherId,
      courseId,
      ...(role && { role }),
    } as any);
  }

  /**
   * Get teacher's courses
   */
  async getCourses(teacherId: number) {
    return this.courseTeacherModel.findAll({
      where: { teacherId },
      include: [
        {
          model: this.courseModel,
          as: 'course',
          required: false,
        },
      ],
      order: [['assignedAt', 'DESC']],
    });
  }

  /**
   * Remove teacher from course
   */
  async removeFromCourse(teacherId: number, courseId: number) {
    return this.courseTeacherModel.destroy({
      where: { teacherId, courseId },
    });
  }

  /**
   * Get teachers by course
   */
  async getTeachersByCourse(courseId: number) {
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
   * Get teachers with most courses
   * RAW SQL VERSION (kept for reference)
   */
  async getTeachersWithMostCoursesRaw(limit: number = 10) {
    const finalLimit = this.safePositiveInt(limit, 10);
    // Ensure finalLimit is never NaN or invalid before interpolating
    const safeLimit = (finalLimit != null && !isNaN(finalLimit) && isFinite(finalLimit) && finalLimit > 0) 
      ? Math.floor(Math.abs(finalLimit)) 
      : 10;
    // LIMIT cannot use named parameters in MySQL, must interpolate (safe after validation)
    const result = await this.sequelize.query(
      `SELECT 
        t.id,
        t.name,
        t.email,
        COUNT(ct.id) as courseCount
      FROM teachers t
      LEFT JOIN course_teachers ct ON t.id = ct.teacherId
      GROUP BY t.id, t.name, t.email
      ORDER BY courseCount DESC
      LIMIT ${safeLimit}`,
      {
        type: QueryTypes.SELECT,
      },
    );
    return result;
  }

  /**
   * Get teachers with most courses
   * RAW SQL VERSION - More reliable for complex GROUP BY queries
   */
  async getTeachersWithMostCourses(limit: number = 10) {
    const validLimit = Number.isInteger(limit) && limit > 0 ? Math.floor(limit) : 10;
    const query = `
      SELECT 
        t.id,
        t.name,
        t.email,
        COUNT(ct.courseId) AS courseCount
      FROM teachers t
      LEFT JOIN course_teachers ct ON t.id = ct.teacherId
      WHERE t.isActive = true
      GROUP BY t.id, t.name, t.email
      ORDER BY courseCount DESC
      LIMIT ${validLimit}
    `;
    return this.sequelize.query(query, {
      type: QueryTypes.SELECT,
    });
  }

  // ============================================
  // COMPLEX QUERIES
  // ============================================

  /**
   * Get teacher performance metrics
   */
  async getTeacherPerformanceMetrics(teacherId?: number) {
    // Build base SQL query
    let sql = `SELECT 
        t.id,
        t.name,
        t.email,
        t.specialization,
        COUNT(DISTINCT ct.courseId) as totalCourses,
        COUNT(DISTINCT e.studentId) as totalStudents,
        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.studentId END) as completedStudents,
        AVG(CASE WHEN e.status = 'completed' AND e.grade IS NOT NULL THEN e.grade END) as averageGrade,
        ROUND(
          (COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.studentId END) * 100.0 / 
           NULLIF(COUNT(DISTINCT e.studentId), 0)),
          2
        ) as completionRate
      FROM teachers t
      LEFT JOIN course_teachers ct ON t.id = ct.teacherId
      LEFT JOIN courses c ON ct.courseId = c.id
      LEFT JOIN enrollments e ON c.id = e.courseId`;
    
    // Only add WHERE clause if teacherId is valid (explicitly check for NaN)
    if (teacherId != null && teacherId !== undefined && !isNaN(teacherId as any)) {
      const num = typeof teacherId === 'string' ? parseInt(teacherId, 10) : teacherId;
      if (typeof num === 'number' && !isNaN(num) && isFinite(num) && Number.isInteger(num) && num > 0) {
        const validId = Math.floor(Math.abs(num));
        sql += ` WHERE t.id = ${validId}`;
      }
    }
    
    sql += ' GROUP BY t.id, t.name, t.email, t.specialization ORDER BY averageGrade DESC';
    return this.sequelize.query(sql, {
      replacements: {},
      type: QueryTypes.SELECT,
    });
  }

  /**
   * Get teachers teaching courses with low enrollment
   */
  async getTeachersWithLowEnrollmentCourses(enrollmentThreshold: number = 5) {
    // Allow 0 as valid threshold, so use custom validation
    let finalThreshold = 5;
    if (enrollmentThreshold != null && enrollmentThreshold !== undefined && !isNaN(enrollmentThreshold as any)) {
      let num: number;
      if (typeof enrollmentThreshold === 'string') {
        num = parseInt(enrollmentThreshold, 10);
      } else if (typeof enrollmentThreshold === 'number') {
        num = enrollmentThreshold;
      } else {
        num = NaN;
      }
      if (!isNaN(num) && isFinite(num) && Number.isInteger(num) && num >= 0) {
        finalThreshold = Math.floor(Math.abs(num));
      }
    }
    
    // Ensure finalThreshold is always a valid number
    if (isNaN(finalThreshold) || !isFinite(finalThreshold) || finalThreshold < 0) {
      finalThreshold = 5;
    }
    
    const result = await this.sequelize.query(
      `SELECT DISTINCT
        t.id,
        t.name,
        t.email,
        c.id as courseId,
        c.name as courseName,
        c.code as courseCode,
        COUNT(e.id) as enrollmentCount
      FROM teachers t
      INNER JOIN course_teachers ct ON t.id = ct.teacherId
      INNER JOIN courses c ON ct.courseId = c.id
      LEFT JOIN enrollments e ON c.id = e.courseId
      WHERE c.isActive = true
      GROUP BY t.id, t.name, t.email, c.id, c.name, c.code
      HAVING enrollmentCount < ${finalThreshold}
      ORDER BY enrollmentCount ASC`,
      {
        replacements: {},
        type: QueryTypes.SELECT,
      },
    );
    return result;
  }

  /**
   * Get teachers by department with course and student counts
   */
  async getTeachersByDepartmentWithStats(departmentId: number) {
    const validDepartmentId = this.safePositiveInt(departmentId, 0);
    if (validDepartmentId <= 0) {
      throw new Error('Invalid department ID');
    }
    const result = await this.sequelize.query(`
      SELECT 
        t.id,
        t.name,
        t.email,
        t.specialization,
        td.role as departmentRole,
        COUNT(DISTINCT ct.courseId) as courseCount,
        COUNT(DISTINCT e.studentId) as studentCount,
        AVG(CASE WHEN e.status = 'completed' AND e.grade IS NOT NULL THEN e.grade END) as averageGrade
      FROM teachers t
      INNER JOIN teacher_departments td ON t.id = td.teacherId
      LEFT JOIN course_teachers ct ON t.id = ct.teacherId
      LEFT JOIN courses c ON ct.courseId = c.id
      LEFT JOIN enrollments e ON c.id = e.courseId
      WHERE td.departmentId = :departmentId
      GROUP BY t.id, t.name, t.email, t.specialization, td.role
      ORDER BY studentCount DESC
    `, {
      replacements: { departmentId: validDepartmentId },
      type: QueryTypes.SELECT,
    });
    return result;
  }
}
