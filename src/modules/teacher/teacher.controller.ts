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
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AssignDepartmentDto, AssignCourseDto } from './dto/assign-department.dto';
import { MostCoursesQueryDto } from './dto/most-courses-query.dto';
import { TeacherResponseMapper } from './mappers/teacher-response.mapper';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('Teacher')
@Controller('teachers')
export class TeacherController {
  constructor(
    private readonly teacherService: TeacherService,
    private readonly responseMapper: TeacherResponseMapper,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new teacher' })
  @ApiResponse({ status: 201, description: 'Teacher created successfully' })
  async create(@Body() createDto: CreateTeacherDto) {
    const result = await this.teacherService.create(createDto);
    return this.responseMapper.toCreateResponse(result);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all teachers' })
  @ApiResponse({ status: 200, description: 'List of teachers' })
  async findAll(@Query() query: any) {
    const result = await this.teacherService.findAll(query);
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
  // SPECIFIC ROUTES (must be before :id route)
  // ============================================

  @Public()
  @Get('performance')
  @ApiOperation({ summary: 'Get comprehensive teacher performance metrics' })
  @ApiResponse({ status: 200, description: 'Teacher performance data' })
  async getTeacherPerformanceMetrics(@Query('teacherId') teacherId?: string) {
    let parsedTeacherId: number | undefined = undefined;
    if (teacherId !== undefined && teacherId !== null && teacherId !== '') {
      const numId = Number(teacherId);
      if (!isNaN(numId) && Number.isInteger(numId) && numId > 0) {
        parsedTeacherId = numId;
      }
    }
    const metrics = await this.teacherService.getTeacherPerformanceMetrics(parsedTeacherId);
    return {
      success: true,
      data: metrics,
    };
  }

  @Public()
  @Get('low-enrollment-courses')
  @ApiOperation({ summary: 'Get teachers teaching courses with low enrollment' })
  @ApiResponse({ status: 200, description: 'List of teachers and courses' })
  async getTeachersWithLowEnrollmentCourses(@Query('threshold') threshold?: string) {
    let parsedThreshold = 5;
    if (threshold !== undefined && threshold !== null && threshold !== '') {
      const numThreshold = Number(threshold);
      if (!isNaN(numThreshold) && Number.isInteger(numThreshold) && numThreshold >= 0) {
        parsedThreshold = numThreshold;
      }
    }
    const teachers = await this.teacherService.getTeachersWithLowEnrollmentCourses(parsedThreshold);
    return {
      success: true,
      data: teachers,
    };
  }

  @Public()
  @Get('most-courses')
  @ApiOperation({ summary: 'Get teachers with most courses' })
  @ApiResponse({ status: 200, description: 'List of teachers' })
  async getTeachersWithMostCourses(@Query() query: MostCoursesQueryDto) {
    const teachers = await this.teacherService.getTeachersWithMostCourses(query.limit ?? 10);
    return {
      success: true,
      data: teachers,
    };
  }

  @Public()
  @Get('department/:departmentId')
  @ApiOperation({ summary: 'Get teachers by department' })
  @ApiResponse({ status: 200, description: 'List of teachers' })
  async getTeachersByDepartment(@Param('departmentId', ParseIntPipe) departmentId: number) {
    const teachers = await this.teacherService.getTeachersByDepartment(departmentId);
    return {
      success: true,
      data: teachers,
    };
  }

  @Public()
  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get teachers by course' })
  @ApiResponse({ status: 200, description: 'List of teachers' })
  async getTeachersByCourse(@Param('courseId', ParseIntPipe) courseId: number) {
    const teachers = await this.teacherService.getTeachersByCourse(courseId);
    return {
      success: true,
      data: teachers,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get teacher by ID' })
  @ApiResponse({ status: 200, description: 'Teacher found' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.teacherService.findOne(id);
    return this.responseMapper.toReadResponse(result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update teacher (Admin only)' })
  @ApiResponse({ status: 200, description: 'Teacher updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateTeacherDto) {
    const result = await this.teacherService.update(id, updateDto);
    return this.responseMapper.toUpdateResponse(result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete teacher (Admin only)' })
  @ApiResponse({ status: 204, description: 'Teacher deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.teacherService.remove(id);
    return this.responseMapper.toDeleteResponse(id);
  }

  // ============================================
  // DEPARTMENT ASSIGNMENT ENDPOINTS
  // ============================================

  @Public()
  @Post(':id/departments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign teacher to department' })
  @ApiResponse({ status: 201, description: 'Teacher assigned successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  @ApiResponse({ status: 409, description: 'Teacher already assigned to department' })
  async assignToDepartment(@Param('id', ParseIntPipe) id: number, @Body() assignDto: AssignDepartmentDto) {
    const result = await this.teacherService.assignToDepartment(id, assignDto);
    return {
      success: true,
      message: 'Teacher assigned to department successfully',
      data: result,
    };
  }

  @Public()
  @Get(':id/departments')
  @ApiOperation({ summary: 'Get teacher\'s departments' })
  @ApiResponse({ status: 200, description: 'List of departments' })
  async getDepartments(@Param('id', ParseIntPipe) id: number) {
    const departments = await this.teacherService.getDepartments(id);
    return {
      success: true,
      data: departments,
    };
  }

  @Public()
  @Delete(':id/departments/:departmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove teacher from department' })
  @ApiResponse({ status: 204, description: 'Teacher removed successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async removeFromDepartment(@Param('id', ParseIntPipe) id: number, @Param('departmentId', ParseIntPipe) departmentId: number) {
    await this.teacherService.removeFromDepartment(id, departmentId);
    return {
      success: true,
      message: 'Teacher removed from department successfully',
    };
  }

  // ============================================
  // COURSE ASSIGNMENT ENDPOINTS
  // ============================================

  @Public()
  @Post(':id/courses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign teacher to course' })
  @ApiResponse({ status: 201, description: 'Teacher assigned successfully' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  @ApiResponse({ status: 409, description: 'Teacher already assigned to course' })
  async assignToCourse(@Param('id', ParseIntPipe) id: number, @Body() assignDto: AssignCourseDto) {
    const result = await this.teacherService.assignToCourse(id, assignDto);
    return {
      success: true,
      message: 'Teacher assigned to course successfully',
      data: result,
    };
  }

  @Public()
  @Get(':id/courses')
  @ApiOperation({ summary: 'Get teacher\'s courses' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  async getCourses(@Param('id', ParseIntPipe) id: number) {
    const courses = await this.teacherService.getCourses(id);
    return {
      success: true,
      data: courses,
    };
  }

  @Public()
  @Delete(':id/courses/:courseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove teacher from course' })
  @ApiResponse({ status: 204, description: 'Teacher removed successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async removeFromCourse(@Param('id', ParseIntPipe) id: number, @Param('courseId', ParseIntPipe) courseId: number) {
    await this.teacherService.removeFromCourse(id, courseId);
    return {
      success: true,
      message: 'Teacher removed from course successfully',
    };
  }



  @Public()
  @Get('department/:departmentId/stats')
  @ApiOperation({ summary: 'Get teachers by department with course and student statistics' })
  @ApiResponse({ status: 200, description: 'List of teachers with stats' })
  async getTeachersByDepartmentWithStats(@Param('departmentId', ParseIntPipe) departmentId: number) {
    const teachers = await this.teacherService.getTeachersByDepartmentWithStats(departmentId);
    return {
      success: true,
      data: teachers,
    };
  }
}
