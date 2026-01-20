import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseIntPipe,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesDecorator } from '../auth/decorators/roles.decorator';
import { Roles } from '../common/enums/roles.enum';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    id: number;
    tenantId: number;
    role: Roles;
  };
};

@Controller('devices')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDeviceDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.devicesService.registerOrAuthorizeDevice(
      req.user.id,
      req.user.tenantId,
      dto.deviceId,
      dto.name,
    );
  }

  @Get('me')
  async getMyDevices(@Request() req: AuthenticatedRequest) {
    return this.devicesService.listUserDevices(req.user.id, req.user.tenantId);
  }

  @Patch(':id/revoke')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.SUPER_ADMIN, Roles.EMPLOYEE)
  @UseGuards(RolesGuard)
  async revoke(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.devicesService.revokeDevice(
      id,
      req.user.id,
      req.user.tenantId,
      req.user.role,
    );
    return { message: 'Device revoked' };
  }
}

