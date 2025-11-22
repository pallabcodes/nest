import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UserResponsePresenter } from './presenters/user-response.presenter';
import { User } from '../../database/models/user.model';
import { FileStorageService } from './file-storage.service';
import { FileValidationService } from './services/file-validation.service';

@Module({
  imports: [SequelizeModule.forFeature([User])],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    UserResponsePresenter,
    FileStorageService,
    FileValidationService,
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}
