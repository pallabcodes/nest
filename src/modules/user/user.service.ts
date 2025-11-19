import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileStorageService } from './file-storage.service';
import { User } from '../../database/models/user.model';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async create(createDto: CreateUserDto) {
    return this.userRepository.create(createDto);
  }

  async findAll(query?: any) {
    return this.userRepository.findAll(query);
  }

  async findOne(id: number) {
    const item = await this.userRepository.findById(id);
    if (!item) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return item;
  }

  async update(id: number, updateDto: UpdateUserDto): Promise<User> {
    const item = await this.findOne(id);
    await this.userRepository.update(id, updateDto);
    const updated = await this.userRepository.findById(id);
    if (!updated) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return updated;
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    await this.userRepository.delete(id);
    return item;
  }

  async updateAvatar(userId: number, filePath: string): Promise<User> {
    const user = await this.findOne(userId);
    
    // Delete old avatar if exists
    if (user.avatar) {
      await this.fileStorageService.deleteFile(user.avatar);
    }
    
    await this.userRepository.update(userId, { avatar: filePath });
    const updatedUser = await this.userRepository.findById(userId);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return updatedUser;
  }
}
