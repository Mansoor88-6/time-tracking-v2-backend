import {
  Controller,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
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
    role: string;
  };
};

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('me')
  async getMySessions(@Request() req: AuthenticatedRequest) {
    const rows = await this.sessionsService.findActiveUserSessions(req.user.id);
    return rows.map((s) => this.sessionsService.toPublicSession(s));
  }

  @Delete(':id')
  async revokeMySession(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const target = await this.sessionsService.findSessionById(id);
    if (!target) {
      throw new NotFoundException('Session not found');
    }

    if (req.user.role === Roles.SUPER_ADMIN) {
      await this.sessionsService.revokeSessionById(id);
      return { message: 'Session revoked' };
    }

    if (
      req.user.role === Roles.ORG_ADMIN &&
      req.user.tenantId != null &&
      target.tenantId === req.user.tenantId
    ) {
      await this.sessionsService.revokeSessionById(id);
      return { message: 'Session revoked' };
    }

    const mySessions = await this.sessionsService.findUserSessions(req.user.id);
    const ownsSession = mySessions.some((s) => s.id === id);
    if (!ownsSession) {
      throw new ForbiddenException('Cannot revoke session you do not own');
    }
    await this.sessionsService.revokeSessionById(id);
    return { message: 'Session revoked' };
  }

  @Get('organization')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async getOrganizationSessions(@Request() req: AuthenticatedRequest) {
    if (req.user.role === Roles.SUPER_ADMIN) {
      const rows = await this.sessionsService.findAllActiveSessions();
      return rows.map((s) => this.sessionsService.toPublicSession(s));
    }

    if (!req.user.tenantId) {
      throw new ForbiddenException('Organization context missing');
    }

    const rows = await this.sessionsService.findActiveSessionsForTenant(
      req.user.tenantId,
    );
    return rows.map((s) => this.sessionsService.toPublicSession(s));
  }
}

