import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { User } from '../../database/models/user.model';
import type { FindAllUserQueryDto } from './dto/find-all-user-query.dto';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    throw new Error('Not implemented');
  }

  async findById(id: number): Promise<User | null> {
    throw new Error('Not implemented');
  }

  async findAll(
    query?: FindAllUserQueryDto,
  ): Promise<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    throw new Error('Not implemented');
  }

  async update(id: number, data: Partial<User>): Promise<[number]> {
    throw new Error('Not implemented');
  }

  async delete(id: number): Promise<void> {
    throw new Error('Not implemented');
  }

  async findByEmail(email: string): Promise<User | null> {
    throw new Error('Not implemented');
  }
}
