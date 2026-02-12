import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Team } from '../../teams/entities/team.entity';
import { RuleCollection } from '../../rule-collections/entities/rule-collection.entity';

export enum AppType {
  DESKTOP = 'desktop',
  WEB = 'web',
}

export enum AppCategory {
  PRODUCTIVE = 'productive',
  UNPRODUCTIVE = 'unproductive',
  NEUTRAL = 'neutral',
}

export enum RuleType {
  APP_NAME = 'app_name',      // Legacy: matches by app name
  DOMAIN = 'domain',           // Matches entire domain
  URL_EXACT = 'url_exact',     // Exact URL match
  URL_PATTERN = 'url_pattern', // Pattern match (wildcards)
}

@Entity()
@Index(['teamId'])
@Index(['teamId', 'appType'])
@Index(['collectionId'])
@Index(['ruleType'])
@Index(['isDomainRule'])
@Unique(['teamId', 'appName', 'appType'])
export class TeamProductivityRule extends BaseEntity {
  @Column()
  teamId: number;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column({ nullable: true })
  collectionId?: number | null;

  @ManyToOne(() => RuleCollection, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'collectionId' })
  collection?: RuleCollection | null;

  @Column({ type: 'varchar', length: 255 })
  appName: string;

  @Column({
    type: 'enum',
    enum: AppType,
  })
  appType: AppType;

  @Column({
    type: 'enum',
    enum: AppCategory,
  })
  category: AppCategory;

  @Column({
    type: 'enum',
    enum: RuleType,
    default: RuleType.APP_NAME,
  })
  ruleType: RuleType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pattern?: string; // For URL patterns, e.g., "github.com/*/issues"

  @Column({ type: 'boolean', default: false })
  isDomainRule: boolean; // Quick flag for domain-only rules
}
