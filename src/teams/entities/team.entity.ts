import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { TeamMember } from './team-member.entity';

@Entity()
@Index(['tenantId'])
export class Team extends BaseEntity {
  @Column()
  name: string;

  @Column()
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  /**
   * Optional primary manager/lead for this team.
   */
  @Column({ nullable: true })
  managerId?: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'managerId' })
  manager?: User | null;

  @OneToMany(() => TeamMember, (member) => member.team)
  members: TeamMember[];
}

