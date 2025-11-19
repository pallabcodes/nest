import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { User } from '../../database/models/user.model';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    return this.userModel.create(data as any);
  }

  async findById(id: number): Promise<User | null> {
    return this.userModel.findByPk(id);
  }

  async findAll(query?: any): Promise<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 10, ...filters } = query || {};
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 10;
    const offset = (safePage - 1) * safeLimit;

    const where: any = {};
    
    if (filters.name) {
      where.name = { [Op.like]: `%${filters.name}%` };
    }
    if (filters.email) {
      where.email = { [Op.like]: `%${filters.email}%` };
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    const { rows, count } = await this.userModel.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      data: rows,
      total: count,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(count / safeLimit),
    };
  }

  async update(id: number, data: Partial<User>): Promise<[number]> {
    return this.userModel.update(data, { where: { id } });
  }

  async delete(id: number): Promise<void> {
    await this.userModel.destroy({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }
}
