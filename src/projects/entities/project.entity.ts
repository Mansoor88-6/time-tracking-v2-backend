import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Team } from '../../teams/entities/team.entity';

@Entity()
@Index(['tenantId'])
export class Project extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column()
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  /**
   * Optional owning team. If null, project is organization-wide.
   */
  @Column({ type: 'integer', nullable: true })
  teamId?: number | null;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'teamId' })
  team?: Team | null;
}

