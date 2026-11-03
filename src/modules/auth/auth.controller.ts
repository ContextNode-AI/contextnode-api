import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { Response, Request } from 'express';
import type { User } from '@prisma/client';

interface RequestWithCookies extends Request {
  cookies: Record<string, string>;
  user?: User;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Triggers Google OAuth2 consent screen
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: Request & { user: any },
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const authResult = req.user;
      if (!authResult?.accessToken) {
        console.error('Google OAuth callback failed: req.user is', req.user);
        return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
      }

      this.setTokenCookies(
        res,
        authResult.accessToken,
        authResult.refreshToken,
      );

      return res.redirect(
        `${frontendUrl}?token=${encodeURIComponent(authResult.accessToken)}&oauth=google`,
      );
    } catch (error) {
      console.error('Error in googleAuthCallback:', error);
      return res.redirect(`${frontendUrl}/login?error=oauth_server_error`);
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      refreshTokenDto.refreshToken || req.cookies?.['refresh_token'];
    const result = await this.authService.refreshTokens(token ?? '');
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'] as string | undefined;
    const result = await this.authService.logout(userId, refreshToken);

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
