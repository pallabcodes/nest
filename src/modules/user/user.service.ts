import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileStorageService } from './file-storage.service';
import { CacheService } from '../../common/cache/cache.service';
import { Cache, CacheInvalidateByTags } from '../../common/cache/cache.decorators';
import { User } from '../../database/models/user.model';
import type { FindAllUserQueryDto } from './dto/find-all-user-query.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly fileStorageService: FileStorageService,
    private readonly cacheService: CacheService,
  ) {}

  async create(createDto: CreateUserDto): Promise<User> {
    throw new Error('Not implemented');
  }

  async findAll(
    query?: FindAllUserQueryDto,
  ): Promise<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    throw new Error('Not implemented');
  }

  @Cache('user:id', 300, { tags: ['user'] })
  async findOne(id: number): Promise<User> {
    throw new Error('Not implemented');
  }

  @CacheInvalidateByTags(['user'])
  async update(id: number, updateDto: UpdateUserDto): Promise<User> {
    throw new Error('Not implemented');
  }

  @CacheInvalidateByTags(['user'])
  async remove(id: number): Promise<User> {
    throw new Error('Not implemented');
  }

  async updateAvatar(userId: number, file: Express.Multer.File): Promise<User> {
    throw new Error('Not implemented');
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<string[]> {
    throw new Error('Not implemented');
  }

  async uploadFilesLegacy(files: Express.Multer.File[]): Promise<string[]> {
    throw new Error('Not implemented');
  }
}
