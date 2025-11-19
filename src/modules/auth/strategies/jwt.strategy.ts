import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthRepository } from '../auth.repository';
import type { JwtPayload, AuthenticatedUser } from '@shared-types/auth';

const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    return req.cookies['accessToken'] || null;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authRepository: AuthRepository,
  ) {
    const secret = configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error('JWT secret is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Load user from database for basic info (name, etc.)
    const user = await this.authRepository.findUserById(payload.sub);
    
    // ALWAYS use JWT payload roles as primary source (they're validated during token generation)
    // This ensures consistency and avoids database lookup issues
    let roleNames: string[] = [];
    
    if (payload.roles && Array.isArray(payload.roles)) {
      // Extract clean role strings from JWT payload
      roleNames = payload.roles
        .filter((r: any) => r !== null && r !== undefined && r !== '' && typeof r === 'string')
        .map((r: string) => r.trim().toUpperCase())
        .filter((r: string) => r.length > 0);
    }
    
    // Fallback: try database only if JWT has no roles (shouldn't happen in normal flow)
    if (roleNames.length === 0 && user) {
      const userWithRoles = await this.authRepository.findUserByIdWithRoles(payload.sub);
      if (userWithRoles?.roles && Array.isArray(userWithRoles.roles)) {
        roleNames = userWithRoles.roles
          .map((role: any) => {
            if (typeof role === 'string') return role.trim().toUpperCase();
            if (role && typeof role === 'object' && role.name && typeof role.name === 'string') {
              return role.name.trim().toUpperCase();
            }
            return null;
          })
          .filter((r: any) => r !== null && r !== undefined && r !== '' && typeof r === 'string') as string[];
      }
    }
    
    // If user not found and no valid roles, throw error
    if (!user && roleNames.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: user?.name || (payload.email ? payload.email.split('@')[0] : 'User'),
      roles: roleNames,
    } as AuthenticatedUser;
  }
}

