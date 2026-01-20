import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UsersService } from '../users/users.service';
import { hashPassword } from '../common/utils/password.util';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokensRepository: Repository<PasswordResetToken>,
    private readonly usersService: UsersService,
  ) {}

  async createResetToken(email: string): Promise<string> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // For security, do not reveal whether the user exists
      return '';
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const resetToken = this.tokensRepository.create({
      userId: user.id,
      token,
      expiresAt,
    });

    await this.tokensRepository.save(resetToken);

    // In a real system, send email here; for now return token for debugging/use in dev.
    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.tokensRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new NotFoundException('Invalid reset token');
    }

    if (resetToken.usedAt) {
      throw new ForbiddenException('Reset token already used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new ForbiddenException('Reset token has expired');
    }

    const hashedPassword = await hashPassword(newPassword);
    resetToken.user.password = hashedPassword;
    resetToken.usedAt = new Date();

    await this.tokensRepository.manager.transaction(async (manager) => {
      await manager.save(resetToken.user);
      await manager.save(resetToken);
    });
  }
}

