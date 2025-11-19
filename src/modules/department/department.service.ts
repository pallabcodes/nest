import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DepartmentRepository } from './department.repository';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async create(createDto: CreateDepartmentDto) {
    return this.departmentRepository.create(createDto);
  }

  async findAll(query?: any) {
    return this.departmentRepository.findAll(query);
  }

  async findOne(id: number) {
    const item = await this.departmentRepository.findById(id);
    if (!item) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return item;
  }

  async update(id: number, updateDto: UpdateDepartmentDto) {
    const item = await this.findOne(id);
    await this.departmentRepository.update(id, updateDto);
    return this.departmentRepository.findById(id);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.departmentRepository.delete(id);
    return item;
  }

  // ============================================
  // RELATIONSHIP QUERIES
  // ============================================

  async getTeachers(departmentId: number) {
    await this.findOne(departmentId); // Verify department exists
    return this.departmentRepository.getTeachers(departmentId);
  }

  async getDepartmentStatistics(departmentId: number) {
    await this.findOne(departmentId); // Verify department exists
    return this.departmentRepository.getDepartmentStatistics(departmentId);
  }

  async getDepartmentsWithMostTeachers(limit: number = 10) {
    return this.departmentRepository.getDepartmentsWithMostTeachers(limit);
  }

  // ============================================
  // COMPLEX QUERIES
  // ============================================

  async getDepartmentPerformanceMetrics(departmentId?: number) {
    // Ensure departmentId is valid if provided
    let safeDepartmentId: number | undefined = undefined;
    if (departmentId != null && typeof departmentId === 'number' && !isNaN(departmentId) && isFinite(departmentId) && departmentId > 0) {
      safeDepartmentId = Math.floor(Math.abs(departmentId));
    }
    return this.departmentRepository.getDepartmentPerformanceMetrics(safeDepartmentId);
  }

  async getDepartmentWithMostStudents(limit: number = 10) {
    // Ensure limit is always a valid number
    const safeLimit = (limit != null && typeof limit === 'number' && !isNaN(limit) && isFinite(limit) && limit > 0) 
      ? Math.floor(Math.abs(limit)) 
      : 10;
    return this.departmentRepository.getDepartmentWithMostStudents(safeLimit);
  }
}
