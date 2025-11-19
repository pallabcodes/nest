import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { User } from '../../database/models/user.model';
import { Otp } from '../../database/models/otp.model';
import { Role } from '../../database/models/role.model';
import { UserRole } from '../../database/models/user-role.model';
import { SocialAuth } from '../../database/models/social-auth.model';
import { createAuthModules } from '@common/utils/module-helpers';
import { AuthResponseMapper } from './mappers/auth-response.mapper';

@Module({
  imports: [
    SequelizeModule.forFeature([User, Otp, Role, UserRole, SocialAuth]),
    ...createAuthModules(), // JWT + Passport in one line
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AuthResponseMapper, JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
