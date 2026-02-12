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
import { RuleCollectionTeam } from './rule-collection-team.entity';

@Entity()
@Index(['tenantId'])
export class RuleCollection extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column()
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true })
  createdBy?: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  creator?: User | null;

  @OneToMany(() => RuleCollectionTeam, (rct) => rct.collection)
  teamAssignments: RuleCollectionTeam[];
}
