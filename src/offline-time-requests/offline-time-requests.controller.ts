import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OfflineTimeRequestsService } from './offline-time-requests.service';
import { CreateOfflineTimeRequestDto } from './dto/create-offline-time-request.dto';
import { DeclineOfflineTimeRequestDto } from './dto/decline-offline-time-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesDecorator } from '../auth/decorators/roles.decorator';
import { Roles } from '../common/enums/roles.enum';
import { OfflineTimeRequestStatus } from './enums/offline-time-request-status.enum';

@Controller('api/v1/offline-time-requests')
@UseGuards(JwtAuthGuard, TenantGuard)
export class OfflineTimeRequestsController {
  constructor(private readonly service: OfflineTimeRequestsService) {}

  @Post()
  async create(
    @Body() dto: CreateOfflineTimeRequestDto,
    @Request() req: { user: { id: number; tenantId: number } },
  ) {
    const { id: userId, tenantId } = req.user;
    return this.service.create(tenantId, userId, dto);
  }

  @Get()
  async listMine(
    @Request() req: { user: { id: number; tenantId: number } },
    @Query('status') status?: OfflineTimeRequestStatus,
  ) {
    const { id: userId, tenantId } = req.user;
    return this.service.listMine(tenantId, userId, status);
  }

  @Get('pending')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async listPending(
    @Request() req: { user: { tenantId: number } },
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const parsedUserId = userId ? parseInt(userId, 10) : undefined;
    if (userId && Number.isNaN(parsedUserId)) {
      throw new BadRequestException('Invalid userId');
    }
    return this.service.listPendingForTenant(req.user.tenantId, {
      userId: parsedUserId,
      startDate,
      endDate,
    });
  }

  @Post(':id/approve')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number; tenantId: number } },
  ) {
    return this.service.approve(id, req.user.tenantId, req.user.id);
  }

  @Post(':id/decline')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async decline(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeclineOfflineTimeRequestDto,
    @Request() req: { user: { id: number; tenantId: number } },
  ) {
    return this.service.decline(
      id,
      req.user.tenantId,
      req.user.id,
      dto.reason,
    );
  }
}
