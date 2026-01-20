import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Team } from './team.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
@Index(['teamId'])
@Index(['userId'])
@Unique(['teamId', 'userId'])
export class TeamMember extends BaseEntity {
  @Column()
  teamId: number;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Optional team-specific role, e.g. 'MANAGER', 'MEMBER'.
   * For now it's a simple string; can be promoted to an enum later.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  teamRole?: string | null;
}

