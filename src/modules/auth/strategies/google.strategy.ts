import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID:
        configService.get<string>('GOOGLE_CLIENT_ID') ||
        '712689444478-h03ul0igbrof9dpepkl559qc1qhlvtpg.apps.googleusercontent.com',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') ||
        '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',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3001/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    const email = emails?.[0]?.value;
    const displayName =
      name?.givenName && name?.familyName
        ? `${name.givenName} ${name.familyName}`
        : profile.displayName || email?.split('@')[0] || 'User';
    const avatar = photos?.[0]?.value;

    if (!email) {
      throw new UnauthorizedException('No email found from Google account');
    }

    const result = await this.authService.validateGoogleUser({
      googleId: id,
      email,
      name: displayName,
      avatar,
    });

    return result;
  }
}
