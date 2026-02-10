import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UnauthorizedException,
  Req,
  Res,
} from '@nestjs/common';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthService } from './auth.service';
import { LoginDto, UserType } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { DeviceInfoDto } from './dto/device-info.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { ExtractJwt } from 'passport-jwt';
import { PasswordResetService } from '../password-reset/password-reset.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Public()
  @Get('login')
  getLoginPage(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const returnUrl = (req.query?.returnUrl as string) || undefined;

    // Simple HTML login page
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Device Authorization - Login</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      max-width: 400px;
      width: 100%;
    }
    h1 {
      color: #1f2937;
      margin: 0 0 1.5rem 0;
      text-align: center;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #374151;
      font-weight: 500;
    }
    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 5px;
      font-size: 1rem;
      box-sizing: border-box;
    }
    button {
      width: 100%;
      padding: 0.75rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 1rem;
    }
    button:hover {
      background: #5568d3;
    }
    .error {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    ${returnUrl ? '.info { color: #6b7280; font-size: 0.875rem; margin-bottom: 1rem; }' : ''}
  </style>
</head>
<body>
  <div class="container">
    <h1>Device Authorization</h1>
    ${returnUrl ? '<div class="info">Please log in to authorize your device.</div>' : ''}
    <form id="loginForm" method="POST" action="/auth/login${returnUrl ? '?returnUrl=' + encodeURIComponent(returnUrl) : ''}">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required>
      </div>
      <div class="form-group">
        <label for="userType">User Type</label>
        <select id="userType" name="userType" required style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 5px; font-size: 1rem; box-sizing: border-box;">
          <option value="user">User</option>
          <option value="superadmin">Super Admin</option>
        </select>
      </div>
      <button type="submit">Login</button>
      <div id="error" class="error" style="display: none;"></div>
    </form>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const data = Object.fromEntries(formData);
      
      try {
        const response = await fetch('/auth/login${returnUrl ? '?returnUrl=' + encodeURIComponent(returnUrl) : ''}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.returnUrl) {
            // Append token to returnUrl for authentication
            const separator = result.returnUrl.includes('?') ? '&' : '?';
            window.location.href = result.returnUrl + separator + 'token=' + encodeURIComponent(result.accessToken);
          } else {
            document.getElementById('error').textContent = 'Login successful! You can close this window.';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').style.color = '#10b981';
          }
        } else {
          const error = await response.json();
          document.getElementById('error').textContent = error.message || 'Login failed';
          document.getElementById('error').style.display = 'block';
        }
      } catch (error) {
        document.getElementById('error').textContent = 'An error occurred. Please try again.';
        document.getElementById('error').style.display = 'block';
      }
    });
  </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto & { device?: DeviceInfoDto },
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    const returnUrl = (req.query?.returnUrl as string) || undefined;
    console.log(loginDto);
    console.log(returnUrl);

    if (loginDto.userType === UserType.SUPERADMIN) {
      const superAdmin = await this.authService.validateSuperAdmin(
        loginDto.email,
        loginDto.password,
      );
      if (!superAdmin) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const result = await this.authService.loginSuperAdmin(superAdmin);

      // Set httpOnly cookie for refresh token (more secure)
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProduction, // Only send over HTTPS in production
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // If returnUrl is provided, redirect to it
      if (returnUrl) {
        // For browser requests (JSON), return JSON with returnUrl
        if (req.headers['content-type']?.includes('application/json')) {
          // Don't include refreshToken in response body when using httpOnly cookie
          const { refreshToken, ...responseData } = result;
          return res.json({ ...responseData, returnUrl });
        }
        // For form submissions, redirect
        return res.redirect(returnUrl);
      }
      // Don't include refreshToken in response body when using httpOnly cookie
      const { refreshToken, ...responseData } = result;
      return res.json(responseData);
    } else {
      const user = await this.authService.validateUser(
        loginDto.email,
        loginDto.password,
      );
      console.log(user);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const result = await this.authService.login(user, {
        deviceId: loginDto.device?.deviceId,
        deviceName: loginDto.device?.deviceName,
        userAgent: loginDto.device?.userAgent,
        ipAddress: loginDto.device?.ipAddress,
        clientType: loginDto.device?.clientType,
      });
      console.log(result);
      
      // Set httpOnly cookie for refresh token (more secure)
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: isProduction, // Only send over HTTPS in production
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // If returnUrl is provided, redirect to it
      if (returnUrl) {
        // For browser requests (JSON), return JSON with returnUrl
        if (req.headers['content-type']?.includes('application/json')) {
          // Don't include refreshToken in response body when using httpOnly cookie
          const { refreshToken, ...responseData } = result;
          return res.json({ ...responseData, returnUrl });
        }
        // For form submissions, redirect
        return res.redirect(returnUrl);
      }
      // Don't include refreshToken in response body when using httpOnly cookie
      const { refreshToken, ...responseData } = result;
      return res.json(responseData);
    }
  }

  @Public()
  @Post('login/superadmin')
  async loginSuperAdmin(@Body() loginDto: LoginDto) {
    const superAdmin = await this.authService.validateSuperAdmin(
      loginDto.email,
      loginDto.password,
    );
    if (!superAdmin) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.loginSuperAdmin(superAdmin);
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    // Try to get refresh token from cookie first, then from body
    const refreshTokenFromCookie = req.cookies?.refreshToken;
    const refreshToken = refreshTokenFromCookie || dto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const result = await this.authService.refreshToken(refreshToken);

    // Set httpOnly cookie for refresh token (if it was updated)
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return res.json(result);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const token = await this.passwordResetService.createResetToken(dto.email);
    // In production you would not return the token; here it's useful for dev.
    return {
      message: 'If an account exists, a reset email has been sent.',
      token,
    };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: ExpressRequest & { user?: unknown }) {
    // `req.user` is populated by JwtAuthGuard
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    // Extract token from request
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    await this.authService.logout(token);

    // Clear refresh token cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });

    return res.json({
      message: 'Logged out successfully',
    });
  }
}
