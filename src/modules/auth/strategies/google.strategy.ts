// BOILERPLATE: Google OAuth strategy - uncomment when implementing OAuth
// import { Injectable } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { Strategy, VerifyCallback } from 'passport-google-oauth20';
// import { ConfigService } from '@nestjs/config';
// import { AuthRepository } from '../auth.repository';

// @Injectable()
// export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
//   constructor(
//     private configService: ConfigService,
//     private authRepository: AuthRepository,
//   ) {
//     super({
//       clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
//       clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
//       callbackURL: '/auth/google/callback',
//       scope: ['email', 'profile'],
//     });
//   }

//   async validate(
//     accessToken: string,
//     refreshToken: string,
//     profile: any,
//     done: VerifyCallback,
//   ): Promise<void> {
//     // TODO: Implement Google OAuth validation
//     // 1. Extract user info from Google profile
//     // 2. Check if user exists, create if not
//     // 3. Return user for authentication
//     done(null, profile);
//   }
// }
