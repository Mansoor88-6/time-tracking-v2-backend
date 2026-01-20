import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesDecorator } from '../auth/decorators/roles.decorator';
import { Roles } from '../common/enums/roles.enum';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('organizations/:orgId/invitations')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @RolesDecorator(Roles.ORG_ADMIN)
  async createInvitation(
    @Param('orgId', ParseIntPipe) orgId: number,
    @Body() dto: CreateInvitationDto,
    @Request() req: any,
  ) {
    if (req.user.tenantId !== orgId) {
      throw new ForbiddenException('Organization mismatch');
    }

    return this.invitationsService.createInvitation(
      orgId,
      req.user.id,
      dto,
    );
  }

  @Public()
  @Get('invitations/:token')
  async getInvitation(@Param('token') token: string) {
    const invitation = await this.invitationsService.getInvitationByToken(
      token,
    );

    return {
      email: invitation.email,
      tenantName: invitation.tenant.name,
      role: invitation.role,
    };
  }

  @Public()
  @Post('invitations/:token/accept')
  async acceptInvitation(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto,
  ) {
    await this.invitationsService.acceptInvitation(token, dto);
    return { message: 'Invitation accepted successfully' };
  }
}

