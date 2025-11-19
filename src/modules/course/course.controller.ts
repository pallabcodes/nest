import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { FindAllCourseQueryDto } from './dto/find-all-course-query.dto';
import { CourseResponseMapper } from './mappers/course-response.mapper';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('Course')
@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly responseMapper: CourseResponseMapper,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  async create(@Body() createDto: CreateCourseDto) {
    const result = await this.courseService.create(createDto);
    return this.responseMapper.toCreateResponse(result);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  async findAll(@Query() query: FindAllCourseQueryDto) {
    const result = await this.courseService.findAll(query);
    const paginated = this.responseMapper.toPaginatedResponse(
      result.data,
      result.page,
      result.limit,
      result.total,
    );
    return {
      success: true,
      data: paginated,
    };
  }

  // ============================================
  // CUSTOM QUERIES (Must be before :id route)
  // ============================================

  @Public()
  @Get('most-enrollments')
  @ApiOperation({ summary: 'Get courses with most enrollments' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  async getCoursesWithMostEnrollments(@Query('limit') limit?: string) {
    let parsedLimit = 10;
    if (limit !== undefined && limit !== null && limit !== '') {
      const numLimit = Number(limit);
      if (!isNaN(numLimit) && Number.isInteger(numLimit) && numLimit > 0) {
        parsedLimit = numLimit;
      }
    }
    const courses = await this.courseService.getCoursesWithMostEnrollments(parsedLimit);
    return {
      success: true,
      data: courses,
    };
  }

  @Public()
  @Get('added/this-month')
  @ApiOperation({ summary: 'Get courses added this month' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  async getCoursesAddedThisMonth() {
    const courses = await this.courseService.getCoursesAddedThisMonth();
    return {
      success: true,
      data: courses,
    };
  }

  @Public()
  @Get('low-enrollment')
  @ApiOperation({ summary: 'Get courses with low enrollment (below threshold)' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  async getCoursesWithLowEnrollment(@Query('threshold') threshold?: string) {
    let parsedThreshold = 5;
    if (threshold !== undefined && threshold !== null && threshold !== '') {
      const numThreshold = Number(threshold);
      if (!isNaN(numThreshold) && Number.isInteger(numThreshold) && numThreshold >= 0) {
        parsedThreshold = numThreshold;
      }
    }
    const courses = await this.courseService.getCoursesWithLowEnrollment(parsedThreshold);
    return {
      success: true,
      data: courses,
    };
  }

  @Public()
  @Get('enrollment-trends')
  @ApiOperation({ summary: 'Get enrollment trends (monthly counts)' })
  @ApiResponse({ status: 200, description: 'Enrollment trends' })
  async getEnrollmentTrends(@Query('months') months?: string) {
    let parsedMonths = 12;
    if (months !== undefined && months !== null && months !== '') {
      const numMonths = Number(months);
      if (!isNaN(numMonths) && Number.isInteger(numMonths) && numMonths > 0) {
        parsedMonths = numMonths;
      }
    }
    const trends = await this.courseService.getEnrollmentTrends(parsedMonths);
    return {
      success: true,
      data: trends,
    };
  }

  @Public()
  @Get('teacher/:teacherId')
  @ApiOperation({ summary: 'Get courses by teacher' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  @ApiResponse({ status: 400, description: 'Invalid teacher ID format' })
  async getCoursesByTeacher(@Param('teacherId', ParseIntPipe) teacherId: number) {
    const courses = await this.courseService.getCoursesByTeacher(teacherId);
    return {
      success: true,
      data: courses,
    };
  }

  @Public()
  @Get('average-grade/:threshold')
  @ApiOperation({ summary: 'Get courses with average grade above/below threshold' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  @ApiResponse({ status: 400, description: 'Invalid threshold format' })
  async getCoursesByAverageGrade(
    @Param('threshold', ParseIntPipe) threshold: number,
    @Query('above') above?: string,
  ) {
    const courses = await this.courseService.getCoursesByAverageGrade(
      threshold,
      above !== 'false',
    );
    return {
      success: true,
      data: courses,
    };
  }

  @Public()
  @Get('department/:departmentId')
  @ApiOperation({ summary: 'Get courses taught by teachers from specific department' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  @ApiResponse({ status: 400, description: 'Invalid department ID format' })
  async getCoursesByDepartment(@Param('departmentId', ParseIntPipe) departmentId: number) {
    const courses = await this.courseService.getCoursesByDepartment(departmentId);
    return {
      success: true,
      data: courses,
    };
  }

  @Public()
  @Get('completion-rate/:threshold')
  @ApiOperation({ summary: 'Get courses with completion rate above threshold' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  @ApiResponse({ status: 400, description: 'Invalid threshold format' })
  async getCoursesByCompletionRate(@Param('threshold', ParseIntPipe) threshold: number) {
    const courses = await this.courseService.getCoursesByCompletionRate(threshold);
    return {
      success: true,
      data: courses,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({ status: 200, description: 'Course found' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.courseService.findOne(id);
    return this.responseMapper.toReadResponse(result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course (Admin/Teacher only)' })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Teacher role required' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCourseDto) {
    const result = await this.courseService.update(id, updateDto);
    return this.responseMapper.toUpdateResponse(result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete course (Admin only)' })
  @ApiResponse({ status: 204, description: 'Course deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.courseService.remove(id);
    return this.responseMapper.toDeleteResponse(id);
  }

  // ============================================
  // RELATIONSHIP ENDPOINTS
  // ============================================

  @Public()
  @Get(':id/students')
  @ApiOperation({ summary: 'Get students enrolled in course' })
  @ApiResponse({ status: 200, description: 'List of students' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  async getStudents(@Param('id', ParseIntPipe) id: number) {
    const students = await this.courseService.getStudents(id);
    return {
      success: true,
      data: students,
    };
  }

  @Public()
  @Get(':id/teachers')
  @ApiOperation({ summary: 'Get teachers assigned to course' })
  @ApiResponse({ status: 200, description: 'List of teachers' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  async getTeachers(@Param('id', ParseIntPipe) id: number) {
    const teachers = await this.courseService.getTeachers(id);
    return {
      success: true,
      data: teachers,
    };
  }

  @Public()
  @Get(':id/enrollments')
  @ApiOperation({ summary: 'Get course enrollments' })
  @ApiResponse({ status: 200, description: 'List of enrollments' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  async getEnrollments(@Param('id', ParseIntPipe) id: number) {
    const enrollments = await this.courseService.getEnrollments(id);
    return {
      success: true,
      data: enrollments,
    };
  }

  @Public()
  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get course enrollment statistics' })
  @ApiResponse({ status: 200, description: 'Course statistics' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  async getStatistics(@Param('id', ParseIntPipe) id: number) {
    const stats = await this.courseService.getEnrollmentStatistics(id);
    return {
      success: true,
      data: stats,
    };
  }

}
