import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity()
@Index(['tenantId'])
@Index(['userId'])
@Unique(['tenantId', 'userId', 'deviceId'])
export class Device extends BaseEntity {
  @Column()
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Agent-provided unique identifier for a device (e.g. hardware or installation ID).
   */
  @Column()
  deviceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt?: Date | null;

  @Column({ default: true })
  isAuthorized: boolean;
}

