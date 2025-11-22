import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { createAuthModules } from '@common/utils/module-helpers';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { UserRepository } from './repositories/user.repository';
import { OtpRepository } from './repositories/otp.repository';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordUtil } from './utils/password.util';
import { TokenUtil } from './utils/token.util';
import { OtpUtil } from './utils/otp.util';
import { UserUtil } from './utils/user.util';
import { User } from '../../database/models/user.model';
import { Otp } from '../../database/models/otp.model';
import { Role } from '../../database/models/role.model';
import { UserRole } from '../../database/models/user-role.model';

@Module({
  imports: [
    SequelizeModule.forFeature([User, Otp, Role, UserRole]),
    ...createAuthModules(), // JWT + Passport in one line
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    UserRepository,
    OtpRepository,
    TokenService,
    OtpService,
    JwtStrategy,
    PasswordUtil,
    TokenUtil,
    OtpUtil,
    UserUtil,
  ],
  exports: [AuthService],
})
export class AuthModule {}