import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string, userType: string) {
    let user;
    if (userType === 'superadmin') {
      user = await this.authService.validateSuperAdmin(email, password);
    } else {
      user = await this.authService.validateUser(email, password);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
