import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UserResponseMapper } from './mappers/user-response.mapper';
import { User } from '../../database/models/user.model';
import { FileStorageService } from './file-storage.service';

@Module({
  imports: [
    SequelizeModule.forFeature([User]),
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository, UserResponseMapper, FileStorageService],
  exports: [UserService, UserRepository],
})
export class UserModule {}
