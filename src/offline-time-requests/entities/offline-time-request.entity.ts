import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { OfflineTimeRequestStatus } from '../enums/offline-time-request-status.enum';
import { OfflineTimeCategory } from '../enums/offline-time-category.enum';

@Entity('offline_time_requests')
@Index(['tenantId', 'status'])
@Index(['userId'])
export class OfflineTimeRequest extends BaseEntity {
  @Column()
  tenantId: number;

  @Column()
  userId: number;

  @Column({ type: 'timestamptz' })
  startAt: Date;

  @Column({ type: 'timestamptz' })
  endAt: Date;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: OfflineTimeCategory,
  })
  category: OfflineTimeCategory;

  @Column({
    type: 'enum',
    enum: OfflineTimeRequestStatus,
    default: OfflineTimeRequestStatus.PENDING,
  })
  status: OfflineTimeRequestStatus;

  @Column({ type: 'int', nullable: true })
  reviewedByUserId: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  declineReason: string | null;
}
