import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { TenantStatus } from '../../common/enums/tenant-status.enum';

@Entity()
@Index(['slug'], { unique: true })
@Index(['status'])
export class Tenant extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.PENDING,
  })
  status: TenantStatus;

  /**
   * General working hours configuration for the organization.
   * Example shape (validated at DTO level, stored as JSON):
   * {
   *   timezone: 'Europe/Riga',
   *   defaultStartTime: '09:00',
   *   defaultEndTime: '18:00',
   *   workingDays: [1,2,3,4,5] // Mon-Fri
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  workingHoursConfig: Record<string, any> | null;

  /**
   * High-level tracking rules and preferences.
   * Example:
   * {
   *   idleTimeoutMinutes: 5,
   *   allowScreenshots: true,
   *   screenshotIntervalMinutes: 15,
   *   activitySensitivity: 'normal'
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  trackingSettings: Record<string, any> | null;
}
