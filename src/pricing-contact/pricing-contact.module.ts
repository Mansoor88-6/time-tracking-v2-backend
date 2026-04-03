import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingContactRequest } from './entities/pricing-contact-request.entity';
import { PricingContactService } from './pricing-contact.service';
import { PricingContactController } from './pricing-contact.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PricingContactRequest])],
  controllers: [PricingContactController],
  providers: [PricingContactService],
  exports: [PricingContactService],
})
export class PricingContactModule {}
