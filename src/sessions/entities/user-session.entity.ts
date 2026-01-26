import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum SessionClientType {
  WEB = 'WEB',
  DESKTOP = 'DESKTOP',
  AGENT = 'AGENT',
}

@Entity()
@Index(['userId'])
@Index(['tenantId'])
export class UserSession extends BaseEntity {
  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  tenantId: number | null;

  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceName?: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress?: string | null;

  /**
   * Hashed refresh token for this session.
   */
  @Column({ type: 'varchar', length: 512, nullable: true })
  refreshTokenHash?: string | null;

  @Column()
  clientType: SessionClientType;

  @Column()
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date | null;
}

