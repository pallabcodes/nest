import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { Op, Sequelize, QueryTypes } from 'sequelize';
import { Department } from '../../database/models/department.model';
import { Teacher } from '../../database/models/teacher.model';
import { TeacherDepartment } from '../../database/models/teacher-department.model';
import { CourseTeacher } from '../../database/models/course-teacher.model';
import { Course } from '../../database/models/course.model';

/**
 * DepartmentRepository - Direct Sequelize usage without BaseRepository
 */
@Injectable()
export class DepartmentRepository {
  constructor(
    @InjectModel(Department)
    private readonly departmentModel: typeof Department,
    @InjectModel(Teacher)
    private readonly teacherModel: typeof Teacher,
    @InjectModel(TeacherDepartment)
    private readonly teacherDepartmentModel: typeof TeacherDepartment,
    @InjectModel(CourseTeacher)
    private readonly courseTeacherModel: typeof CourseTeacher,
    @InjectModel(Course)
    private readonly courseModel: typeof Course,
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
    return this.departmentModel.create(data);
  }

  async findById(id: number) {
    return this.departmentModel.findByPk(id, {
      include: [
        {
          model: this.teacherModel,
          as: 'teachers',
          required: false,
        },
      ],
    });
  }

  async update(id: number, data: any) {
    const [affectedCount] = await this.departmentModel.update(data, {
      where: { id },
    });
    return affectedCount;
  }

  async delete(id: number) {
    return this.departmentModel.destroy({ where: { id } });
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
    
    // Flag-based conditional filter: isActive handling
    // If includeInactive flag is true or user is admin, allow filtering by isActive
    // Otherwise, always filter to active only
    if (options?.includeInactive || options?.userRole === 'admin') {
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive === 'true' || filters.isActive === true;
      }
    } else {
      // Regular users only see active departments
      where.isActive = true;
    }

    const { rows, count } = await this.departmentModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
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
   * Find departments with nested includes
   * Demonstrates: Department → Teachers → Courses → Students
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

