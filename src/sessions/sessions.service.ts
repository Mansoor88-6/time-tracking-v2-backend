import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import {
  SessionClientType,
  UserSession,
} from './entities/user-session.entity';
import * as bcrypt from 'bcrypt';

export interface CreateSessionOptions {
  userId: number;
  tenantId?: number | null;
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

  /**
   * Non-revoked sessions that are not past refresh expiry (still "active" for listing).
   */
  async findActiveUserSessions(userId: number): Promise<UserSession[]> {
    const now = new Date();
    return this.sessionsRepository.find({
      where: {
        userId,
        revokedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findTenantSessions(tenantId: number): Promise<UserSession[]> {
    return this.sessionsRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveSessionsForTenant(tenantId: number): Promise<UserSession[]> {
    const now = new Date();
    return this.sessionsRepository.find({
      where: {
        tenantId,
        revokedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /** All active tenant-user sessions (platform super admin). */
  async findAllActiveSessions(): Promise<UserSession[]> {
    const now = new Date();
    return this.sessionsRepository.find({
      where: {
        revokedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
      relations: ['user', 'tenant'],
      order: { createdAt: 'DESC' },
    });
  }

  async findSessionById(id: number): Promise<UserSession | null> {
    return this.sessionsRepository.findOne({
      where: { id },
    });
  }

  /**
   * Strip secrets before sending to clients.
   */
  toPublicSession(session: UserSession): Record<string, unknown> {
    return {
      id: session.id,
      userId: session.userId,
      userName: session.user?.name ?? null,
      userEmail: session.user?.email ?? null,
      tenantId: session.tenantId,
      tenantName: session.tenant?.name ?? null,
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      clientType: session.clientType,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
    };
  }
}

