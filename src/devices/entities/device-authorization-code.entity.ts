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

@Entity('device_authorization_codes')
@Index(['code'], { unique: true })
@Index(['deviceId'])
@Index(['expiresAt'])
export class DeviceAuthorizationCode extends BaseEntity {
  /**
   * Authorization code (random string, stored as-is for validation)
   */
  @Column({ type: 'varchar', length: 64, unique: true })
  code: string;

  /**
   * Device ID that this code is for
   */
  @Column({ type: 'varchar', length: 255 })
  deviceId: string;

  /**
   * User ID (set after user logs in)
   */
  @Column({ type: 'integer', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  /**
   * Tenant ID (set after user logs in)
   */
  @Column({ type: 'integer', nullable: true })
  tenantId: number | null;

  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant | null;

  /**
   * Redirect URI for validation
   */
  @Column({ type: 'varchar', length: 512 })
  redirectUri: string;

  /**
   * Optional device name
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceName: string | null;

  /**
   * Code expiration time (10 minutes from creation)
   */
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  /**
   * When the code was used (null if not used yet)
   */
  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;
}
