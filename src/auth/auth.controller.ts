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

    // Device / backend-rendered login page
    // This is primarily used for device authorization flows opened by the desktop agent.
    // It is styled to visually resemble the main frontend login screen.
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Sign In - Time Tracking</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: radial-gradient(circle at top, #0f172a 0, #020617 40%, #020617 100%);
      color: #e5e7eb;
    }
    .container {
      background: rgba(15, 23, 42, 0.95);
      padding: 2.5rem 2.25rem;
      border-radius: 0.75rem;
      box-shadow:
        0 20px 25px -5px rgba(15, 23, 42, 0.8),
        0 10px 10px -5px rgba(15, 23, 42, 0.7);
      max-width: 420px;
      width: 100%;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.75rem;
      gap: 0.75rem;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      border-radius: 0.75rem;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 1rem;
      box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.9),
                  0 10px 25px rgba(15, 23, 42, 0.9);
    }
    .logo-text {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #e5e7eb;
    }
    h1 {
      color: #e5e7eb;
      margin: 0 0 0.5rem 0;
      text-align: left;
      font-size: 1.5rem;
      font-weight: 800;
    }
    .subtitle {
      margin: 0 0 1.75rem 0;
      color: #9ca3af;
      font-size: 0.9rem;
    }
    .device-info {
      margin-bottom: 1.5rem;
      padding: 0.75rem 0.85rem;
      border-radius: 0.5rem;
      background: rgba(15, 118, 110, 0.07);
      border: 1px solid rgba(45, 212, 191, 0.2);
      color: #a5b4fc;
      font-size: 0.8rem;
      display: ${returnUrl ? 'block' : 'none'};
    }
    .form-group {
      margin-bottom: 1rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #d1d5db;
      font-weight: 500;
      font-size: 0.85rem;
    }
    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid rgba(55, 65, 81, 0.9);
      border-radius: 0.5rem;
      font-size: 0.9rem;
      box-sizing: border-box;
      background: rgba(15, 23, 42, 0.9);
      color: #e5e7eb;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }
    input::placeholder {
      color: #6b7280;
    }
    input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.6);
      background: rgba(15, 23, 42, 1);
    }
    .actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 0.25rem;
      margin-bottom: 0.25rem;
      font-size: 0.8rem;
    }
    .link {
      color: #a5b4fc;
      text-decoration: none;
      font-weight: 500;
    }
    .link:hover {
      color: #c7d2fe;
      text-decoration: underline;
    }
    button {
      width: 100%;
      padding: 0.75rem;
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 1.25rem;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.9);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }
    button:hover {
      background: linear-gradient(135deg, #4338ca, #4f46e5);
    }
    .error {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .success {
      color: #22c55e;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .footer {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.75rem;
      color: #6b7280;
    }
    .footer span {
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-icon">TT</div>
      <div class="logo-text">Time Tracking</div>
    </div>
    <h1>Let&#39;s Get Started</h1>
    <p class="subtitle">Sign in to continue.</p>
    <div class="device-info">
      This window was opened by the Time Tracking desktop agent. After signing in, you can close this tab.
    </div>
    <form id="loginForm" method="POST" action="/auth/login${returnUrl ? '?returnUrl=' + encodeURIComponent(returnUrl) : ''}">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" autocomplete="email" required>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" autocomplete="current-password" required>
      </div>
      <!-- Force userType to 'user' for device authorization flows -->
      <input type="hidden" id="userType" name="userType" value="user" />
      <button type="submit">Login</button>
      <div id="error" class="error" style="display: none;"></div>
      <div id="success" class="success" style="display: none;"></div>
    </form>
    <div class="footer">
      <span>Don&#39;t have an account?</span> Contact your workspace administrator.
    </div>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const data = Object.fromEntries(formData);
      // Ensure userType is always 'user' for this flow
      data.userType = 'user';
      const errorEl = document.getElementById('error');
      const successEl = document.getElementById('success');
      errorEl.style.display = 'none';
      successEl.style.display = 'none';
      
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
            successEl.textContent = 'Login successful! You can close this window.';
            successEl.style.display = 'block';
          }
        } else {
          const error = await response.json();
          errorEl.textContent = error.message || 'Login failed';
          errorEl.style.display = 'block';
        }
      } catch (error) {
        errorEl.textContent = 'An error occurred. Please try again.';
        errorEl.style.display = 'block';
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

    // For device authorization flows (opened by the desktop agent), we always
    // treat the login as a regular user, never as a superadmin, regardless of
    // what the client sends.
    if (returnUrl && returnUrl.includes('/auth/device/authorize')) {
      loginDto.userType = UserType.USER;
    }
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
