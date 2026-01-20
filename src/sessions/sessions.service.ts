import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SessionClientType,
  UserSession,
} from './entities/user-session.entity';
import * as bcrypt from 'bcrypt';

export interface CreateSessionOptions {
  userId: number;
  tenantId: number;
  refreshToken: string;
  expiresAt: Date;
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  clientType: SessionClientType;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(UserSession)
    private readonly sessionsRepository: Repository<UserSession>,
  ) {}

  async createSession(options: CreateSessionOptions): Promise<UserSession> {
    const refreshTokenHash = await bcrypt.hash(options.refreshToken, 10);

    const session = this.sessionsRepository.create({
      userId: options.userId,
      tenantId: options.tenantId,
      deviceId: options.deviceId,
      deviceName: options.deviceName,
      userAgent: options.userAgent,
      ipAddress: options.ipAddress,
      clientType: options.clientType,
      refreshTokenHash,
      expiresAt: options.expiresAt,
    });

    return this.sessionsRepository.save(session);
  }

  async findValidSessionByToken(
    userId: number,
    refreshToken: string,
  ): Promise<UserSession | null> {
    const sessions = await this.sessionsRepository.find({
      where: { userId },
    });

    const now = new Date();

    for (const session of sessions) {
      if (session.revokedAt || session.expiresAt < now) {
        continue;
      }
      if (
        session.refreshTokenHash &&
        (await bcrypt.compare(refreshToken, session.refreshTokenHash))
      ) {
        return session;
      }
    }

    return null;
  }

  async revokeSessionById(id: number): Promise<void> {
    await this.sessionsRepository.update(id, {
      revokedAt: new Date(),
    });
  }

  async revokeAllUserSessions(userId: number): Promise<void> {
    await this.sessionsRepository.update(
      { userId },
      { revokedAt: new Date() },
    );
  }

  async findUserSessions(userId: number): Promise<UserSession[]> {
    return this.sessionsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findTenantSessions(tenantId: number): Promise<UserSession[]> {
    return this.sessionsRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }
}

