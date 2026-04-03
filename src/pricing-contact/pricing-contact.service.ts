import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingContactRequest } from './entities/pricing-contact-request.entity';
import { CreatePricingContactDto } from './dto/create-pricing-contact.dto';

@Injectable()
export class PricingContactService {
  constructor(
    @InjectRepository(PricingContactRequest)
    private readonly repo: Repository<PricingContactRequest>,
  ) {}

  async create(dto: CreatePricingContactDto): Promise<PricingContactRequest> {
    const row = this.repo.create({
      planType: dto.planType,
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      company: dto.company?.trim() || null,
      phone: dto.phone?.trim() || null,
      message: dto.message?.trim() || null,
      readAt: null,
    });
    return this.repo.save(row);
  }

  async findAllForAdmin(): Promise<PricingContactRequest[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async markRead(
    id: number,
    read: boolean,
  ): Promise<PricingContactRequest> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Contact request not found');
    }
    row.readAt = read ? new Date() : null;
    return this.repo.save(row);
  }
}
