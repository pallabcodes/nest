import { DynamicModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Quick JWT module factory for faster auth setup
 * Reduces boilerplate from ~15 lines to ~1 line
 *
 * @example
 * ```ts
 * @Module({
 *   imports: [
 *     createJwtModule(), // Instead of JwtModule.registerAsync(...)
 *     // ... other imports
 *   ],
 * })
 * ```
 */
export function createJwtModule(): DynamicModule {
  return JwtModule.registerAsync({
    imports: [ConfigModule], // Explicit import for factory DI context (best practice, even if ConfigModule is global)
    useFactory: (configService: ConfigService) => {
      const secret = configService.get<string>('jwt.secret');
      const expiresIn = configService.get<string>('jwt.accessTokenExpiration') || '15m';
      if (!secret) {
        throw new Error('JWT secret is not configured');
      }
      return {
        secret,
        signOptions: {
          expiresIn: expiresIn as any,
        },
      } as any;
    },
    inject: [ConfigService],
  });
}

/**
 * Quick Passport module factory
 * Simple wrapper for consistency
 */
export function createPassportModule(): typeof PassportModule {
  return PassportModule;
}

/**
 * Combined auth modules helper
 * Returns both JWT and Passport modules configured
 *
 * @example
 * ```ts
 * @Module({
 *   imports: [
 *     ...createAuthModules(), // JWT + Passport in one go
 *     // ... other imports
 *   ],
 * })
 * ```
 */
export function createAuthModules(): Array<DynamicModule | typeof PassportModule> {
  return [PassportModule, createJwtModule()];
}
