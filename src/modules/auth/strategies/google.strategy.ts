import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from '../auth.repository';
import { SocialProvider } from '../../../database/models/social-auth.model';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authRepository: AuthRepository,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'your-google-client-id',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'your-google-client-secret',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails } = profile;
    const email = emails[0]?.value;

    if (!email) {
      return done(new Error('Email not provided by Google'), undefined);
    }

    try {
      // Check if social auth exists
      let socialAuth = await this.authRepository.findSocialAuth(
        SocialProvider.GOOGLE,
        id,
      );

      if (socialAuth) {
        // User exists, return user with roles
        const user = await this.authRepository.findUserByIdWithRoles(socialAuth.userId);
        if (!user) {
          return done(new Error('User not found'), undefined);
        }
        return done(null, { id: user.id, email: user.email, name: user.name });
      }

      // Check if user exists by email
      let user = await this.authRepository.findUserByEmail(email);

      if (!user) {
        // Create new user with OAuth (no password, email verified)
        const fullName = name?.givenName && name?.familyName
          ? `${name.givenName} ${name.familyName}`
          : email.split('@')[0];

        user = await this.authRepository.createUser({
          email,
          password: '', // Empty password for OAuth users
          name: fullName,
          isEmailVerified: true, // Google verified the email
        });

        // Assign default USER role
        const defaultRole = await this.authRepository.findRoleByName('USER');
        if (defaultRole) {
          await this.authRepository.assignRoleToUser(
            user.id,
            defaultRole.id,
            user.id,
            'OAuth user role assignment',
          );
        }
      }

      // Create social auth record
      await this.authRepository.createSocialAuth({
        userId: user.id,
        provider: SocialProvider.GOOGLE,
        providerId: id,
      });

      return done(null, { id: user.id, email: user.email, name: user.name });
    } catch (error) {
      return done(error, undefined);
    }
  }
}

