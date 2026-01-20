import {
  Controller,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesDecorator } from '../auth/decorators/roles.decorator';
import { Roles } from '../common/enums/roles.enum';
import { Request as ExpressRequest } from 'express';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    id: number;
    tenantId?: number;
    role: Roles;
  };
};

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('me')
  async getMySessions(@Request() req: AuthenticatedRequest) {
    return this.sessionsService.findUserSessions(req.user.id);
  }

  @Delete(':id')
  async revokeMySession(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    // For now, allow revocation if the session belongs to the current user.
    const sessions = await this.sessionsService.findUserSessions(req.user.id);
    const ownsSession = sessions.some((s) => s.id === id);
    if (!ownsSession) {
      throw new ForbiddenException('Cannot revoke session you do not own');
    }
    await this.sessionsService.revokeSessionById(id);
    return { message: 'Session revoked' };
  }

  @Get('organization')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  async getOrganizationSessions(@Request() req: AuthenticatedRequest) {
    if (!req.user.tenantId) {
      throw new ForbiddenException('Organization context missing');
    }
    return this.sessionsService.findTenantSessions(req.user.tenantId);
  }
}

