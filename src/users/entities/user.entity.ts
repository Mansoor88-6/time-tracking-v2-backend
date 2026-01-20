import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Roles } from '../../common/enums/roles.enum';

@Entity()
@Index(['tenantId'])
@Index(['email', 'tenantId'], { unique: true })
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;

  /**
   * Optional user-facing display name. If not set, `name` can be used.
   * Explicit column type is required so TypeORM doesn't treat this as Object.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName?: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  avatarUrl?: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  locale?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone?: string | null;

  @Column()
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({
    type: 'enum',
    enum: Roles,
    default: Roles.EMPLOYEE,
  })
  role: Roles;

  @Column({ default: true })
  isActive: boolean;
}
