import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Team } from '../../teams/entities/team.entity';
import { RuleCollection } from '../../rule-collections/entities/rule-collection.entity';
import { AppType } from './team-productivity-rule.entity';

export enum UnclassifiedAppStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  CLASSIFIED = 'classified',
}

@Entity()
@Index(['tenantId'])
@Index(['tenantId', 'status'])
@Index(['teamId', 'status'])
@Unique(['tenantId', 'teamId', 'appName', 'appType'])
export class UnclassifiedApp extends BaseEntity {
  @Column()
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true })
  teamId?: number | null;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'teamId' })
  team?: Team | null;

  @Column({ type: 'varchar', length: 255 })
  appName: string;

  @Column({
    type: 'enum',
    enum: AppType,
  })
  appType: AppType;

  @Column({ type: 'timestamp' })
  firstSeen: Date;

  @Column({ type: 'timestamp' })
  lastSeen: Date;

  @Column({ type: 'integer', default: 1 })
  eventCount: number;

  @Column({
    type: 'enum',
    enum: UnclassifiedAppStatus,
    default: UnclassifiedAppStatus.PENDING,
  })
  status: UnclassifiedAppStatus;

  @Column({ nullable: true })
  suggestedCollectionId?: number | null;

  @ManyToOne(() => RuleCollection, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'suggestedCollectionId' })
  suggestedCollection?: RuleCollection | null;
}
