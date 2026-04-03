import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PricingContactService } from './pricing-contact.service';
import { CreatePricingContactDto } from './dto/create-pricing-contact.dto';
import { MarkPricingContactReadDto } from './dto/mark-pricing-contact-read.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesDecorator } from '../auth/decorators/roles.decorator';
import { Roles } from '../common/enums/roles.enum';

@Controller('pricing')
export class PricingContactController {
  constructor(private readonly pricingContactService: PricingContactService) {}

  @Post('contact')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@Body() dto: CreatePricingContactDto) {
    return this.pricingContactService.create(dto);
  }

  @Get('contact-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesDecorator(Roles.SUPER_ADMIN)
  async listForAdmin() {
    return this.pricingContactService.findAllForAdmin();
  }

  @Patch('contact-requests/:id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesDecorator(Roles.SUPER_ADMIN)
  async markRead(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: MarkPricingContactReadDto,
  ) {
    const read = body.read !== false;
    return this.pricingContactService.markRead(id, read);
  }
}