    const { rows, count } = await this.departmentModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: this.teacherModel,
          as: 'teachers',
          required: false,
          attributes: ['id', 'name', 'email', 'specialization'],
          // Include with condition: only active teachers
          where: {
            isActive: true,
          },
          // Nested include: Teachers → Courses
          include: [
            {
              model: this.courseModel,
              as: 'courses',
              required: false,
              attributes: ['id', 'name', 'code'],
              // Include with condition: only active courses
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
  // RELATIONSHIP QUERIES
  // ============================================

  /**
   * Get teachers in department
   */
  async getTeachers(departmentId: number) {
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

  /**
   * Get department statistics
   */
  async getDepartmentStatistics(departmentId: number) {
    const teachers = await this.teacherDepartmentModel.count({
      where: { departmentId },
    });

    // Get courses via teachers
    const teacherIds = await this.teacherDepartmentModel.findAll({
      where: { departmentId },
      attributes: ['teacherId'],
    });

    const teacherIdList = teacherIds.map((td: any) => td.teacherId);
    const courses = await this.courseTeacherModel.count({
      where: {
        teacherId: { [Op.in]: teacherIdList },
      },
    });

    return {
      totalTeachers: teachers,
      totalCourses: courses,
    };
  }

  /**
   * Get departments with most teachers
   * RAW SQL VERSION (kept for reference)
   */
  async getDepartmentsWithMostTeachersRaw(limit: number = 10) {
    const finalLimit = this.safePositiveInt(limit, 10);
    // Ensure finalLimit is never NaN or invalid before interpolating
    const safeLimit = (finalLimit != null && !isNaN(finalLimit) && isFinite(finalLimit) && finalLimit > 0) 
      ? Math.floor(Math.abs(finalLimit)) 
      : 10;
    // LIMIT cannot use named parameters in MySQL, must interpolate (safe after validation)
    const result = await this.sequelize.query(
      `SELECT 
        d.id,
        d.name,
        COUNT(td.id) as teacherCount
      FROM departments d
      LEFT JOIN teacher_departments td ON d.id = td.departmentId
      GROUP BY d.id, d.name
      ORDER BY teacherCount DESC
      LIMIT ${safeLimit}`,
      {
        type: QueryTypes.SELECT,
      },
    );
    return result;
  }

  /**
   * Get departments with most teachers
   * RAW SQL VERSION - More reliable for complex GROUP BY queries
   */
  async getDepartmentsWithMostTeachers(limit: number = 10) {
    const validLimit = Number.isInteger(limit) && limit > 0 && !isNaN(limit) ? Math.floor(limit) : 10;
    const safeLimit = validLimit > 0 ? validLimit : 10;
    const query = `
      SELECT 
        d.id,
        d.name,
        COUNT(td.teacherId) AS teacherCount
      FROM departments d
      LEFT JOIN teacher_departments td ON d.id = td.departmentId
      WHERE d.isActive = true
      GROUP BY d.id, d.name
      ORDER BY teacherCount DESC
      LIMIT ${safeLimit}
    `;
    return this.sequelize.query(query, {
      type: QueryTypes.SELECT,
    });
  }

  // ============================================
  // COMPLEX QUERIES
  // ============================================

  /**
   * Get comprehensive department performance metrics
   */
  async getDepartmentPerformanceMetrics(departmentId?: number) {
    // Build base SQL query
    let sql = `SELECT 
        d.id,
        d.name,
        d.description,
        COUNT(DISTINCT td.teacherId) as totalTeachers,
        COUNT(DISTINCT ct.courseId) as totalCourses,
        COUNT(DISTINCT e.studentId) as totalStudents,
        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.studentId END) as completedStudents,
        AVG(CASE WHEN e.status = 'completed' AND e.grade IS NOT NULL THEN e.grade END) as averageGPA,
        ROUND(
          (COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.studentId END) * 100.0 / 
           NULLIF(COUNT(DISTINCT e.studentId), 0)),
          2
        ) as completionRate
      FROM departments d
      LEFT JOIN teacher_departments td ON d.id = td.departmentId
      LEFT JOIN teachers t ON td.teacherId = t.id
      LEFT JOIN course_teachers ct ON t.id = ct.teacherId
      LEFT JOIN courses c ON ct.courseId = c.id
      LEFT JOIN enrollments e ON c.id = e.courseId`;
    
    // Only add WHERE clause if departmentId is valid (explicitly check for NaN)
    if (departmentId != null && departmentId !== undefined && !isNaN(departmentId as any)) {
      const num = typeof departmentId === 'string' ? parseInt(departmentId, 10) : departmentId;
      if (typeof num === 'number' && !isNaN(num) && isFinite(num) && Number.isInteger(num) && num > 0) {
        const validId = Math.floor(Math.abs(num));
        sql += ` WHERE d.id = ${validId}`;
      }
    }
    
    sql += ' GROUP BY d.id, d.name, d.description ORDER BY totalStudents DESC';
    return this.sequelize.query(sql, {
      replacements: {},
      type: QueryTypes.SELECT,
    });
  }

  /**
   * Get department with most enrolled students
   */
  async getDepartmentWithMostStudents(limit: number = 10) {
    const finalLimit = this.safePositiveInt(limit, 10);
    // Ensure finalLimit is never NaN or invalid before interpolating
    const safeLimit = (finalLimit != null && !isNaN(finalLimit) && isFinite(finalLimit) && finalLimit > 0) 
      ? Math.floor(Math.abs(finalLimit)) 
      : 10;
    // LIMIT cannot use named parameters in MySQL, must interpolate (safe after validation)
    const result = await this.sequelize.query(
      `SELECT 
        d.id,
        d.name,
        COUNT(DISTINCT e.studentId) as studentCount,
        COUNT(DISTINCT ct.courseId) as courseCount,
        COUNT(DISTINCT td.teacherId) as teacherCount
      FROM departments d
      LEFT JOIN teacher_departments td ON d.id = td.departmentId
      LEFT JOIN teachers t ON td.teacherId = t.id
      LEFT JOIN course_teachers ct ON t.id = ct.teacherId
      LEFT JOIN courses c ON ct.courseId = c.id
      LEFT JOIN enrollments e ON c.id = e.courseId
      GROUP BY d.id, d.name
      ORDER BY studentCount DESC
      LIMIT ${safeLimit}`,
      {
        type: QueryTypes.SELECT,
      },
    );
    return result;
  }
}
