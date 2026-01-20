import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Roles } from '../../common/enums/roles.enum';

@Entity()
@Index(['tenantId'])
@Index(['email', 'tenantId'])
@Index(['token'], { unique: true })
export class Invitation extends BaseEntity {
  @Column()
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: Roles,
  })
  role: Roles;

  /**
   * Teams the invited user should join on acceptance.
   * Kept as a simple JSON number array for now to avoid premature complexity.
   */
  @Column({ type: 'jsonb', nullable: true })
  teamIds?: number[] | null;

  @Column()
  token: string;

  @Column()
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt?: Date | null;

  @Column({ type: 'integer', nullable: true })
  invitedByUserId?: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invitedByUserId' })
  invitedBy?: User | null;
}

