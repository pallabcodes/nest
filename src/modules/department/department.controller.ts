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
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { MostTeachersQueryDto } from './dto/most-teachers-query.dto';
import { DepartmentResponseMapper } from './mappers/department-response.mapper';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('Department')
@Controller('departments')
export class DepartmentController {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly responseMapper: DepartmentResponseMapper,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new department' })
  @ApiResponse({ status: 201, description: 'Department created successfully' })
  async create(@Body() createDto: CreateDepartmentDto) {
    const result = await this.departmentService.create(createDto);
    return this.responseMapper.toCreateResponse(result);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all departments' })
  @ApiResponse({ status: 200, description: 'List of departments' })
  async findAll(@Query() query: any) {
    const result = await this.departmentService.findAll(query);
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
  @Get('most-teachers')
  @ApiOperation({ summary: 'Get departments with most teachers' })
  @ApiResponse({ status: 200, description: 'List of departments' })
  async getDepartmentsWithMostTeachers(@Query() query: MostTeachersQueryDto) {
    const departments = await this.departmentService.getDepartmentsWithMostTeachers(query.limit ?? 10);
    return {
      success: true,
      data: departments,
    };
  }

  // ============================================
  // COMPLEX QUERIES (must be before :id route)
  // ============================================

  @Public()
  @Get('performance')
  @ApiOperation({ summary: 'Get comprehensive department performance metrics' })
  @ApiResponse({ status: 200, description: 'Department performance data' })
  async getDepartmentPerformanceMetrics(@Query('departmentId') departmentId?: string) {
    let parsedDepartmentId: number | undefined = undefined;
    if (departmentId !== undefined && departmentId !== null && departmentId !== '') {
      const numId = Number(departmentId);
      if (!isNaN(numId) && Number.isInteger(numId) && numId > 0) {
        parsedDepartmentId = numId;
      }
    }
    const metrics = await this.departmentService.getDepartmentPerformanceMetrics(parsedDepartmentId);
    return {
      success: true,
      data: metrics,
    };
  }

  @Public()
  @Get('most-students')
  @ApiOperation({ summary: 'Get departments with most enrolled students' })
  @ApiResponse({ status: 200, description: 'List of departments' })
  async getDepartmentWithMostStudents(@Query('limit') limit?: string) {
    let parsedLimit = 10;
    if (limit !== undefined && limit !== null && limit !== '') {
      const numLimit = Number(limit);
      if (!isNaN(numLimit) && Number.isInteger(numLimit) && numLimit > 0) {
        parsedLimit = numLimit;
      }
    }
    const departments = await this.departmentService.getDepartmentWithMostStudents(parsedLimit);
    return {
      success: true,
      data: departments,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  @ApiResponse({ status: 200, description: 'Department found' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.departmentService.findOne(id);
    return this.responseMapper.toReadResponse(result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update department (Admin only)' })
  @ApiResponse({ status: 200, description: 'Department updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateDepartmentDto) {
    const result = await this.departmentService.update(id, updateDto);
    return this.responseMapper.toUpdateResponse(result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete department (Admin only)' })
  @ApiResponse({ status: 204, description: 'Department deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.departmentService.remove(id);
    return this.responseMapper.toDeleteResponse(id);
  }

  // ============================================
  // RELATIONSHIP ENDPOINTS
  // ============================================

  @Public()
  @Get(':id/teachers')
  @ApiOperation({ summary: 'Get teachers in department' })
  @ApiResponse({ status: 200, description: 'List of teachers' })
  async getTeachers(@Param('id', ParseIntPipe) id: number) {
    const teachers = await this.departmentService.getTeachers(id);
    return {
      success: true,
      data: teachers,
    };
  }

  @Public()
  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get department statistics' })
  @ApiResponse({ status: 200, description: 'Department statistics' })
  async getStatistics(@Param('id', ParseIntPipe) id: number) {
    const stats = await this.departmentService.getDepartmentStatistics(id);
    return {
      success: true,
      data: stats,
    };
  }

}
