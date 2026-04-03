import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export type PricingPlanType = 'standard' | 'enterprise';

@Entity()
export class PricingContactRequest extends BaseEntity {
  @Column({ type: 'varchar', length: 32 })
  planType: PricingPlanType;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  company: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;
}
