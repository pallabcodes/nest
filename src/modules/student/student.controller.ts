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
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { EnrollCourseDto, UpdateEnrollmentDto } from './dto/enroll-course.dto';
import { FindAllStudentQueryDto } from './dto/find-all-student-query.dto';
import { StudentResponseMapper } from './mappers/student-response.mapper';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('Student')
@Controller('students')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly responseMapper: StudentResponseMapper,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new student' })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  async create(@Body() createDto: CreateStudentDto) {
    const result = await this.studentService.create(createDto);
    return this.responseMapper.toCreateResponse(result);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all students' })
  @ApiResponse({ status: 200, description: 'List of students' })
  async findAll(@Query() query: FindAllStudentQueryDto) {
    const result = await this.studentService.findAll(query);
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
  // CUSTOM QUERIES (must be before :id route)
  // ============================================

  @Public()
  @Get('top-performing')
  @ApiOperation({ summary: 'Get top performing students (ranked by GPA)' })
  @ApiResponse({ status: 200, description: 'List of top students' })
  async getTopPerformingStudents(@Query('limit') limit?: string, @Query('minGPA') minGPA?: string) {
    let parsedLimit = 10;
    if (limit !== undefined && limit !== null && limit !== '') {
      const numLimit = Number(limit);
      if (!isNaN(numLimit) && Number.isInteger(numLimit) && numLimit > 0) {
        parsedLimit = numLimit;
      }
    }
    let parsedMinGPA: number | undefined = undefined;
    if (minGPA !== undefined && minGPA !== null && minGPA !== '') {
      const numGPA = Number(minGPA);
      if (!isNaN(numGPA) && numGPA >= 0) {
        parsedMinGPA = numGPA;
      }
    }
    const students = await this.studentService.getTopPerformingStudents(parsedLimit, parsedMinGPA);
    return {
      success: true,
      data: students,
    };
  }

  @Public()
  @Get('enrolled/this-month')
  @ApiOperation({ summary: 'Get students enrolled this month' })
  @ApiResponse({ status: 200, description: 'List of enrollments' })
  async getStudentsEnrolledThisMonth() {
    const enrollments = await this.studentService.getStudentsEnrolledThisMonth();
    return {
      success: true,
      data: enrollments,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiResponse({ status: 200, description: 'Student found' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.studentService.findOne(id);
    return this.responseMapper.toReadResponse(result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update student (Admin only)' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateStudentDto) {
    const result = await this.studentService.update(id, updateDto);
    return this.responseMapper.toUpdateResponse(result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete student (Admin only)' })
  @ApiResponse({ status: 204, description: 'Student deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.studentService.remove(id);
    return this.responseMapper.toDeleteResponse(id);
  }

  // ============================================
  // ENROLLMENT ENDPOINTS
  // ============================================

  @Public()
  @Post(':id/enroll')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll student in a course' })
  @ApiResponse({ status: 201, description: 'Student enrolled successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 409, description: 'Student already enrolled in course' })
  async enrollInCourse(@Param('id', ParseIntPipe) id: number, @Body() enrollDto: EnrollCourseDto) {
    const result = await this.studentService.enrollInCourse(id, enrollDto);
    return {
      success: true,
      message: 'Student enrolled in course successfully',
      data: result,
    };
  }

  @Public()
  @Get(':id/courses')
  @ApiOperation({ summary: 'Get student\'s enrolled courses' })
  @ApiResponse({ status: 200, description: 'List of enrolled courses' })
  async getEnrolledCourses(@Param('id', ParseIntPipe) id: number, @Query('status') status?: string) {
    const enrollments = await this.studentService.getEnrollments(id, status);
    return {
      success: true,
      data: enrollments,
    };
  }

  @Public()
  @Get(':id/enrollments')
  @ApiOperation({ summary: 'Get student\'s enrollment history' })
  @ApiResponse({ status: 200, description: 'List of enrollments' })
  async getEnrollments(@Param('id', ParseIntPipe) id: number, @Query('status') status?: string) {
    const enrollments = await this.studentService.getEnrollments(id, status);
    return {
      success: true,
      data: enrollments,
    };
  }

  @Public()
  @Put(':id/enrollments/:enrollmentId')
  @ApiOperation({ summary: 'Update enrollment (status or grade)' })
  @ApiResponse({ status: 200, description: 'Enrollment updated successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async updateEnrollment(
    @Param('id', ParseIntPipe) id: number,
    @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
    @Body() updateDto: UpdateEnrollmentDto,
  ) {
    const result = await this.studentService.updateEnrollment(id, enrollmentId, updateDto);
    return {
      success: true,
      message: 'Enrollment updated successfully',
      data: result,
    };
  }

  @Public()
  @Delete(':id/enrollments/:enrollmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Drop course enrollment' })
  @ApiResponse({ status: 204, description: 'Enrollment dropped successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async dropEnrollment(@Param('id', ParseIntPipe) id: number, @Param('enrollmentId', ParseIntPipe) enrollmentId: number) {
    await this.studentService.dropEnrollment(id, enrollmentId);
    return {
      success: true,
      message: 'Enrollment dropped successfully',
    };
  }

  @Public()
  @Get(':id/gpa')
  @ApiOperation({ summary: 'Get student GPA (average grade)' })
  @ApiResponse({ status: 200, description: 'Student GPA' })
  async getGPA(@Param('id', ParseIntPipe) id: number) {
    const result = await this.studentService.getStudentGPA(id);
    return {
      success: true,
      data: result,
    };
  }

  // ============================================
  // CUSTOM QUERIES
  // ============================================

  @Public()
  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get students enrolled in a course' })
  @ApiResponse({ status: 200, description: 'List of students' })
  async getStudentsByCourse(@Param('courseId', ParseIntPipe) courseId: number) {
    const students = await this.studentService.getStudentsByCourse(courseId);
    return {
      success: true,
      data: students,
    };
  }


  @Public()
  @Get('department/:departmentId')
  @ApiOperation({ summary: 'Get students enrolled in courses by department' })
  @ApiResponse({ status: 200, description: 'List of students' })
  async getStudentsByDepartment(@Param('departmentId', ParseIntPipe) departmentId: number) {
    const students = await this.studentService.getStudentsByDepartment(departmentId);
    return {
      success: true,
      data: students,
    };
  }

  @Public()
  @Get('gpa/above/:threshold')
  @ApiOperation({ summary: 'Get students with GPA above threshold' })
  @ApiResponse({ status: 200, description: 'List of students' })
  async getStudentsWithGPAAbove(@Param('threshold', ParseIntPipe) threshold: number) {
    const students = await this.studentService.getStudentsWithGPAAbove(threshold);
    return {
      success: true,
      data: students,
    };
  }

  @Public()
  @Get(':id/available-courses')
  @ApiOperation({ summary: 'Get available courses for student (not enrolled, active)' })
  @ApiResponse({ status: 200, description: 'List of available courses' })
  async getAvailableCourses(@Param('id', ParseIntPipe) id: number) {
    const courses = await this.studentService.getAvailableCoursesForStudent(id);
    return {
      success: true,
      data: courses,
    };
  }
}
