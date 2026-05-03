import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Roles } from '../../common/enums/roles.enum';
import { WageCurrency } from '../../common/enums/wage-currency.enum';

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

  /**
   * Expected productive hours per working day (e.g. 7 or 8). Used with monthly wage for earnings estimates.
   */
  @Column({
    type: 'double precision',
    name: 'daily_working_hours',
    nullable: true,
  })
  dailyWorkingHours?: number | null;

  /**
   * Gross monthly salary for wage estimates (same currency as wageCurrency).
   */
  @Column({
    type: 'double precision',
    name: 'monthly_wage',
    nullable: true,
  })
  monthlyWage?: number | null;

  @Column({
    type: 'enum',
    enum: WageCurrency,
    name: 'wage_currency',
    nullable: true,
  })
  wageCurrency?: WageCurrency | null;
}
