import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { RuleCollection } from './rule-collection.entity';
import { Team } from '../../teams/entities/team.entity';

@Entity()
@Index(['collectionId'])
@Index(['teamId'])
@Unique(['collectionId', 'teamId'])
export class RuleCollectionTeam extends BaseEntity {
  @Column()
  collectionId: number;

  @ManyToOne(() => RuleCollection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collectionId' })
  collection: RuleCollection;

  @Column()
  teamId: number;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;
}
